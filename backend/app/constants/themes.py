"""v5.2 테마 상수 정의 (5종) - accent_color 추가"""

THEMES: dict[str, dict] = {
    "holiday": {
        "id": "holiday",
        "name": "홀리데이",
        "icon": "🎄",
        "accent_color": "#C41E3A",
        "background_prompt": (
            "홀리데이 프로모션 배경, 크리스마스 트리, 따뜻한 조명, "
            "축제 분위기, 고급스러운 골드 포인트, 텍스트 없이"
        ),
        "copy_keywords": ["특별한", "선물", "홀리데이", "시즌"],
    },
    "spring_sale": {
        "id": "spring_sale",
        "name": "봄 세일",
        "icon": "🌸",
        "accent_color": "#E91E90",
        "background_prompt": (
            "봄 세일 배경, 벚꽃, 파스텔톤, 산뜻한 느낌, "
            "부드러운 그라데이션, 텍스트 없이"
        ),
        "copy_keywords": ["새로운", "산뜻한", "봄", "시작"],
    },
    "summer_special": {
        "id": "summer_special",
        "name": "여름 특가",
        "icon": "☀️",
        "accent_color": "#0099FF",
        "background_prompt": (
            "여름 특가 배경, 시원한 블루톤, 청량감, "
            "트로피컬 느낌, 밝고 활기찬, 텍스트 없이"
        ),
        "copy_keywords": ["시원한", "특별한", "여름", "할인"],
    },
    "autumn_new": {
        "id": "autumn_new",
        "name": "가을 신상",
        "icon": "🍂",
        "accent_color": "#D2691E",
        "background_prompt": (
            "가을 신상 배경, 따뜻한 브라운톤, 단풍, "
            "고급스러운 분위기, 우아한, 텍스트 없이"
        ),
        "copy_keywords": ["새로운", "트렌드", "가을", "신상품"],
    },
    "winter_promo": {
        "id": "winter_promo",
        "name": "겨울 프로모션",
        "icon": "❄️",
        "accent_color": "#4169E1",
        "background_prompt": (
            "겨울 프로모션 배경, 눈꽃, 화이트 & 실버톤, "
            "고급스러운 느낌, 아늑한 분위기, 텍스트 없이"
        ),
        "copy_keywords": ["따뜻한", "특별한", "겨울", "프로모션"],
    },
}


def get_theme(theme_id: str) -> dict:
    """테마 ID로 테마 정보를 조회한다."""
    theme = THEMES.get(theme_id)
    if not theme:
        raise ValueError(f"알 수 없는 테마: {theme_id}")
    return theme


def list_themes() -> list[dict]:
    """활성 테마 목록을 반환한다."""
    return list(THEMES.values())
