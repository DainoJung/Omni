import asyncio
import json
import base64
import logging
from typing import Optional

from google import genai
from google.genai import types

from app.config import settings
from app.prompts.section_prompts import (
    PAGE_STRUCTURE_PLANNING_PROMPT,
    SECTION_PROMPTS,
    SECTION_METADATA,
)
from app.prompts.text_analysis import TEXT_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)


class LayoutPipelineService:
    """멀티 섹션 레이아웃 파이프라인: 페이지 기획 → 섹션별 이미지 생성 → 텍스트 영역 추출."""

    MAX_RETRIES = 1

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_text = settings.GEMINI_MODEL
        self.model_image = settings.IMAGE_GEN_MODEL
        self.model_vision = settings.VISION_MODEL

    async def plan_page_structure(
        self,
        products: list[dict],
        brand_name: Optional[str] = None,
        category: Optional[str] = None,
    ) -> list[dict]:
        """AI에게 페이지 구조를 기획하게 한다. 반환: List[SectionPlan dict]."""
        products_summary = "\n".join(
            f"  [{i}] {p['name']} ({p['price']})"
            + (f" - {p['description']}" if p.get("description") else "")
            for i, p in enumerate(products)
        )

        prompt = PAGE_STRUCTURE_PLANNING_PROMPT.format(
            product_count=len(products),
            brand_name=brand_name or "Premium Brand",
            category=category or "General",
            products_summary=products_summary,
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_text,
                contents=[types.Part.from_text(text=prompt)],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )

            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
                raw_text = raw_text.strip()

            result = json.loads(raw_text)
            sections = result.get("sections", [])
            logger.info(f"페이지 구조 기획 완료: {len(sections)}개 섹션")
            return sections

        except Exception as e:
            logger.warning(f"페이지 구조 기획 실패, 기본 구조 사용: {e}")
            return self._default_page_structure(len(products))

    def _default_page_structure(self, product_count: int) -> list[dict]:
        """기획 실패 시 기본 페이지 구조를 반환한다."""
        sections = [
            {
                "section_key": "hero_banner",
                "title": "메인 비주얼",
                "description": "브랜드와 대표 상품을 보여주는 히어로 배너",
                "product_indices": [0],
                "order": 0,
                "has_text_overlay": True,
                "typography_mood": "luxury-serif",
            },
        ]

        if product_count == 1:
            sections.append({
                "section_key": "single_feature",
                "title": "상품 피처",
                "description": "상품을 집중 조명하는 피처 섹션",
                "product_indices": [0],
                "order": 1,
                "has_text_overlay": True,
                "typography_mood": "modern-sans",
            })
        elif product_count <= 3:
            sections.append({
                "section_key": "product_grid",
                "title": "상품 그리드",
                "description": "전체 상품을 보여주는 그리드 레이아웃",
                "product_indices": list(range(product_count)),
                "order": 1,
                "has_text_overlay": False,
                "typography_mood": None,
            })
        else:
            sections.append({
                "section_key": "product_grid",
                "title": "상품 그리드",
                "description": "주요 상품을 보여주는 그리드 레이아웃",
                "product_indices": list(range(min(3, product_count))),
                "order": 1,
                "has_text_overlay": False,
                "typography_mood": None,
            })
            sections.append({
                "section_key": "detail_info",
                "title": "상세 정보",
                "description": "대표 상품의 상세 정보",
                "product_indices": [0],
                "order": 2,
                "has_text_overlay": True,
                "typography_mood": "classic-korean",
            })

        sections.append({
            "section_key": "cta_footer",
            "title": "구매 유도",
            "description": "구매를 유도하는 CTA 푸터",
            "product_indices": [],
            "order": len(sections),
            "has_text_overlay": True,
            "typography_mood": "impact-display",
        })

        return sections

    async def generate_layout_image(
        self,
        section_key: str,
        products: list[dict],
        product_image_bytes_list: list[bytes],
        brand_name: Optional[str] = None,
        section_context: str = "",
    ) -> bytes:
        """섹션 프롬프트 + 상품 이미지로 레이아웃 이미지를 생성한다."""
        prompt_template = SECTION_PROMPTS[section_key]

        product_info_parts = []
        for i, prod in enumerate(products):
            info = f"Product {i + 1}: {prod['name']} (Price: {prod['price']})"
            if prod.get("description"):
                info += f" - {prod['description']}"
            product_info_parts.append(info)
        product_info = "\n".join(product_info_parts)

        prompt_text = prompt_template.format(
            product_info=product_info,
            brand_name=brand_name or "Premium Brand",
            section_context=section_context,
        )

        contents = []
        for i, img_bytes in enumerate(product_image_bytes_list):
            contents.append(
                types.Part.from_bytes(data=img_bytes, mime_type="image/png")
            )
            contents.append(
                types.Part.from_text(text=f"(This is product image {i + 1})")
            )
        contents.append(types.Part.from_text(text=prompt_text))

        for attempt in range(self.MAX_RETRIES + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model_image,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE", "TEXT"],
                    ),
                )

                for part in response.candidates[0].content.parts:
                    if part.inline_data is not None:
                        image_data = part.inline_data.data
                        if isinstance(image_data, str):
                            image_data = base64.b64decode(image_data)
                        logger.info(
                            f"레이아웃 이미지 생성 성공 ({section_key}): {len(image_data)} bytes"
                        )
                        return image_data

                raise RuntimeError("응답에 이미지가 포함되지 않았습니다.")

            except Exception as e:
                logger.warning(f"레이아웃 이미지 생성 시도 {attempt + 1} 실패 ({section_key}): {e}")
                if attempt < self.MAX_RETRIES:
                    continue
                raise RuntimeError(f"LAYOUT_IMAGE_GENERATION_FAILED ({section_key}): {e}")

    async def extract_text_positions(
        self,
        layout_image_bytes: bytes,
        section_key: str = "unknown",
        section_description: str = "",
        products: list[dict] | None = None,
        brand_name: str | None = None,
        typography_mood: str = "classic-korean",
    ) -> dict:
        """Vision 모델로 레이아웃 이미지에서 텍스트 배치 가능 영역을 추출한다."""
        products_info = "No product information available."
        if products:
            info_lines = []
            for i, p in enumerate(products):
                raw_price = p.get("price", "")
                # 가격 포맷팅: 숫자만 있으면 ₩ 포맷 적용
                formatted_price = raw_price
                price_digits = "".join(c for c in raw_price if c.isdigit())
                if price_digits:
                    formatted_price = f"₩{int(price_digits):,}"
                line = f"  [{i}] {p['name']} (Price: {formatted_price})"
                if p.get("description"):
                    line += f" - {p['description']}"
                info_lines.append(line)
            products_info = "\n".join(info_lines)

        prompt = TEXT_ANALYSIS_PROMPT.format(
            section_key=section_key,
            section_description=section_description or section_key,
            products_info=products_info,
            brand_name=brand_name or "Premium Brand",
            typography_mood=typography_mood,
        )

        contents = [
            types.Part.from_bytes(data=layout_image_bytes, mime_type="image/png"),
            types.Part.from_text(text=prompt),
        ]

        for attempt in range(self.MAX_RETRIES + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model_vision,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    ),
                )

                raw_text = response.text.strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                    raw_text = raw_text.strip()

                result = json.loads(raw_text)
                logger.info(
                    f"텍스트 영역 추출 완료 ({section_key}): {result.get('total_areas_found', 0)}개"
                )
                return result

            except Exception as e:
                logger.warning(f"텍스트 영역 추출 시도 {attempt + 1} 실패 ({section_key}): {e}")
                if attempt < self.MAX_RETRIES:
                    continue
                logger.error(f"텍스트 영역 추출 실패 ({section_key}), 기본 영역 반환")
                return self._default_text_areas()

    def _default_text_areas(self) -> dict:
        """추출 실패 시 기본 텍스트 영역을 반환한다."""
        return {
            "text_areas": [
                {
                    "id": "area_1",
                    "position": 1,
                    "bounds": {"x": 10.0, "y": 5.0, "width": 80.0, "height": 10.0},
                    "background_brightness": "light",
                    "recommended_font_color": "#1a1a1a",
                    "max_font_size": 42,
                    "suitable_for": "headline",
                },
                {
                    "id": "area_2",
                    "position": 2,
                    "bounds": {"x": 10.0, "y": 80.0, "width": 80.0, "height": 8.0},
                    "background_brightness": "light",
                    "recommended_font_color": "#333333",
                    "max_font_size": 24,
                    "suitable_for": "subtext",
                },
                {
                    "id": "area_3",
                    "position": 3,
                    "bounds": {"x": 10.0, "y": 90.0, "width": 40.0, "height": 5.0},
                    "background_brightness": "light",
                    "recommended_font_color": "#666666",
                    "max_font_size": 18,
                    "suitable_for": "label",
                },
            ],
            "total_areas_found": 3,
            "image_dominant_color": "#f5f0eb",
        }

    async def run_pipeline(
        self,
        products: list[dict],
        product_image_bytes_list: list[bytes],
        brand_name: Optional[str] = None,
        category: Optional[str] = None,
    ) -> dict:
        """전체 파이프라인: 페이지 기획 → 섹션별 이미지 생성 → 텍스트 영역 추출."""
        # 1. 페이지 구조 기획
        page_plan = await self.plan_page_structure(products, brand_name, category)
        logger.info(f"페이지 구조 기획 완료: {len(page_plan)}개 섹션")

        # 2. 모든 섹션을 병렬로 이미지 생성 + 텍스트 영역 추출
        async def _process_section(plan: dict) -> dict:
            section_key = plan["section_key"]
            metadata = SECTION_METADATA.get(section_key, {})
            aspect_ratio = metadata.get("aspect_ratio", "3:4")

            section_product_indices = plan.get("product_indices", [])
            section_products = [
                products[i] for i in section_product_indices if i < len(products)
            ]
            section_images = [
                product_image_bytes_list[i]
                for i in section_product_indices
                if i < len(product_image_bytes_list)
            ]

            if not section_products:
                section_products = products
            if not section_images:
                section_images = product_image_bytes_list

            section_context = plan.get("description", "")

            logger.info(
                f"섹션 생성 시작: {section_key} (상품 {len(section_products)}개)"
            )

            layout_image_bytes = await self.generate_layout_image(
                section_key=section_key,
                products=section_products,
                product_image_bytes_list=section_images,
                brand_name=brand_name,
                section_context=section_context,
            )

            # 기획 단계에서 텍스트 없음으로 결정된 섹션은 텍스트 추출 건너뜀
            has_text = plan.get("has_text_overlay", True)
            text_areas = []
            if has_text:
                typography_mood = plan.get("typography_mood") or "classic-korean"
                text_positions = await self.extract_text_positions(
                    layout_image_bytes=layout_image_bytes,
                    section_key=section_key,
                    section_description=section_context,
                    products=section_products,
                    brand_name=brand_name,
                    typography_mood=typography_mood,
                )
                text_areas = text_positions.get("text_areas", [])
            else:
                logger.info(f"섹션 {section_key}: 텍스트 오버레이 없음 (기획 결정)")

            logger.info(f"섹션 생성 완료: {section_key}")
            return {
                "section_key": section_key,
                "order": plan["order"],
                "layout_image_bytes": layout_image_bytes,
                "text_areas": text_areas,
                "aspect_ratio": aspect_ratio,
            }

        sorted_plans = sorted(page_plan, key=lambda s: s["order"])
        section_results = await asyncio.gather(
            *[_process_section(plan) for plan in sorted_plans]
        )
        # gather 결과를 order 순으로 정렬
        section_results = sorted(section_results, key=lambda s: s["order"])

        return {
            "page_plan": page_plan,
            "sections": list(section_results),
            "products": products,
        }
