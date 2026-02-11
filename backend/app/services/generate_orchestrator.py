"""v5.2 생성 오케스트레이터: HTML 템플릿 기반 POP 파이프라인"""

import asyncio
import logging
import re
from collections import Counter
from datetime import datetime

import httpx

from app.database import get_supabase
from app.services.bg_remove_service import remove_background
from app.constants.page_types import get_page_type, resolve_sections
from app.services.template_ai_service import (
    generate_section_texts,
    generate_section_image,
)
from app.services.section_compose_service import compose_sections
from app.services.template_render_service import render_section, bind_section_data
from app.services.storage_service import StorageService
from app.schemas.generate import GenerateResponse, RenderedSectionResponse

logger = logging.getLogger(__name__)

# product_name_0, product_image_2 등 → (base_id, index) 추출
_INDEXED_PH_RE = re.compile(r"^(.+)_(\d+)$")

# 섹션 타입별 텍스트 키 (이미지 프롬프트에 컨텍스트로 전달할 키 목록)
_SECTION_TEXT_KEY_MAP: dict[str, list[str]] = {
    "hero_banner": ["category", "title", "subtitle"],
    "description": ["desc_title_main", "desc_title_accent", "desc_body"],
    "feature_point": ["point_label", "point_title_main", "point_title_accent", "point_body"],
    "promo_hero": ["script_title", "category_title", "subtitle", "location"],
    "fit_hero": ["event_title", "event_period", "event_subtitle", "event_desc", "event_hashtags"],
    "fit_event_info": ["info_period", "event_subtitle"],
    "vip_special_hero": ["vip_badge", "event_title", "event_subtitle", "benefit_text", "event_period"],
    "vip_private_hero": ["private_label", "event_title", "event_desc", "cta_text"],
    "gourmet_hero": ["hero_title", "hero_subtitle", "restaurant_heading", "hero_desc"],
    "gourmet_restaurant": ["travel_tag", "travel_desc", "restaurant_floor", "restaurant_desc", "menu1_name", "menu1_desc", "menu2_name", "menu2_desc", "event1", "event2"],
    "gourmet_wine_intro": ["wine_desc", "wine_heading"],
    "gourmet_wine": ["wine_note"],
    "shinsegae_hero": ["event_title", "benefit_1", "benefit_2", "benefit_3", "event_period"],
}


def _get_section_text_keys(section_type: str) -> list[str]:
    return _SECTION_TEXT_KEY_MAP.get(section_type, [])


class GenerateOrchestrator:
    """v5.2 HTML 템플릿 기반 POP 생성 파이프라인 오케스트레이터."""

    def __init__(self):
        self.storage = StorageService()
        self.db = get_supabase()

    async def generate(
        self,
        project_id: str,
        products: list[dict],
        page_type_id: str,
    ) -> GenerateResponse:
        """HTML 템플릿 기반 POP 생성 파이프라인을 실행한다."""

        try:
            # 1. 페이지 타입 정보 조회 → 테마 호환 dict 생성
            page_type = get_page_type(page_type_id)
            theme = {
                "id": page_type["id"],
                "name": page_type["name"],
                "icon": page_type["icon"],
                "accent_color": page_type["accent_color"],
                "catalog_bg_color": page_type["catalog_bg_color"],
                "background_prompt": page_type["background_prompt"],
                "copy_keywords": page_type["copy_keywords"],
            }

            # 2. 페이지 타입 + 상품 수 기반 섹션 자동 결정
            stored_sections = None
            if page_type_id == "custom":
                proj = self.db.table("projects").select("selected_sections").eq("id", project_id).single().execute()
                stored_sections = (proj.data or {}).get("selected_sections")
            selected_sections = resolve_sections(page_type_id, len(products), stored_sections)
            logger.info(f"페이지 타입 '{page_type['name']}' → 섹션: {selected_sections}")
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
                "description": (860, 860),
                "feature_point": (860, 957),
                "promo_hero": (860, 645),
                "fit_hero": (860, 625),
                "fit_event_info": (860, 1220),
                "fit_product_trio": (860, 1133),
                "vip_special_hero": (860, 500),
                "vip_private_hero": (860, 480),
                "gourmet_restaurant": (860, 480),
                "gourmet_wine": (860, 860),
                "shinsegae_hero": (860, 500),
            }

            # 브랜드명 추출 (브랜드 기획전용: 모든 상품이 동일 브랜드)
            brand_name = products[0].get("brand_name", "") if products else ""

            # 키: "타입__인스턴스인덱스" (중복) 또는 "타입" (단일)
            section_image_urls: dict[str, str] = {}
            image_prompts: dict[str, str] = {}
            image_instance_counter: dict[str, int] = {}
            for st in section_templates:
                sec_type = st["section_type"]
                if sec_type not in image_size_map:
                    continue
                inst_idx = image_instance_counter.get(sec_type, 0)
                image_instance_counter[sec_type] = inst_idx + 1

                is_duplicate = section_counts.get(sec_type, 1) > 1
                w, h = image_size_map[sec_type]

                # fit_product_trio: 상품별 개별 모델 이미지 3장 생성
                if sec_type == "fit_product_trio":
                    for slot in range(3):
                        p_idx = inst_idx * 3 + slot
                        if p_idx >= len(product_names):
                            continue
                        slot_name = [product_names[p_idx]]
                        slot_filename = f"{sec_type}_{inst_idx}_p{slot}.png"
                        logger.info(f"{sec_type} 상품별 모델 이미지 생성 (인스턴스 {inst_idx}, 슬롯 {slot}, 상품: {slot_name[0]})")
                        img_bytes, p_used = await generate_section_image(
                            product_names=slot_name,
                            section_type=sec_type,
                            width=w,
                            height=h,
                            reference_image=reference_image,
                            reference_mime_type=ref_mime_type,
                            section_texts={},
                            theme=theme,
                            brand_name=brand_name if page_type_id == "brand_promotion" else None,
                        )
                        path = await self.storage.upload_image(
                            file_bytes=img_bytes,
                            project_id=project_id,
                            image_type="generated",
                            filename=slot_filename,
                        )
                        url = self.storage.get_public_url(path)
                        slot_key = f"{sec_type}__{inst_idx}__p{slot}"
                        section_image_urls[slot_key] = url
                        image_prompts[slot_key] = p_used
                    continue

                # gourmet_restaurant: 레스토랑별 장면 이미지 생성
                if sec_type == "gourmet_restaurant":
                    p_name = [product_names[inst_idx]] if inst_idx < len(product_names) else product_names
                    gr_filename = f"{sec_type}_{inst_idx}.png"
                    logger.info(f"{sec_type} 레스토랑 장면 이미지 생성 (인스턴스 {inst_idx}, 레스토랑: {p_name[0]})")

                    gr_texts: dict[str, str] = {}
                    for tk in _get_section_text_keys(sec_type):
                        suffixed = f"{tk}__{inst_idx}" if is_duplicate else tk
                        if suffixed in section_texts:
                            gr_texts[tk] = section_texts[suffixed]

                    img_bytes, p_used = await generate_section_image(
                        product_names=p_name,
                        section_type=sec_type,
                        width=w,
                        height=h,
                        section_texts=gr_texts,
                        theme=theme,
                    )
                    path = await self.storage.upload_image(
                        file_bytes=img_bytes,
                        project_id=project_id,
                        image_type="generated",
                        filename=gr_filename,
                    )
                    url = self.storage.get_public_url(path)
                    key = f"{sec_type}__{inst_idx}" if is_duplicate else sec_type
                    section_image_urls[key] = url
                    image_prompts[key] = p_used
                    continue

                # gourmet_wine: 와인별 보틀 이미지 생성 (상품 인덱스 +3 오프셋)
                if sec_type == "gourmet_wine":
                    wine_offset = 3
                    wine_idx = inst_idx + wine_offset
                    p_name = [product_names[wine_idx]] if wine_idx < len(product_names) else product_names[-1:]
                    gw_filename = f"{sec_type}_{inst_idx}.png"
                    logger.info(f"{sec_type} 와인 보틀 이미지 생성 (인스턴스 {inst_idx}, 와인: {p_name[0]})")

                    gw_texts: dict[str, str] = {}
                    for tk in _get_section_text_keys(sec_type):
                        suffixed = f"{tk}__{inst_idx}" if is_duplicate else tk
                        if suffixed in section_texts:
                            gw_texts[tk] = section_texts[suffixed]

                    img_bytes, p_used = await generate_section_image(
                        product_names=p_name,
                        section_type=sec_type,
                        width=w,
                        height=h,
                        section_texts=gw_texts,
                        theme=theme,
                    )
                    path = await self.storage.upload_image(
                        file_bytes=img_bytes,
                        project_id=project_id,
                        image_type="generated",
                        filename=gw_filename,
                    )
                    url = self.storage.get_public_url(path)
                    key = f"{sec_type}__{inst_idx}" if is_duplicate else sec_type
                    section_image_urls[key] = url
                    image_prompts[key] = p_used
                    continue

                filename = f"{sec_type}_{inst_idx}.png" if is_duplicate else f"{sec_type}.png"

                # 해당 섹션 인스턴스의 텍스트 추출
                relevant_texts: dict[str, str] = {}
                text_keys = _get_section_text_keys(sec_type)
                for tk in text_keys:
                    suffixed = f"{tk}__{inst_idx}" if is_duplicate else tk
                    if suffixed in section_texts:
                        relevant_texts[tk] = section_texts[suffixed]
                    elif tk in section_texts:
                        relevant_texts[tk] = section_texts[tk]

                logger.info(f"{sec_type} 이미지 생성 시작 (인스턴스 {inst_idx})")
                image_bytes, prompt_used = await generate_section_image(
                    product_names=product_names,
                    section_type=sec_type,
                    width=w,
                    height=h,
                    reference_image=reference_image,
                    reference_mime_type=ref_mime_type,
                    section_texts=relevant_texts,
                    theme=theme,
                    brand_name=brand_name if page_type_id == "brand_promotion" else None,
                )
                path = await self.storage.upload_image(
                    file_bytes=image_bytes,
                    project_id=project_id,
                    image_type="generated",
                    filename=filename,
                )
                url = self.storage.get_public_url(path)
                key = f"{sec_type}__{inst_idx}" if is_duplicate else sec_type
                section_image_urls[key] = url
                image_prompts[key] = prompt_used

            # 5.5. 배경 제거 전처리 (bg_remove: true인 placeholder만)
            product_bg_removed_urls = await self._preprocess_bg_removal(
                section_templates=section_templates,
                product_image_urls=product_image_urls,
                project_id=project_id,
            )

            # 6. 각 섹션 데이터 바인딩 + 렌더링
            rendered_sections = []
            instance_counter: dict[str, int] = {}
            for i, st in enumerate(section_templates):
                sec_type = st["section_type"]
                inst_idx = instance_counter.get(sec_type, 0)
                instance_counter[sec_type] = inst_idx + 1

                passed_instance_index = inst_idx if section_counts.get(sec_type, 1) > 1 else None
                logger.info(f"[섹션 바인딩] {sec_type} inst_idx={inst_idx}, section_counts={section_counts.get(sec_type)}, passed_instance_index={passed_instance_index}, products_count={len(products)}, images_count={len(product_image_urls)}")

                data = bind_section_data(
                    section_template=st,
                    section_texts=section_texts,
                    theme=theme,
                    product_image_urls=product_image_urls,
                    products=products,
                    section_image_urls=section_image_urls,
                    instance_index=passed_instance_index,
                    product_bg_removed_urls=product_bg_removed_urls,
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
                "image_prompts": image_prompts,
                "theme": theme,
                "template_used": template_used,
                "generated_at": datetime.now().isoformat(),
            }

            self.db.table("projects").update({
                "theme_id": page_type_id,
                "template_used": template_used,
                "generated_data": generated_data,
                "rendered_sections": rendered_sections,
                "products": products,
            }).eq("id", project_id).execute()

            # 8. 응답 반환
            return GenerateResponse(
                project_id=project_id,
                template_used=template_used,
                page_type=page_type_id,
                rendered_sections=[
                    RenderedSectionResponse(**s) for s in rendered_sections
                ],
                generated_at=datetime.now(),
            )

        except Exception as e:
            logger.exception(f"POP 생성 실패 (project={project_id}): {e}")
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

    async def _preprocess_bg_removal(
        self,
        section_templates: list[dict],
        product_image_urls: list[str],
        project_id: str,
    ) -> dict[int, str]:
        """bg_remove: true인 placeholder의 상품 이미지 인덱스를 수집하여 배경 제거 후 URL 반환.

        Returns:
            {이미지 인덱스: 배경 제거된 이미지 URL} 딕셔너리
        """
        # 모든 섹션의 placeholder를 스캔하여 bg_remove가 필요한 상품 이미지 인덱스 수집
        # 중복 섹션(fit_product_trio 등)의 인스턴스별 오프셋 적용
        bg_remove_indices: set[int] = set()
        section_instance_counter: dict[str, int] = {}

        for st in section_templates:
            sec_type = st.get("section_type", "")
            instance_idx = section_instance_counter.get(sec_type, 0)
            section_instance_counter[sec_type] = instance_idx + 1

            for ph in st.get("placeholders", []):
                if (
                    ph.get("source") == "product"
                    and ph.get("type") == "image"
                    and ph.get("bg_remove") is True
                ):
                    m = _INDEXED_PH_RE.match(ph["id"])
                    if m:
                        base_idx = int(m.group(2))
                        # fit_product_trio 등 중복 섹션의 인스턴스별 오프셋 적용
                        if sec_type == "fit_product_trio":
                            final_idx = base_idx + (instance_idx * 3)
                        else:
                            final_idx = base_idx
                        bg_remove_indices.add(final_idx)
                    else:
                        bg_remove_indices.add(instance_idx)

        if not bg_remove_indices:
            return {}

        logger.info(f"배경 제거 대상 상품 이미지 인덱스: {sorted(bg_remove_indices)}")

        result: dict[int, str] = {}
        for idx in sorted(bg_remove_indices):
            if idx >= len(product_image_urls):
                continue
            try:
                # 원본 이미지 다운로드
                async with httpx.AsyncClient(timeout=15.0) as http:
                    resp = await http.get(product_image_urls[idx])
                    resp.raise_for_status()
                    original_bytes = resp.content

                # 배경 제거
                removed_bytes = await remove_background(original_bytes)

                # Supabase에 업로드
                filename = f"product_{idx}_bg_removed.png"
                path = await self.storage.upload_image(
                    file_bytes=removed_bytes,
                    project_id=project_id,
                    image_type="bg_removed",
                    filename=filename,
                )
                result[idx] = self.storage.get_public_url(path)
                logger.info(f"배경 제거 완료: product[{idx}]")
            except Exception as e:
                logger.warning(f"배경 제거 실패 (product[{idx}]), 원본 사용: {e}")

        return result
