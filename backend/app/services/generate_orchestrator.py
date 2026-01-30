import asyncio
import logging
from datetime import datetime

import httpx

from app.database import get_supabase
from app.services.layout_pipeline_service import LayoutPipelineService
from app.services.storage_service import StorageService
from app.schemas.generate import (
    LayoutGenerateResponse,
    SectionPlan,
    SectionResult,
    TextArea,
    TextAreaBounds,
    ProductInput,
)

logger = logging.getLogger(__name__)


class GenerateOrchestrator:
    """v5.0 멀티 섹션 레이아웃 파이프라인 오케스트레이터."""

    def __init__(self):
        self.pipeline = LayoutPipelineService()
        self.storage = StorageService()
        self.db = get_supabase()

    async def generate_layout(
        self,
        project_id: str,
        products: list[dict],
        brand_name: str | None = None,
        category: str | None = None,
    ) -> LayoutGenerateResponse:
        # 프로젝트 조회
        project = self._get_project(project_id)
        effective_brand = brand_name or project.get("brand_name", "")

        self._update_status(project_id, "generating")

        try:
            # 업로드된 상품 이미지 다운로드
            product_image_bytes_list = await self._download_product_images(project_id)

            # 멀티 섹션 파이프라인 실행
            result = await self.pipeline.run_pipeline(
                products=products,
                product_image_bytes_list=product_image_bytes_list,
                brand_name=effective_brand,
                category=category or project.get("category"),
            )

            # 각 섹션 이미지를 병렬로 Storage 업로드
            async def _upload_section(section: dict) -> tuple[SectionResult, dict]:
                section_key = section["section_key"]
                order = section["order"]

                layout_path = await self.storage.upload_image(
                    file_bytes=section["layout_image_bytes"],
                    project_id=project_id,
                    image_type="generated",
                    filename=f"section_{order}_{section_key}.png",
                )
                layout_image_url = self.storage.get_public_url(layout_path)

                text_areas = [
                    TextArea(
                        id=ta["id"],
                        position=ta["position"],
                        bounds=TextAreaBounds(**ta["bounds"]),
                        background_brightness=ta.get("background_brightness"),
                        recommended_font_color=ta.get("recommended_font_color", "#000000"),
                        max_font_size=ta.get("max_font_size"),
                        suitable_for=ta["suitable_for"],
                        font_family=ta.get("font_family"),
                    )
                    for ta in section["text_areas"]
                ]

                sr = SectionResult(
                    section_key=section_key,
                    order=order,
                    layout_image_url=layout_image_url,
                    text_areas=text_areas,
                    aspect_ratio=section.get("aspect_ratio", "3:4"),
                )

                db_dict = {
                    "section_key": section_key,
                    "order": order,
                    "layout_image_url": layout_image_url,
                    "text_areas": [ta.model_dump() for ta in text_areas],
                    "aspect_ratio": section.get("aspect_ratio", "3:4"),
                }

                return sr, db_dict

            upload_results = await asyncio.gather(
                *[_upload_section(s) for s in result["sections"]]
            )
            section_results = [r[0] for r in upload_results]
            sections_for_db = [r[1] for r in upload_results]

            # page_plan 구성
            page_plan = [
                SectionPlan(**plan) for plan in result["page_plan"]
            ]

            # pipeline_result DB 저장
            pipeline_result = {
                "sections": sections_for_db,
                "page_plan": [p.model_dump() for p in page_plan],
                "generated_at": datetime.now().isoformat(),
            }

            self.db.table("projects").update(
                {
                    "pipeline_result": pipeline_result,
                    "status": "completed",
                }
            ).eq("id", project_id).execute()

            product_inputs = [ProductInput(**p) for p in products]

            return LayoutGenerateResponse(
                project_id=project_id,
                sections=section_results,
                page_plan=page_plan,
                products=product_inputs,
                generated_at=datetime.now(),
            )

        except Exception:
            self._update_status(project_id, "failed")
            raise

    async def _download_product_images(self, project_id: str) -> list[bytes]:
        """프로젝트에 업로드된 상품 이미지를 다운로드한다."""
        result = (
            self.db.table("project_images")
            .select("*")
            .eq("project_id", project_id)
            .eq("image_type", "input")
            .execute()
        )

        async def _download_one(record: dict) -> bytes | None:
            try:
                public_url = self.storage.get_public_url(record["storage_path"])
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.get(public_url)
                    response.raise_for_status()
                    return response.content
            except Exception as e:
                logger.warning(f"상품 이미지 다운로드 실패: {e}")
                return None

        results = await asyncio.gather(
            *[_download_one(r) for r in (result.data or [])]
        )
        return [b for b in results if b is not None]

    def _get_project(self, project_id: str) -> dict:
        result = self.db.table("projects").select("*").eq("id", project_id).single().execute()
        return result.data

    def _update_status(self, project_id: str, status: str) -> None:
        self.db.table("projects").update({"status": status}).eq("id", project_id).execute()
