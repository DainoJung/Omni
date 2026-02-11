"""페이지 타입 상수 정의 (6종) - IDML 템플릿 기반"""

import math

PAGE_TYPES: dict[str, dict] = {
    "product_detail": {
        "id": "product_detail",
        "name": "상품 상세",
        "icon": "📦",
        "description": "단일 상품의 상세 정보를 보여주는 페이지",
        "min_products": 1,
        "max_products": 1,
        "requires_price": False,
        "accent_color": "#2563EB",
        "catalog_bg_color": "#1e3a5f",
        "background_prompt": (
            "고급 상품 상세페이지 배경, 미니멀하고 세련된 분위기, "
            "고급스러운 스튜디오 조명, 프리미엄 느낌, 텍스트 없이"
        ),
        "copy_keywords": ["프리미엄", "엄선된", "특별한", "최고급"],
    },
    "promotion": {
        "id": "promotion",
        "name": "기획전",
        "icon": "🎪",
        "description": "시즌/테마별 기획전 프로모션 페이지",
        "min_products": 2,
        "max_products": 6,
        "requires_price": True,
        "accent_color": "#E91E90",
        "catalog_bg_color": "#9d174d",
        "background_prompt": (
            "기획전 프로모션 배경, 화려하고 축제 분위기, "
            "고급스러운 연출, 텍스트 없이"
        ),
        "copy_keywords": ["특별한", "한정", "기획", "혜택"],
    },
    "vip_special": {
        "id": "vip_special",
        "name": "VIP 스페셜위크",
        "icon": "💎",
        "description": "VIP 고객 대상 스페셜위크 프로모션",
        "min_products": 2,
        "max_products": 6,
        "requires_price": True,
        "accent_color": "#8B5CF6",
        "catalog_bg_color": "#4c1d95",
        "background_prompt": (
            "VIP 스페셜위크 배경, 럭셔리 보라색 톤, "
            "다이아몬드 반짝임, 고급스러운 분위기, 텍스트 없이"
        ),
        "copy_keywords": ["VIP", "스페셜", "특별", "프리미엄"],
    },
    "vip_private": {
        "id": "vip_private",
        "name": "VIP 프라이빗위크",
        "icon": "🖤",
        "description": "VIP 고객 대상 프라이빗위크 프로모션",
        "min_products": 2,
        "max_products": 6,
        "requires_price": True,
        "accent_color": "#1F2937",
        "catalog_bg_color": "#111827",
        "background_prompt": (
            "VIP 프라이빗위크 배경, 블랙&골드 톤, "
            "고급스러운 다크 럭셔리 분위기, 텍스트 없이"
        ),
        "copy_keywords": ["프라이빗", "VIP", "독점", "럭셔리"],
    },
    "gourmet": {
        "id": "gourmet",
        "name": "고메트립",
        "icon": "🍽️",
        "description": "미식 여행/다이닝 프로모션 페이지",
        "min_products": 1,
        "max_products": 6,
        "requires_price": True,
        "accent_color": "#D97706",
        "catalog_bg_color": "#78350f",
        "background_prompt": (
            "고메트립 다이닝 배경, 고급 레스토랑 분위기, "
            "따뜻한 조명, 미식 여행 느낌, 텍스트 없이"
        ),
        "copy_keywords": ["미식", "다이닝", "셰프", "프리미엄"],
    },
    "shinsegae": {
        "id": "shinsegae",
        "name": "뱅드신세계",
        "icon": "🏬",
        "description": "신세계백화점 뱅크 프로모션 페이지",
        "min_products": 2,
        "max_products": 6,
        "requires_price": True,
        "accent_color": "#DC2626",
        "catalog_bg_color": "#7f1d1d",
        "background_prompt": (
            "뱅드신세계 프로모션 배경, 백화점 세일 분위기, "
            "레드&골드 톤, 화려한 프로모션 느낌, 텍스트 없이"
        ),
        "copy_keywords": ["신세계", "혜택", "적립", "할인"],
    },
}


def get_page_type(page_type_id: str) -> dict:
    """페이지 타입 ID로 페이지 타입 정보를 조회한다."""
    page_type = PAGE_TYPES.get(page_type_id)
    if not page_type:
        raise ValueError(f"알 수 없는 페이지 타입: {page_type_id}")
    return page_type


def list_page_types() -> list[dict]:
    """전체 페이지 타입 목록을 반환한다."""
    return list(PAGE_TYPES.values())


def resolve_sections(page_type_id: str, product_count: int) -> list[str]:
    """페이지 타입과 상품 수에 따라 섹션 목록을 자동 결정한다."""
    if page_type_id == "product_detail":
        return [
            "hero_banner",
            "feature_badges",
            "description",
            "feature_point",
            "feature_point",
            "feature_point",
        ]

    if page_type_id == "promotion":
        if product_count >= 3 and product_count % 3 == 0:
            trio_count = product_count // 3
            return ["fit_hero", "fit_event_info"] + ["fit_product_trio"] * trio_count
        else:
            return ["promo_hero"] + ["product_card"] * product_count

    # VIP 스페셜위크
    if page_type_id == "vip_special":
        return ["vip_special_hero"] + ["product_card"] * product_count

    # VIP 프라이빗위크
    if page_type_id == "vip_private":
        return ["vip_private_hero"] + ["product_card"] * product_count

    # 고메트립
    if page_type_id == "gourmet":
        return ["gourmet_hero"] + ["product_card"] * product_count

    # 뱅드신세계
    if page_type_id == "shinsegae":
        return ["shinsegae_hero"] + ["product_card"] * product_count

    raise ValueError(f"알 수 없는 페이지 타입: {page_type_id}")
