"""멀티 섹션 페이지 구조 기획 및 섹션별 레이아웃 이미지 생성 프롬프트."""

PAGE_STRUCTURE_PLANNING_PROMPT = """You are a premium department store page layout planner.
Given the product information below, plan a multi-section promotional page structure.

Available section types:
- hero_banner: Wide cinematic banner for brand impact (aspect ratio 16:9). Best for brand introduction and main visual.
- single_feature: Single product showcase (aspect ratio 3:4). Best for highlighting one premium product.
- product_grid: Multi-product grid layout (aspect ratio 4:3). Best for showing 2-3 products together.
- detail_info: Product detail information section (aspect ratio 3:4). Best for specifications, features, materials.
- cta_footer: Call-to-action footer (aspect ratio 16:9). Best for purchase encouragement, store info, promotions.

Rules:
- Always start with hero_banner as the first section
- Always end with cta_footer as the last section
- Use 3-5 sections total depending on product count
- Each product should appear in at least one section
- product_indices are 0-based indices into the products array

Input:
- Product count: {product_count}
- Brand name: {brand_name}
- Category: {category}
- Products: {products_summary}

Respond ONLY with valid JSON:
{{
  "sections": [
    {{
      "section_key": "hero_banner",
      "title": "Section title for internal reference",
      "description": "Brief description of what this section should convey",
      "product_indices": [0],
      "order": 0
    }}
  ]
}}
"""

SECTION_PROMPTS = {
    "hero_banner": """Create a premium department store hero banner layout image.
This is a HERO BANNER layout for a luxury Korean department store (Shinsegae style).

Section context: {section_context}

Requirements:
- Create a wide, cinematic full-bleed composition featuring the product(s)
- Strong visual impact with dramatic, editorial photography feel
- The product should be the hero — place it boldly with natural breathing room around it
- Use elegant negative space that naturally frames the product without feeling empty
- Composition should feel like a high-end fashion magazine spread
- DO NOT include any text, letters, numbers, or watermarks in the image
- Wide aspect ratio composition (16:9)
- Color palette: sophisticated tones that complement the product

Product context: {product_info}
Brand: {brand_name}
""",

    "single_feature": """Create a premium department store product promotional layout image.
This is a SINGLE PRODUCT FEATURE layout for a luxury Korean department store (Shinsegae style).

Section context: {section_context}

Requirements:
- Place the product prominently — it is the star of this composition
- Create an elegant, premium background that naturally complements the product
- Use balanced composition with the product slightly off-center for visual interest
- Natural negative space should flow around the product organically
- DO NOT include any text, letters, numbers, or watermarks in the image
- Style: clean, luxurious, minimal, high-end retail aesthetic
- Color palette: sophisticated, muted tones with subtle gradients
- Aspect ratio: 3:4 (portrait)

Product context: {product_info}
Brand: {brand_name}
""",

    "product_grid": """Create a premium department store promotional layout image featuring multiple products.
This is a PRODUCT GRID layout for a luxury Korean department store (Shinsegae style).

Section context: {section_context}

Requirements:
- Arrange products in an elegant, balanced layout with natural spacing between them
- Create a cohesive, premium background that connects all product areas harmoniously
- Products should feel curated — like a carefully styled editorial flat-lay or display
- Allow natural breathing room between and around products
- DO NOT include any text, letters, numbers, or watermarks
- Style: clean, luxurious, balanced composition, high-end retail aesthetic
- Aspect ratio: 4:3 (landscape)
- Ensure harmonious visual flow between product areas

Product context: {product_info}
Brand: {brand_name}
""",

    "detail_info": """Create a premium department store product detail information layout image.
This is a DETAIL INFO section for a luxury Korean department store (Shinsegae style).

Section context: {section_context}

Requirements:
- Show the product from a detailed angle or close-up view highlighting craftsmanship
- Create an editorial-style composition that draws attention to product details
- Use natural composition with the product positioned to allow informational space nearby
- Background should be clean and premium, complementing the product's materials and colors
- DO NOT include any text, letters, numbers, or watermarks
- Style: informative yet luxurious, editorial product photography
- Aspect ratio: 3:4 (portrait)

Product context: {product_info}
Brand: {brand_name}
""",

    "cta_footer": """Create a premium department store call-to-action footer layout image.
This is a CTA FOOTER section for a luxury Korean department store (Shinsegae style).

Section context: {section_context}

Requirements:
- Create a visually compelling footer with an elegant, brand-consistent aesthetic
- Warm, inviting atmosphere that feels like the closing note of a luxury catalog
- Use soft, sophisticated background with gentle gradients or textures
- Composition should feel open and welcoming — like an invitation
- DO NOT include any text, letters, numbers, or watermarks
- Style: warm, inviting, premium retail aesthetic with strong visual closure
- Wide aspect ratio (16:9)

Product context: {product_info}
Brand: {brand_name}
""",
}


SECTION_METADATA = {
    "hero_banner": {
        "recommended_products": (1, 3),
        "aspect_ratio": "16:9",
        "description": "히어로 배너 레이아웃",
    },
    "single_feature": {
        "recommended_products": 1,
        "aspect_ratio": "3:4",
        "description": "단일 상품 피처 레이아웃",
    },
    "product_grid": {
        "recommended_products": (2, 3),
        "aspect_ratio": "4:3",
        "description": "상품 그리드 레이아웃",
    },
    "detail_info": {
        "recommended_products": 1,
        "aspect_ratio": "3:4",
        "description": "상품 상세 정보 레이아웃",
    },
    "cta_footer": {
        "recommended_products": (0, 3),
        "aspect_ratio": "16:9",
        "description": "CTA 푸터 레이아웃",
    },
}
