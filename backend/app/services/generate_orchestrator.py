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
    validate_bg_color,
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
    "feature_point": ["point_body"],
    "promo_hero": ["script_title", "category_title", "subtitle", "location"],
    "fit_hero": ["event_title", "event_period", "event_subtitle", "event_desc", "event_hashtags"],
    "fit_event_info": ["info_period", "event_subtitle"],
    "vip_special_hero": ["vip_badge", "event_title", "event_subtitle", "benefit_text", "event_period"],
    "vip_private_hero": ["private_label", "event_title", "event_desc", "cta_text"],
    "gourmet_hero": ["hero_title", "hero_subtitle", "restaurant_heading", "hero_desc"],
    "gourmet_restaurant": ["travel_tag", "travel_desc", "restaurant_floor", "restaurant_desc", "food1_desc", "food2_desc", "event1", "event2"],
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
        background_config: dict | None = None,
        restaurants: list[dict] | None = None,
        include_wine: bool = False,
        wines: list[dict] | None = None,
        concept: str | None = None,
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

            # 1.5. 배경 설정 처리
            if background_config:
                if background_config.get("mode") == "solid":
                    theme["background_color"] = background_config.get("hex_color", "#FFFFFF")
                # AI 배경은 이미지 생성 단계에서 처리

            # 2. 페이지 타입 + 상품 수 기반 섹션 자동 결정
            stored_sections = None
            if page_type_id == "custom":
                proj = self.db.table("projects").select("selected_sections").eq("id", project_id).single().execute()
                stored_sections = (proj.data or {}).get("selected_sections")

            # 고메트립: 레스토랑 수 기반 섹션 결정
            restaurant_count = len(restaurants) if restaurants else 0
            wine_count = len(wines) if wines else 0

            selected_sections = resolve_sections(
                page_type_id,
                len(products),
                stored_sections,
                restaurant_count=restaurant_count,
                include_wine=include_wine,
                wine_count=wine_count,
            )
            logger.info(f"페이지 타입 '{page_type['name']}' → 섹션: {selected_sections}")
            section_templates = compose_sections(selected_sections)

            # 3. 상품 이미지 URL 수집 + 참조 이미지 다운로드
            product_image_urls = await self._get_product_image_urls(project_id)

            # 섹션별 참조 이미지 매핑 (product_detail: hero→1번째, description→2번째)
            section_ref_map: dict[str, tuple[bytes, str] | tuple[None, None]] = {}
            if page_type_id == "product_detail":
                default_ref = await self._download_reference_image(product_image_urls, 0)
                if len(product_image_urls) > 1:
                    section_ref_map["description"] = await self._download_reference_image(product_image_urls, 1)
            else:
                default_ref = await self._download_reference_image(product_image_urls, 0)

            # 4. 텍스트 생성 (이미지와 병렬 불가 — rate limit)
            # 고메트립: 레스토랑 이름을 product_names로 사용
            if page_type_id == "gourmet" and restaurants:
                product_names = [r["name"] for r in restaurants]
                if include_wine and wines:
                    product_names += [w["name"] for w in wines]
            else:
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
                concept=concept,
            )

            # AI가 생성한 bg_color 추출 및 테마 반영
            ai_bg_color = section_texts.pop("bg_color", None)
            validated_bg_color = validate_bg_color(ai_bg_color, theme["catalog_bg_color"])
            theme["catalog_bg_color"] = validated_bg_color
            logger.info(f"AI bg_color: {ai_bg_color} → validated: {validated_bg_color}")

            # 5. 섹션 이미지 병렬 생성 (세마포어로 동시 실행 제한)
            # AI 이미지 생성은 배경/분위기 섹션만 (상품 이미지는 사용자 업로드 직접 사용)
            image_size_map = {
                "hero_banner": (860, 1400),
                "description": (860, 860),
                "promo_hero": (860, 645),
                "fit_hero": (860, 625),
                "fit_event_info": (860, 1220),
                "vip_special_hero": (860, 500),
                "vip_private_hero": (860, 480),
                "gourmet_hero": (860, 780),
                "gourmet_restaurant": (860, 480),
                "shinsegae_hero": (860, 500),
            }

            # 브랜드명 추출 (브랜드 기획전용: 모든 상품이 동일 브랜드)
            brand_name = products[0].get("brand_name", "") if products else ""

            # 이미지 생성 작업 목록 준비
            image_tasks: list[dict] = []
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

                # 해당 섹션 인스턴스의 텍스트 추출
                relevant_texts: dict[str, str] = {}
                text_keys = _get_section_text_keys(sec_type)
                for tk in text_keys:
                    suffixed = f"{tk}__{inst_idx}" if is_duplicate else tk
                    if suffixed in section_texts:
                        relevant_texts[tk] = section_texts[suffixed]
                    elif tk in section_texts:
                        relevant_texts[tk] = section_texts[tk]

                # 섹션별 참조 이미지 선택
                # promo_hero: 콘셉트 이미지만 생성하므로 참조 이미지(상품) 제외
                if sec_type == "promo_hero":
                    ref_img, ref_mime = None, None
                else:
                    ref_pair = section_ref_map.get(sec_type, default_ref)
                    ref_img, ref_mime = ref_pair if ref_pair else (None, None)

                # gourmet_restaurant: 해당 인스턴스의 레스토랑명 + 음식명을 구조화하여 전달
                if sec_type == "gourmet_restaurant" and restaurants and inst_idx < len(restaurants):
                    r = restaurants[inst_idx]
                    food_names = []
                    for fk in ("food1", "food2"):
                        fname = r.get(fk, {}).get("name", "")
                        if fname:
                            food_names.append(fname)
                    formatted = f"레스토랑명: {r['name']}, 음식명: {', '.join(food_names)}"
                    task_product_names = [formatted]
                elif sec_type == "hero_banner":
                    # hero_banner: 1번째 상품만 전달 (참조 이미지 index 0과 일치)
                    task_product_names = [product_names[0]] if product_names else product_names
                elif sec_type == "description":
                    # description 섹션: 참조 이미지에 해당하는 상품만 전달
                    # product_detail: 2번째 상품(index 1), 그 외: 1번째 상품(index 0)
                    desc_idx = 1 if page_type_id == "product_detail" and len(product_names) > 1 else 0
                    task_product_names = [product_names[desc_idx]] if product_names else product_names
                else:
                    task_product_names = product_names

                key = f"{sec_type}__{inst_idx}" if is_duplicate else sec_type
                image_tasks.append({
                    "key": key,
                    "sec_type": sec_type,
                    "inst_idx": inst_idx,
                    "w": w, "h": h,
                    "filename": filename,
                    "relevant_texts": relevant_texts,
                    "ref_img": ref_img,
                    "ref_mime": ref_mime,
                    "product_names": task_product_names,
                })

            # 이미지 생성 코루틴 (세마포어로 동시 2개 제한)
            img_sem = asyncio.Semaphore(2)
            section_image_urls: dict[str, str] = {}
            image_prompts: dict[str, str] = {}

            async def _gen_image(task_info: dict) -> None:
                async with img_sem:
                    logger.info(f"{task_info['sec_type']} 이미지 생성 시작 (인스턴스 {task_info['inst_idx']})")
                    image_bytes, prompt_used = await generate_section_image(
                        product_names=task_info.get("product_names", product_names),
                        section_type=task_info["sec_type"],
                        width=task_info["w"],
                        height=task_info["h"],
                        reference_image=task_info["ref_img"],
                        reference_mime_type=task_info["ref_mime"],
                        section_texts=task_info["relevant_texts"],
                        theme=theme,
                        brand_name=brand_name if page_type_id == "brand_promotion" else None,
                        concept=concept,
                    )
                    path = await self.storage.upload_image(
                        file_bytes=image_bytes,
                        project_id=project_id,
                        image_type="generated",
                        filename=task_info["filename"],
                    )
                    url = self.storage.get_public_url(path)
                    section_image_urls[task_info["key"]] = url
                    image_prompts[task_info["key"]] = prompt_used

            # 5+5.5+5.6. 이미지 생성, 상품 누끼, 고메트립 누끼를 동시 실행
            parallel_jobs: list = [
                asyncio.gather(*[_gen_image(t) for t in image_tasks]),
                self._preprocess_bg_removal(
                    section_templates=section_templates,
                    product_image_urls=product_image_urls,
                    project_id=project_id,
                ),
            ]

            if page_type_id == "gourmet":
                parallel_jobs.append(
                    self._preprocess_gourmet_bg_removal(
                        restaurants=restaurants,
                        wines=wines,
                        project_id=project_id,
                    )
                )

            parallel_results = await asyncio.gather(*parallel_jobs)

            product_bg_removed_urls = parallel_results[1]

            if page_type_id == "gourmet" and len(parallel_results) > 2:
                restaurants, wines = parallel_results[2]

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
                    restaurants=restaurants,
                    wines=wines,
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

            update_payload = {
                "theme_id": page_type_id,
                "template_used": template_used,
                "generated_data": generated_data,
                "rendered_sections": rendered_sections,
                "products": products,
            }
            if background_config:
                update_payload["background_config"] = background_config
            if restaurants:
                update_payload["restaurants"] = restaurants
            self.db.table("projects").update(update_payload).eq("id", project_id).execute()

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
            .order("sort_order")
            .order("created_at")
            .execute()
        )

        urls = []
        for record in (result.data or []):
            url = self.storage.get_public_url(record["storage_path"])
            urls.append(url)

        return urls

    async def _download_reference_image(
        self, product_image_urls: list[str], index: int = 0,
    ) -> tuple[bytes, str] | tuple[None, None]:
        """지정 인덱스의 상품 이미지를 다운로드하여 (bytes, mime_type)을 반환한다."""
        if not product_image_urls or index >= len(product_image_urls):
            return None, None
        try:
            async with httpx.AsyncClient(timeout=15.0) as http:
                resp = await http.get(product_image_urls[index])
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
                if content_type not in ("image/png", "image/jpeg", "image/webp"):
                    content_type = "image/jpeg"
                logger.info(f"참조 이미지 다운로드 완료 (idx={index}): {len(resp.content)} bytes, {content_type}")
                return resp.content, content_type
        except Exception as e:
            logger.warning(f"참조 이미지 다운로드 실패 (idx={index}), 텍스트 기반 생성으로 대체: {e}")
            return None, None

    async def _preprocess_gourmet_bg_removal(
        self,
        restaurants: list[dict] | None,
        wines: list[dict] | None,
        project_id: str,
    ) -> tuple[list[dict] | None, list[dict] | None]:
        """고메트립 음식/와인 이미지에 누끼(배경 제거)를 적용한다.

        각 음식/와인 이미지 URL을 다운로드 → 배경 제거 → 업로드 후
        image_url을 배경 제거된 URL로 교체한다.

        Returns:
            (수정된 restaurants, 수정된 wines) 튜플
        """
        async def _bg_remove_url(url: str, label: str, max_retries: int = 2) -> str:
            """URL에서 이미지를 다운로드하여 배경 제거 후 업로드, 새 URL 반환.
            Bedrock throttling 대비 재시도 로직 포함. 400(content filter)은 즉시 실패."""
            if not url:
                return url
            for attempt in range(max_retries + 1):
                try:
                    async with httpx.AsyncClient(timeout=30.0) as http:
                        resp = await http.get(url)
                        resp.raise_for_status()
                        original_bytes = resp.content

                    removed_bytes = await remove_background(original_bytes, raise_on_error=True)

                    filename = f"{label}_bg_removed.png"
                    path = await self.storage.upload_image(
                        file_bytes=removed_bytes,
                        project_id=project_id,
                        image_type="bg_removed",
                        filename=filename,
                    )
                    new_url = self.storage.get_public_url(path)
                    logger.info(f"누끼 제거 완료: {label}")
                    return new_url
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 400:
                        logger.warning(f"누끼 제거 차단 ({label}), content filter — 원본 사용")
                        return url
                    if attempt < max_retries:
                        wait = 3 * (attempt + 1)
                        logger.warning(f"누끼 제거 재시도 ({label}), attempt {attempt+1}/{max_retries}, {wait}초 대기: {e}")
                        await asyncio.sleep(wait)
                    else:
                        logger.warning(f"누끼 제거 최종 실패 ({label}), 원본 사용: {e}")
                        return url
                except Exception as e:
                    if attempt < max_retries:
                        wait = 3 * (attempt + 1)
                        logger.warning(f"누끼 제거 재시도 ({label}), attempt {attempt+1}/{max_retries}, {wait}초 대기: {e}")
                        await asyncio.sleep(wait)
                    else:
                        logger.warning(f"누끼 제거 최종 실패 ({label}), 원본 사용: {e}")
                        return url
            return url

        # Bedrock throttling 방지를 위한 세마포어 (동시 2개 제한)
        sem = asyncio.Semaphore(2)

        async def _sem_bg_remove(url: str, label: str) -> str:
            async with sem:
                result = await _bg_remove_url(url, label)
                # 세마포어 내에서 짧은 대기 (throttling 완화)
                await asyncio.sleep(1)
                return result

        # 음식 + 와인 이미지 누끼 제거를 병렬로 수집
        tasks: list[tuple[str, asyncio.Task]] = []

        if restaurants:
            for r_idx, restaurant in enumerate(restaurants):
                for food_key in ("food1", "food2"):
                    food = restaurant.get(food_key, {})
                    img_url = food.get("image_url", "")
                    if img_url:
                        key = f"r{r_idx}_{food_key}"
                        task = asyncio.create_task(_sem_bg_remove(img_url, key))
                        tasks.append((key, task))

        if wines:
            logger.info(f"[와인 누끼] wines 전체 데이터: {wines}")
            for w_idx, wine in enumerate(wines):
                img_url = wine.get("image_url", "")
                if img_url:
                    key = f"wine_{w_idx}"
                    task = asyncio.create_task(_sem_bg_remove(img_url, key))
                    tasks.append((key, task))
                else:
                    logger.warning(f"[와인 누끼] wine[{w_idx}] image_url 비어있음 — 누끼 건너뜀")

        # 모든 누끼 제거 완료 대기
        results: dict[str, str] = {}
        if tasks:
            await asyncio.gather(*(t for _, t in tasks))
            results = {key: task.result() for key, task in tasks}

        # 결과를 원본 데이터에 반영
        if restaurants:
            for r_idx, restaurant in enumerate(restaurants):
                for food_key in ("food1", "food2"):
                    key = f"r{r_idx}_{food_key}"
                    if key in results:
                        restaurant[food_key]["image_url"] = results[key]

        if wines:
            for w_idx, wine in enumerate(wines):
                key = f"wine_{w_idx}"
                if key in results:
                    wine["image_url"] = results[key]

        return restaurants, wines

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
