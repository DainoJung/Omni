"""v5.2 AI 서비스: 섹션 텍스트 생성 + 섹션 이미지 생성"""

import json
import logging
from pathlib import Path

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# 이미지 프롬프트 설정 로드
_PROMPT_CONFIG_PATH = Path(__file__).resolve().parent.parent / "constants" / "image_prompts.json"
with open(_PROMPT_CONFIG_PATH, encoding="utf-8") as f:
    _IMAGE_PROMPT_CONFIG = json.load(f)


async def generate_section_image(
    product_names: list[str],
    section_type: str,
    width: int = 860,
    height: int = 860,
    reference_image: bytes | None = None,
    reference_mime_type: str | None = None,
    custom_prompt: str | None = None,
    section_texts: dict[str, str] | None = None,
    theme: dict | None = None,
) -> tuple[bytes, str]:
    """섹션별 상품 컨텍스트 AI 이미지를 생성한다.

    reference_image가 있으면 Gemini에 참조 이미지로 전달하여
    동일한 상품의 새로운 연출 이미지를 생성한다.

    Returns:
        (image_bytes, prompt_used) 튜플
    """
    products_str = ", ".join(product_names)

    sec_config = _IMAGE_PROMPT_CONFIG["sections"].get(
        section_type, _IMAGE_PROMPT_CONFIG["sections"]["feature_point"]
    )
    style_hint = sec_config["style_hint"]
    aspect_ratio = sec_config["aspect_ratio"]
    no_text_rule = _IMAGE_PROMPT_CONFIG["no_text_rule"]

    # 테마 분위기 컨텍스트
    theme_context = ""
    if theme:
        theme_context = f"테마: {theme.get('name', '')}, 분위기: {theme.get('background_prompt', '')}. "

    # 섹션 텍스트에서 컨텍스트 추출
    section_context = ""
    if section_texts:
        context_parts = [
            v.strip() for k, v in section_texts.items()
            if isinstance(v, str) and v.strip() and not k.startswith("hashtags")
        ]
        if context_parts:
            section_context = f"섹션 내용: {', '.join(context_parts)}. "

    # 프롬프트 변수 (저장용 JSON 구조)
    prompt_vars = {
        "products": products_str,
        "theme": theme_context.rstrip(". ") if theme_context else "",
        "section_context": section_context.rstrip(". ") if section_context else "",
        "style_hint": style_hint,
        "no_text_rule": no_text_rule,
    }

    # 프롬프트 변수 (템플릿 치환용 — 구분자 포함)
    format_vars = {
        "products": products_str,
        "theme": theme_context,
        "section_context": section_context,
        "style_hint": style_hint,
        "no_text_rule": no_text_rule,
    }

    templates = _IMAGE_PROMPT_CONFIG["templates"]

    # fit_hero 전용 프롬프트 사용 여부
    use_fit_hero_template = section_type == "fit_hero" and "fit_hero" in templates

    if custom_prompt:
        text_prompt = f"{custom_prompt} {no_text_rule}"
        prompt_vars["custom_prompt"] = custom_prompt
    elif use_fit_hero_template:
        # fit_hero 전용 템플릿 사용 (상품/브랜드 라이프스타일 이미지)
        text_prompt = templates["fit_hero"].format(**format_vars)
        # reference_image 유지 — 상품 참조 이미지를 활용하여 브랜드 결에 맞는 이미지 생성
        logger.info("fit_hero: 상품 참조 기반 브랜드 라이프스타일 이미지 생성")
    elif reference_image:
        text_prompt = templates["reference"].format(**format_vars)
    else:
        text_prompt = templates["default"].format(**format_vars)

    if reference_image:
        mime = reference_mime_type or "image/jpeg"
        contents_with_ref = [
            types.Part.from_bytes(data=reference_image, mime_type=mime),
            text_prompt,
        ]
    else:
        contents_with_ref = None

    # 참조 이미지 포함 → 참조 이미지 없이 텍스트만 순서로 시도
    # 참조 이미지가 있으면 2단계: (1) ref 포함 시도 (2) ref 없이 폴백
    strategies: list[tuple[str | list, str]] = []
    if contents_with_ref:
        strategies.append((contents_with_ref, "ref"))
        # 폴백: 참조 이미지 없이 텍스트 전용 프롬프트
        fallback_prompt = templates["default"].format(**prompt_vars)
        strategies.append((fallback_prompt, "text-only"))
    else:
        strategies.append((text_prompt, "text-only"))

    max_retries = 2
    for contents, strategy_label in strategies:
        # 참조 이미지 포함 시 Text+Image 모달리티 사용 (문서 권장)
        # 텍스트 전용 시 Image 전용 모달리티 사용
        use_text_and_image = strategy_label == "ref"
        modalities = ["Text", "Image"] if use_text_and_image else ["Image"]

        for attempt in range(max_retries + 1):
            try:
                response = await client.aio.models.generate_content(
                    model=settings.IMAGE_GEN_MODEL,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_modalities=modalities,
                        image_config=types.ImageConfig(
                            aspect_ratio=aspect_ratio,
                        ),
                    ),
                )

                if not response.candidates or not response.candidates[0].content:
                    logger.warning(
                        f"이미지 생성 빈 응답 ({strategy_label}, 시도 {attempt + 1}): "
                        f"candidates={response.candidates}"
                    )
                    continue

                for part in response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                        logger.info(
                            f"섹션 이미지 생성 완료: {section_type} "
                            f"({strategy_label}, 시도 {attempt + 1})"
                        )
                        return part.inline_data.data, prompt_vars

                logger.warning(f"이미지 파트 없음 ({strategy_label}, 시도 {attempt + 1})")

            except Exception as e:
                logger.warning(
                    f"이미지 생성 예외 ({strategy_label}, 시도 {attempt + 1}): {e}"
                )

        if strategy_label == "ref":
            logger.info(
                f"참조 이미지 방식 실패, 텍스트 전용 폴백으로 전환: {section_type}"
            )

    raise RuntimeError(f"섹션 이미지 생성 실패 ({section_type}): 모든 전략 시도 후 실패")


_SECTION_TEXT_KEYS: dict[str, list[tuple[str, str]]] = {
    "hero_banner": [
        ("category", "10자 이내 카테고리명, 예: Premium, Best Choice"),
        ("title", "15자 이내 임팩트 있는 메인 타이틀"),
        ("subtitle", "25자 이내 보조 문구"),
    ],
    "feature_badges": [
        ("badge_1", "4자 이내 줄바꿈 포함, 예: 최상급\\n한우"),
        ("badge_2", "4자 이내 줄바꿈 포함, 예: 특수진공\\n포장"),
        ("badge_3", "4자 이내 줄바꿈 포함, 예: 이력추적\\n가능"),
    ],
    "description": [
        ("desc_title_main", "10자 이내 설명 제목 첫째줄"),
        ("desc_title_accent", "15자 이내 설명 제목 강조"),
        ("desc_body", "80자 이내 상세 설명, 줄바꿈 가능"),
        ("hashtags", '["#태그1", "#태그2", "#태그3", "#태그4"]'),
    ],
    "feature_point": [
        ("point_label", "8자 이내, 예: Point 1"),
        ("point_title_main", "10자 이내 포인트 제목"),
        ("point_title_accent", "10자 이내 포인트 강조"),
        ("point_body", "60자 이내 포인트 설명"),
    ],
    "promo_hero": [
        ("script_title", "10자 이내 필기체 타이틀, 예: Holiday Gift"),
        ("category_title", "15자 이내 카테고리명, 대문자 영문 또는 한국어"),
        ("subtitle", "20자 이내 서브타이틀"),
        ("location", "10자 이내 위치 정보, 예: 패션관 1층"),
    ],
    "product_card": [
        ("product_note", "20자 이내 혜택/메모 문구, 예: * 구매 시 파우치 증정"),
    ],
    "fit_hero": [
        ("brand_name", "10자 이내 브랜드/카테고리명, 예: GUCCI"),
        ("event_title", "20자 이내 임팩트 있는 메인 타이틀, 예: 명품&해외 패션, Timeless Luxury"),
        ("event_subtitle", "30자 이내 서브 카피, 예: 세련된 감각과 정제된 디테일의 명품 컬렉션"),
        ("event_period", "25자 이내 해시태그 또는 기간, 예: #2026S/S #하이엔드 #NEW컬렉션"),
    ],
    "fit_event_info": [
        ("event_name", "20자 이내 큐레이션 타이틀, 영문 권장, 예: New Year Gift Curation"),
        ("benefit_text", "40자 이내 혜택 또는 설명 문구, 줄바꿈 가능"),
        ("info_period", "20자 이내 행사 기간, 예: 1.30(금) – 2.8(일)"),
        ("info_location", "15자 이내 행사 장소, 예: 본점"),
        ("cta_text", "10자 이내 CTA 문구, 예: 자세히 보기"),
    ],
    "fit_product_trio": [
        ("product_desc_0", "25자 이내 상품1 한줄 설명"),
        ("product_desc_1", "25자 이내 상품2 한줄 설명"),
        ("product_desc_2", "25자 이내 상품3 한줄 설명"),
    ],
    "vip_special_hero": [
        ("vip_badge", "8자 이내 VIP 배지, 예: VIP SPECIAL"),
        ("event_title", "20자 이내 이벤트 메인 타이틀"),
        ("event_subtitle", "30자 이내 서브 카피"),
        ("benefit_text", "25자 이내 혜택 문구, 예: 최대 30% 할인"),
        ("event_period", "20자 이내 행사 기간"),
    ],
    "vip_private_hero": [
        ("private_label", "10자 이내 프라이빗 라벨, 예: PRIVATE WEEK"),
        ("event_title", "20자 이내 이벤트 메인 타이틀"),
        ("event_desc", "40자 이내 이벤트 설명"),
        ("cta_text", "10자 이내 CTA 문구, 예: 지금 확인하기"),
    ],
    "gourmet_hero": [
        ("trip_tag", "10자 이내 태그, 예: GOURMET TRIP"),
        ("trip_title", "20자 이내 미식 여행 타이틀"),
        ("location", "15자 이내 장소, 예: 서울 강남"),
        ("trip_desc", "40자 이내 설명"),
        ("price", "15자 이내 가격 정보, 예: 1인 89,000원~"),
    ],
    "shinsegae_hero": [
        ("event_title", "20자 이내 이벤트 타이틀"),
        ("benefit_1", "20자 이내 혜택1, 예: 최대 10만원 적립"),
        ("benefit_2", "20자 이내 혜택2, 예: 전 브랜드 15% 할인"),
        ("benefit_3", "20자 이내 혜택3, 예: 무료 주차 3시간"),
        ("event_period", "20자 이내 행사 기간"),
    ],
}


def _build_text_prompt_schema(section_counts: dict[str, int] | None) -> str:
    """section_counts를 기반으로 JSON 스키마 문자열을 생성한다.

    중복 섹션이 있으면 인덱스 접미사를 붙인다:
    - 1개: "point_label": "..."
    - 3개: "point_label__0": "...", "point_label__1": "...", "point_label__2": "..."
    """
    counts = section_counts or {k: 1 for k in _SECTION_TEXT_KEYS}
    lines = []
    for sec_type, keys in _SECTION_TEXT_KEYS.items():
        n = counts.get(sec_type, 0)
        if n == 0:
            continue
        if n == 1:
            for key, desc in keys:
                if key == "hashtags":
                    lines.append(f'  "hashtags": {desc}')
                else:
                    lines.append(f'  "{key}": "({desc})"')
        else:
            for idx in range(n):
                for key, desc in keys:
                    suffixed = f"{key}__{idx}"
                    if key == "hashtags":
                        lines.append(f'  "{suffixed}": {desc}')
                    else:
                        lines.append(
                            f'  "{suffixed}": "({desc} — {idx + 1}번째, 서로 다른 내용)"'
                        )
    return "{\n" + ",\n".join(lines) + "\n}"


def _ensure_dict(result) -> dict:
    """Gemini가 list를 반환하는 경우 첫 번째 dict 요소를 추출한다."""
    if isinstance(result, dict):
        return result
    if isinstance(result, list):
        # [{...}] → {...} 또는 [{k:v}, {k:v}] → 병합
        merged = {}
        for item in result:
            if isinstance(item, dict):
                merged.update(item)
        if merged:
            return merged
    raise ValueError(f"예상치 못한 응답 타입: {type(result)}")


async def generate_section_texts(
    product_names: list[str],
    theme_name: str,
    copy_keywords: list[str],
    section_counts: dict[str, int] | None = None,
) -> dict:
    """Gemini 1회 호출로 전 섹션 텍스트를 JSON으로 생성한다.

    section_counts가 주어지면 중복 섹션에 대해 인덱스된 키를 생성한다.
    예: feature_point 3개 → point_label__0, point_label__1, point_label__2
    """
    products_str = ", ".join(product_names)
    keywords_str = ", ".join(copy_keywords)
    schema = _build_text_prompt_schema(section_counts)

    prompt = (
        f"당신은 한국 이커머스 POP(상품 상세 페이지) 카피라이터입니다.\n"
        f"다음 조건으로 POP의 각 섹션에 들어갈 한국어 텍스트를 JSON으로 생성해주세요.\n\n"
        f"조건:\n"
        f"- 상품: {products_str}\n"
        f"- 테마: {theme_name}\n"
        f"- 키워드: {keywords_str}\n\n"
        f"중요: 같은 섹션이 여러 개인 경우 각각 서로 다른 관점/내용으로 작성하세요.\n\n"
        f"반드시 아래 JSON 형식으로만 출력하세요 (설명 없이 JSON만):\n"
        f"{schema}"
    )

    max_retries = 2
    last_error = None

    for attempt in range(max_retries + 1):
        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=4096,
                temperature=0.8,
                response_mime_type="application/json",
            ),
        )

        raw = response.text.strip()
        try:
            result = json.loads(raw)
            result = _ensure_dict(result)
            logger.info(f"섹션 텍스트 생성 완료: {list(result.keys())}")
            return result
        except (json.JSONDecodeError, ValueError) as e:
            # 코드블록 래핑 제거 후 재시도
            try:
                cleaned = raw.strip("`").removeprefix("json").strip()
                result = json.loads(cleaned)
                result = _ensure_dict(result)
                logger.info(f"섹션 텍스트 생성 완료 (정리 후): {list(result.keys())}")
                return result
            except (json.JSONDecodeError, ValueError):
                last_error = e
                logger.warning(
                    f"텍스트 생성 JSON 파싱 실패 (시도 {attempt + 1}/{max_retries + 1}): {e}\n"
                    f"원본 응답: {raw[:300]}"
                )

    raise RuntimeError(f"텍스트 생성 실패: {max_retries + 1}회 시도 후 JSON 파싱 불가 — {last_error}")
