"""v5.2 AI 서비스: 섹션 텍스트 생성 + 섹션 이미지 생성"""

import json
import logging

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# 섹션별 이미지 프롬프트 힌트 + aspect_ratio 매핑
_SECTION_IMAGE_HINTS: dict[str, str] = {
    "hero_banner": (
        "세로 비율, 상품이 주인공인 역동적인 장면, "
        "실제 사용/조리/착용 모습, 클로즈업, 풍부한 색감, "
        "위에서 텍스트가 올라가므로 상단 20%는 어두운 그라디언트 여유 공간"
    ),
    "description": (
        "깔끔한 정사각형 구도, 상품을 중앙에 배치, "
        "미니멀한 배경, 고급스러운 스튜디오 조명, "
        "원형 크롭에 적합한 중앙 집중 구도"
    ),
    "feature_point": (
        "와이드 구도, 상품을 활용한 라이프스타일 연출, "
        "자연스러운 사용 장면, 따뜻한 조명, "
        "상세페이지 하단 풀 와이드 이미지"
    ),
}

# 섹션별 Gemini ImageConfig aspect_ratio
# 지원: "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
_SECTION_ASPECT_RATIO: dict[str, str] = {
    "hero_banner": "9:16",    # 860x1400 ≈ 9:16
    "description": "1:1",     # 600x600
    "feature_point": "4:5",   # 860x957 ≈ 4:5
}


async def generate_section_image(
    product_names: list[str],
    section_type: str,
    width: int = 860,
    height: int = 860,
    reference_image: bytes | None = None,
    reference_mime_type: str | None = None,
) -> bytes:
    """섹션별 상품 컨텍스트 AI 이미지를 생성한다.

    reference_image가 있으면 Gemini에 참조 이미지로 전달하여
    동일한 상품의 새로운 연출 이미지를 생성한다.
    """
    products_str = ", ".join(product_names)
    style_hint = _SECTION_IMAGE_HINTS.get(section_type, _SECTION_IMAGE_HINTS["feature_point"])

    aspect_ratio = _SECTION_ASPECT_RATIO.get(section_type, "1:1")

    if reference_image:
        text_prompt = (
            f"첨부한 사진 속 상품과 동일한 상품의 새로운 연출 사진을 만들어줘. "
            f"반드시 첨부 이미지의 상품 외형, 색상, 디자인을 그대로 유지해야 해. "
            f"상품명: {products_str}. "
            f"연출 스타일: {style_hint}, "
            f"4K 품질, 상업 사진"
        )
        mime = reference_mime_type or "image/jpeg"
        contents_with_ref = [
            types.Part.from_bytes(data=reference_image, mime_type=mime),
            text_prompt,
        ]
    else:
        text_prompt = (
            f"이커머스 상세페이지용 고퀄리티 상품 사진. "
            f"상품: {products_str}. "
            f"{style_hint}, "
            f"4K 품질, 상업 사진 스타일"
        )
        contents_with_ref = None

    max_retries = 2
    for attempt in range(max_retries + 1):
        # 모든 시도에서 참조 이미지 포함 (있으면)
        contents = contents_with_ref if contents_with_ref else text_prompt

        try:
            response = await client.aio.models.generate_content(
                model=settings.IMAGE_GEN_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(
                        aspect_ratio=aspect_ratio,
                    ),
                ),
            )

            if not response.candidates or not response.candidates[0].content:
                logger.warning(
                    f"이미지 생성 빈 응답 (시도 {attempt + 1}, ref={reference_image is not None}): "
                    f"candidates={response.candidates}"
                )
                continue

            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    logger.info(f"섹션 이미지 생성 완료: {section_type} (시도 {attempt + 1})")
                    return part.inline_data.data

            logger.warning(f"이미지 파트 없음 (시도 {attempt + 1})")

        except Exception as e:
            logger.warning(f"이미지 생성 예외 (시도 {attempt + 1}, ref={reference_image is not None}): {e}")

    raise RuntimeError(f"섹션 이미지 생성 실패 ({section_type}): {max_retries + 1}회 시도 후 실패")


async def generate_section_texts(
    product_names: list[str],
    theme_name: str,
    copy_keywords: list[str],
) -> dict:
    """Gemini 1회 호출로 전 섹션 텍스트를 JSON으로 생성한다.

    v5.2 placeholder 이름 기준 반환:
    {
        "category": "...",
        "title": "...",
        "subtitle": "...",
        "badge_1": "...", "badge_2": "...", "badge_3": "...",
        "desc_title_main": "...",
        "desc_title_accent": "...",
        "desc_body": "...",
        "hashtags": ["#태그1", "#태그2", ...],
        "point_label": "...",
        "point_title_main": "...",
        "point_title_accent": "...",
        "point_body": "..."
    }
    """
    products_str = ", ".join(product_names)
    keywords_str = ", ".join(copy_keywords)

    prompt = (
        f"당신은 한국 이커머스 PDP(상품 상세 페이지) 카피라이터입니다.\n"
        f"다음 조건으로 PDP의 각 섹션에 들어갈 한국어 텍스트를 JSON으로 생성해주세요.\n\n"
        f"조건:\n"
        f"- 상품: {products_str}\n"
        f"- 테마: {theme_name}\n"
        f"- 키워드: {keywords_str}\n\n"
        f"반드시 아래 JSON 형식으로만 출력하세요 (설명 없이 JSON만):\n"
        f'{{\n'
        f'  "category": "(10자 이내 카테고리명, 예: Premium, Best Choice)",\n'
        f'  "title": "(15자 이내 임팩트 있는 메인 타이틀)",\n'
        f'  "subtitle": "(25자 이내 보조 문구)",\n'
        f'  "badge_1": "(4자 이내 줄바꿈 포함, 예: 최상급\\n한우)",\n'
        f'  "badge_2": "(4자 이내 줄바꿈 포함, 예: 특수진공\\n포장)",\n'
        f'  "badge_3": "(4자 이내 줄바꿈 포함, 예: 이력추적\\n가능)",\n'
        f'  "desc_title_main": "(10자 이내 설명 제목 첫째줄)",\n'
        f'  "desc_title_accent": "(15자 이내 설명 제목 강조)",\n'
        f'  "desc_body": "(80자 이내 상세 설명, 줄바꿈 가능)",\n'
        f'  "hashtags": ["#태그1", "#태그2", "#태그3", "#태그4"],\n'
        f'  "point_label": "(8자 이내, 예: Point 1)",\n'
        f'  "point_title_main": "(10자 이내 포인트 제목)",\n'
        f'  "point_title_accent": "(10자 이내 포인트 강조)",\n'
        f'  "point_body": "(60자 이내 포인트 설명)"\n'
        f'}}'
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
            logger.info(f"섹션 텍스트 생성 완료: {list(result.keys())}")
            return result
        except json.JSONDecodeError as e:
            # 코드블록 래핑 제거 후 재시도
            try:
                cleaned = raw.strip("`").removeprefix("json").strip()
                result = json.loads(cleaned)
                logger.info(f"섹션 텍스트 생성 완료 (정리 후): {list(result.keys())}")
                return result
            except json.JSONDecodeError:
                last_error = e
                logger.warning(
                    f"텍스트 생성 JSON 파싱 실패 (시도 {attempt + 1}/{max_retries + 1}): {e}\n"
                    f"원본 응답: {raw[:300]}"
                )

    raise RuntimeError(f"텍스트 생성 실패: {max_retries + 1}회 시도 후 JSON 파싱 불가 — {last_error}")
