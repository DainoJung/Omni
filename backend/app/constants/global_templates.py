"""Global template style definitions for SaaS PDP generator.

5 template styles expressed through CSS Custom Properties applied to 6 base section templates.
"""

TEMPLATE_STYLES: dict[str, dict] = {
    "clean_minimal": {
        "id": "clean_minimal",
        "name": "Clean Minimal",
        "name_ko": "클린 미니멀",
        "description": "White space focused, typography-driven, elegant simplicity",
        "description_ko": "화이트 스페이스 중심, 타이포그래피 기반, 우아한 심플함",
        "preview_colors": ["#FFFFFF", "#111111", "#666666"],
        "css_variables": {
            "--accent-color": "#111111",
            "--accent-color-light": "#F5F5F5",
            "--bg-color": "#FFFFFF",
            "--bg-color-alt": "#FAFAFA",
            "--text-color": "#111111",
            "--text-color-sub": "rgba(0,0,0,0.6)",
            "--font-heading": "'Montserrat', 'Noto Sans KR', sans-serif",
            "--font-body": "'Noto Sans KR', sans-serif",
            "--border-radius": "4px",
        },
        "image_prompts": {
            "hero": "Minimalist product photography, clean white background, studio lighting, elegant composition, no text",
            "section": "Clean minimal product lifestyle, soft natural light, white space, simple composition, no text",
        },
        "copy_keywords": {
            "ko": ["프리미엄", "엄선된", "깔끔한", "본질에 집중"],
            "en": ["premium", "curated", "refined", "essential"],
        },
        "section_composition": [
            "global_hero", "global_feature_grid", "global_description",
            "global_product_showcase", "global_gallery", "global_cta",
        ],
    },
    "premium_luxury": {
        "id": "premium_luxury",
        "name": "Premium Luxury",
        "name_ko": "프리미엄 럭셔리",
        "description": "Dark tones, gold accents, high-end magazine feel",
        "description_ko": "다크 톤, 골드 악센트, 하이엔드 매거진 느낌",
        "preview_colors": ["#1A1A2E", "#C9A84C", "#E8E0D0"],
        "css_variables": {
            "--accent-color": "#C9A84C",
            "--accent-color-light": "#2A2A3E",
            "--bg-color": "#1A1A2E",
            "--bg-color-alt": "#0F0F1A",
            "--text-color": "#E8E0D0",
            "--text-color-sub": "rgba(232,224,208,0.7)",
            "--font-heading": "'Playfair Display', 'Noto Serif KR', serif",
            "--font-body": "'Noto Sans KR', sans-serif",
            "--border-radius": "0px",
        },
        "image_prompts": {
            "hero": "Luxury product editorial photography, dark moody background, dramatic lighting, gold highlights, premium feel, no text",
            "section": "High-end lifestyle product shot, dark elegant setting, warm accent lighting, luxury magazine quality, no text",
        },
        "copy_keywords": {
            "ko": ["럭셔리", "프리미엄", "한정", "익스클루시브"],
            "en": ["luxury", "exclusive", "limited", "premium"],
        },
        "section_composition": [
            "global_hero", "global_feature_grid", "global_description",
            "global_product_showcase", "global_gallery", "global_cta",
        ],
    },
    "bold_casual": {
        "id": "bold_casual",
        "name": "Bold Casual",
        "name_ko": "볼드 캐주얼",
        "description": "Vivid colors, playful energy, youth-oriented",
        "description_ko": "비비드 컬러, 플레이풀 에너지, 영 타겟",
        "preview_colors": ["#FF6B35", "#004E89", "#FCFCFC"],
        "css_variables": {
            "--accent-color": "#FF6B35",
            "--accent-color-light": "#FFF0EB",
            "--bg-color": "#FCFCFC",
            "--bg-color-alt": "#F0F4FF",
            "--text-color": "#1A1A2E",
            "--text-color-sub": "rgba(26,26,46,0.65)",
            "--font-heading": "'Bebas Neue', 'Noto Sans KR', sans-serif",
            "--font-body": "'Noto Sans KR', sans-serif",
            "--border-radius": "12px",
        },
        "image_prompts": {
            "hero": "Vibrant product photography, bold colorful background, energetic composition, pop art influence, no text",
            "section": "Dynamic lifestyle product shot, vivid colors, casual urban setting, youthful energy, no text",
        },
        "copy_keywords": {
            "ko": ["트렌디", "HOT", "지금 바로", "PICK"],
            "en": ["trending", "hot", "get yours", "must-have"],
        },
        "section_composition": [
            "global_hero", "global_feature_grid", "global_description",
            "global_product_showcase", "global_gallery", "global_cta",
        ],
    },
    "tech_modern": {
        "id": "tech_modern",
        "name": "Tech Modern",
        "name_ko": "테크 모던",
        "description": "Gradients, geometric shapes, futuristic minimal",
        "description_ko": "그라디언트, 지오메트릭 쉐이프, 퓨처리스틱 미니멀",
        "preview_colors": ["#0A0F1C", "#6C63FF", "#00D2FF"],
        "css_variables": {
            "--accent-color": "#6C63FF",
            "--accent-color-light": "#1A1F3C",
            "--bg-color": "#0A0F1C",
            "--bg-color-alt": "#12182E",
            "--text-color": "#EAEAFF",
            "--text-color-sub": "rgba(234,234,255,0.65)",
            "--font-heading": "'Montserrat', 'Noto Sans KR', sans-serif",
            "--font-body": "'Noto Sans KR', sans-serif",
            "--border-radius": "8px",
        },
        "image_prompts": {
            "hero": "Tech product photography, dark gradient background, neon accent lighting, futuristic minimal, no text",
            "section": "Modern tech product, clean geometric background, subtle gradient lighting, sleek design, no text",
        },
        "copy_keywords": {
            "ko": ["혁신", "스마트", "차세대", "테크"],
            "en": ["innovative", "smart", "next-gen", "tech"],
        },
        "section_composition": [
            "global_hero", "global_feature_grid", "global_description",
            "global_product_showcase", "global_gallery", "global_cta",
        ],
    },
    "organic_natural": {
        "id": "organic_natural",
        "name": "Organic Natural",
        "name_ko": "오가닉 내추럴",
        "description": "Earth tones, organic shapes, warm and trustworthy",
        "description_ko": "어스 톤, 오가닉 쉐이프, 따뜻하고 신뢰감 있는",
        "preview_colors": ["#FAF6F0", "#5E8C61", "#8B6F47"],
        "css_variables": {
            "--accent-color": "#5E8C61",
            "--accent-color-light": "#EDF5EE",
            "--bg-color": "#FAF6F0",
            "--bg-color-alt": "#F0EBE3",
            "--text-color": "#2C2417",
            "--text-color-sub": "rgba(44,36,23,0.6)",
            "--font-heading": "'Libre Baskerville', 'Noto Serif KR', serif",
            "--font-body": "'Noto Sans KR', sans-serif",
            "--border-radius": "16px",
        },
        "image_prompts": {
            "hero": "Natural organic product photography, warm earth tone background, soft natural lighting, botanical elements, no text",
            "section": "Organic lifestyle product shot, natural textures, warm sunlight, eco-friendly feel, no text",
        },
        "copy_keywords": {
            "ko": ["자연 그대로", "유기농", "건강한", "순수한"],
            "en": ["natural", "organic", "pure", "wholesome"],
        },
        "section_composition": [
            "global_hero", "global_feature_grid", "global_description",
            "global_product_showcase", "global_gallery", "global_cta",
        ],
    },
}


def get_template_style(style_id: str) -> dict:
    """Get template style by ID. Defaults to clean_minimal."""
    return TEMPLATE_STYLES.get(style_id, TEMPLATE_STYLES["clean_minimal"])


def list_template_styles() -> list[dict]:
    """List all available template styles."""
    return list(TEMPLATE_STYLES.values())
