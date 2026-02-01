"""v5.2 생성 오케스트레이터: HTML 템플릿 기반 PDP 파이프라인"""

import asyncio
import logging
from collections import Counter
from datetime import datetime

import httpx

from app.database import get_supabase
from app.constants.themes import get_theme
from app.services.template_ai_service import (
    generate_section_texts,
    generate_section_image,
)
from app.services.section_compose_service import compose_sections
from app.services.template_render_service import render_section, bind_section_data
from app.services.storage_service import StorageService
from app.schemas.generate import GenerateResponse, RenderedSectionResponse

logger = logging.getLogger(__name__)


class GenerateOrchestrator:
    """v5.2 HTML 템플릿 기반 PDP 생성 파이프라인 오케스트레이터."""

    def __init__(self):
        self.storage = StorageService()
        self.db = get_supabase()

    async def generate(
        self,
        project_id: str,
        products: list[dict],
        theme_id: str,
    ) -> GenerateResponse:
        """HTML 템플릿 기반 PDP 생성 파이프라인을 실행한다."""
        self._update_status(project_id, "generating")

        try:
            # 1. 테마 정보 조회
            theme = get_theme(theme_id)

            # 2. 선택된 섹션 템플릿 조회
            selected_sections = self._get_selected_sections(project_id)
            section_templates = compose_sections(selected_sections)

            # 3. 상품 이미지 URL 수집 + 참조 이미지 다운로드
            product_image_urls = await self._get_product_image_urls(project_id)
            reference_image, ref_mime_type = await self._download_reference_image(product_image_urls)

            # 4. 텍스트 생성 (이미지와 병렬 불가 — rate limit)
            product_names = [p["name"] for p in products]

            # 섹션 타입별 인스턴스 수 집계 (중복 섹션 지원)
            section_counts = dict(Counter(
                st["section_type"] for st in section_templates
            ))

            section_texts = await generate_section_texts(
                product_names=product_names,
                theme_name=theme["name"],
                copy_keywords=theme["copy_keywords"],
                section_counts=section_counts,
            )

            # 5. 섹션 이미지 순차 생성 (인스턴스별 개별 이미지)
            image_size_map = {
                "hero_banner": (860, 1400),
                "description": (600, 600),
                "feature_point": (860, 957),
            }

            # 키: "타입__인스턴스인덱스" (중복) 또는 "타입" (단일)
            section_image_urls: dict[str, str] = {}
            image_instance_counter: dict[str, int] = {}
            for st in section_templates:
                sec_type = st["section_type"]
                if sec_type not in image_size_map:
                    continue
                inst_idx = image_instance_counter.get(sec_type, 0)
                image_instance_counter[sec_type] = inst_idx + 1

                is_duplicate = section_counts.get(sec_type, 1) > 1
                w, h = image_size_map[sec_type]
                filename = f"{sec_type}_{inst_idx}.png" if is_duplicate else f"{sec_type}.png"

                logger.info(f"{sec_type} 이미지 생성 시작 (인스턴스 {inst_idx})")
                image_bytes = await generate_section_image(
                    product_names=product_names,
                    section_type=sec_type,
                    width=w,
                    height=h,
                    reference_image=reference_image,
                    reference_mime_type=ref_mime_type,
                )
                path = await self.storage.upload_image(
                    file_bytes=image_bytes,
                    project_id=project_id,
                    image_type="generated",
                    filename=filename,
                )
                url = self.storage.get_public_url(path)
                if is_duplicate:
                    section_image_urls[f"{sec_type}__{inst_idx}"] = url
                else:
                    section_image_urls[sec_type] = url

            # 6. 각 섹션 데이터 바인딩 + 렌더링
            rendered_sections = []
            instance_counter: dict[str, int] = {}
            for i, st in enumerate(section_templates):
                sec_type = st["section_type"]
                inst_idx = instance_counter.get(sec_type, 0)
                instance_counter[sec_type] = inst_idx + 1

                data = bind_section_data(
                    section_template=st,
                    section_texts=section_texts,
                    theme=theme,
                    product_image_urls=product_image_urls,
                    section_image_urls=section_image_urls,
                    instance_index=inst_idx if section_counts.get(sec_type, 1) > 1 else None,
                )
                section = render_section(
                    section_template=st,
                    order=i,
                    data=data,
                )
                rendered_sections.append(section)

            # 7. DB 저장
            template_used = "html_template_v5.2"

            generated_data = {
                "section_texts": section_texts,
                "section_image_urls": section_image_urls,
                "theme": theme,
                "template_used": template_used,
                "generated_at": datetime.now().isoformat(),
            }

            self.db.table("projects").update({
                "status": "completed",
                "theme_id": theme_id,
                "template_used": template_used,
                "generated_data": generated_data,
                "rendered_sections": rendered_sections,
                "products": products,
            }).eq("id", project_id).execute()

            # 8. 응답 반환
            return GenerateResponse(
                project_id=project_id,
                template_used=template_used,
                theme=theme_id,
                rendered_sections=[
                    RenderedSectionResponse(**s) for s in rendered_sections
                ],
                generated_at=datetime.now(),
            )

        except Exception as e:
            logger.exception(f"PDP 생성 실패 (project={project_id}): {e}")
            self._update_status(project_id, "failed")
            raise

    async def _get_product_image_urls(self, project_id: str) -> list[str]:
        """프로젝트에 업로드된 상품 이미지 public URL 목록을 반환한다."""
        result = (
            self.db.table("project_images")
            .select("*")
            .eq("project_id", project_id)
            .eq("image_type", "input")
            .order("created_at")
            .execute()
        )

        urls = []
        for record in (result.data or []):
            url = self.storage.get_public_url(record["storage_path"])
            urls.append(url)

        return urls

    async def _download_reference_image(self, product_image_urls: list[str]) -> tuple[bytes, str] | tuple[None, None]:
        """첫 번째 상품 이미지를 다운로드하여 (bytes, mime_type)을 반환한다."""
        if not product_image_urls:
            return None, None
        try:
            async with httpx.AsyncClient(timeout=15.0) as http:
                resp = await http.get(product_image_urls[0])
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
                if content_type not in ("image/png", "image/jpeg", "image/webp"):
                    content_type = "image/jpeg"
                logger.info(f"참조 이미지 다운로드 완료: {len(resp.content)} bytes, {content_type}")
                return resp.content, content_type
        except Exception as e:
            logger.warning(f"참조 이미지 다운로드 실패, 텍스트 기반 생성으로 대체: {e}")
            return None, None

    def _get_selected_sections(self, project_id: str) -> list[str] | None:
        """프로젝트에 저장된 selected_sections를 반환한다."""
        result = (
            self.db.table("projects")
            .select("selected_sections")
            .eq("id", project_id)
            .single()
            .execute()
        )
        if result.data:
            return result.data.get("selected_sections")
        return None

    def _update_status(self, project_id: str, status: str) -> None:
        self.db.table("projects").update({"status": status}).eq("id", project_id).execute()
