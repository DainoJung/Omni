from typing import Optional


SYSTEM_PROMPT = """당신은 신세계백화점 전속 카피라이터입니다.
상세페이지용 마케팅 텍스트를 생성합니다.

규칙:
1. 고급스럽고 세련된 신세계백화점 톤앤매너를 유지합니다.
2. 간결하면서도 임팩트 있는 문구를 작성합니다.
3. 반드시 JSON 형식으로만 응답합니다. JSON 외 텍스트를 포함하지 마세요.
4. 모든 텍스트는 한국어로 작성합니다.
5. 과장 광고나 허위 표현을 사용하지 않습니다."""


FOOD_PROMPT = """다음 정보를 바탕으로 식품 프로모션 상세페이지 텍스트를 생성하세요.

<input>
브랜드: {brand_name}
설명: {description}
카테고리: 식품
행사기간: {event_period}
가격정보: {price_info}
</input>

<template_info>
템플릿: 식품 프로모션 (860 × 3200px)
섹션: 헤더 → 상품 그리드(4칸) → 혜택/가격표 → 푸터
톤앤매너: 따뜻하고 정갈한, 식욕을 자극하는 감성적 표현
</template_info>

다음 JSON 형식으로 응답하세요:

{{
  "main_copy": "메인 타이틀 (15자 이내, 식품의 매력을 한 문장으로)",
  "sub_copy": "서브 카피 (30자 이내, 메인 카피를 보완하는 설명)",
  "body_texts": [
    "본문 1 (40자 이내, 식품/브랜드의 특징이나 스토리)",
    "본문 2 (40자 이내, 행사/프로모션의 핵심 가치)"
  ],
  "product_descriptions": [
    {{"name": "상품명 1", "desc": "상품 설명 (20자 이내)"}},
    {{"name": "상품명 2", "desc": "상품 설명 (20자 이내)"}},
    {{"name": "상품명 3", "desc": "상품 설명 (20자 이내)"}},
    {{"name": "상품명 4", "desc": "상품 설명 (20자 이내)"}}
  ],
  "benefits": [
    "혜택 1 (예: 전 상품 20% 할인)",
    "혜택 2 (예: 5만원 이상 구매 시 사은품 증정)"
  ],
  "cta_text": "CTA 버튼 문구 (8자 이내, 행동 유도)",
  "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3"]
}}"""


FASHION_PROMPT = """다음 정보를 바탕으로 패션 룩북 상세페이지 텍스트를 생성하세요.

<input>
브랜드: {brand_name}
설명: {description}
카테고리: 패션
행사기간: {event_period}
가격정보: {price_info}
</input>

<template_info>
템플릿: 패션 룩북 (860 × 4000px)
섹션: 히어로 배너 → 룩북(이미지+텍스트 교차) → 상품 정보(지그재그) → CTA + 푸터
톤앤매너: 모던하고 세련된, 트렌디하면서 고급스러운 표현. 영문 키워드 적절히 혼합.
</template_info>

다음 JSON 형식으로 응답하세요:

{{
  "main_copy": "메인 타이틀 (15자 이내, 영문 브랜드/시즌 키워드 허용)",
  "sub_copy": "서브 카피 (30자 이내, 컬렉션/브랜드 철학 한 줄 표현)",
  "body_texts": [
    "룩북 설명 1 (60자 이내, 첫 번째 룩에 대한 감성적 설명)",
    "룩북 설명 2 (60자 이내, 두 번째 룩에 대한 감성적 설명)"
  ],
  "product_descriptions": [
    {{"name": "상품명 1 (영문 가능)", "desc": "소재, 핏, 스타일 포인트 (25자 이내)"}},
    {{"name": "상품명 2 (영문 가능)", "desc": "소재, 핏, 스타일 포인트 (25자 이내)"}}
  ],
  "cta_text": "CTA 버튼 문구 (8자 이내)",
  "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3"]
}}"""


PROMPT_MAP = {
    "food": FOOD_PROMPT,
    "fashion": FASHION_PROMPT,
}


def build_prompt(
    template_category: str,
    brand_name: str,
    description: str,
    event_period: Optional[str] = None,
    price_info: Optional[str] = None,
    color_preset_name: Optional[str] = None,
    tone_manner: Optional[dict] = None,
) -> str:
    template = PROMPT_MAP.get(template_category)
    if not template:
        raise ValueError(f"지원하지 않는 카테고리: {template_category}")

    base_prompt = template.format(
        brand_name=brand_name,
        description=description,
        event_period=event_period or "미정",
        price_info=price_info or "미정",
    )

    # 스타일 컨텍스트 추가
    style_context = ""
    if color_preset_name or tone_manner:
        style_parts = []
        if color_preset_name:
            style_parts.append(f"컬러 테마: {color_preset_name}")
        if tone_manner:
            style_str = tone_manner.get("style", "")
            mood_str = tone_manner.get("mood", "")
            keywords = tone_manner.get("keywords", [])
            if style_str:
                style_parts.append(f"톤앤매너 스타일: {style_str}")
            if mood_str:
                style_parts.append(f"분위기: {mood_str}")
            if keywords:
                style_parts.append(f"키워드: {', '.join(keywords)}")
        style_context = "\n\n<style_context>\n" + "\n".join(style_parts) + "\n텍스트 생성 시 위 스타일과 분위기를 반드시 반영하세요.\n</style_context>"

    return base_prompt + style_context
