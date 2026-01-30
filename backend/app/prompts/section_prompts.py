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
- Create a wide, cinematic composition featuring the product(s)
- Strong visual impact with elegant styling
- Leave LARGE clear areas for text overlay:
  - Center or left-aligned area for main headline (large text)
  - Sub-area for supporting copy
  - Bottom strip for details/CTA
- DO NOT include any text, letters, numbers, or watermarks in the image
- Style: dramatic, luxurious, editorial photography feel
- Wide aspect ratio composition (16:9)
- At least 40% of image area should be clean space for text overlay

Product context: {product_info}
Brand: {brand_name}
""",

    "single_feature": """Create a premium department store product promotional layout image.
This is a SINGLE PRODUCT FEATURE layout for a luxury Korean department store (Shinsegae style).

Section context: {section_context}

Requirements:
- Place the provided product image prominently in the center or slightly off-center
- Create an elegant, premium background that complements the product
- Leave clear EMPTY SPACE areas for text overlay (top area for headline, bottom for price/details)
- DO NOT include any text, letters, numbers, or watermarks in the image
- Style: clean, luxurious, minimal, high-end retail aesthetic
- Color palette: sophisticated, muted tones with subtle gradients
- Aspect ratio: 3:4 (portrait)
- Ensure at least 30% of the image area is clean space suitable for text placement

Product context: {product_info}
Brand: {brand_name}
""",

    "product_grid": """Create a premium department store promotional layout image featuring multiple products.
This is a PRODUCT GRID layout for a luxury Korean department store (Shinsegae style).

Section context: {section_context}

Requirements:
- Arrange product spaces in an elegant grid or balanced layout
- Create a cohesive, premium background connecting all product areas
- Leave clear EMPTY SPACE areas for text overlay:
  - Top area for brand/headline text
  - Near each product for product name and price
  - Bottom area for additional information
- DO NOT include any text, letters, numbers, or watermarks
- Style: clean, luxurious, balanced composition, high-end retail aesthetic
- Aspect ratio: 4:3 (landscape)
- Ensure harmonious visual flow between product areas
- At least 25% of image area should be clean space for text

Product context: {product_info}
Brand: {brand_name}
""",

    "detail_info": """Create a premium department store product detail information layout image.
This is a DETAIL INFO section for a luxury Korean department store (Shinsegae style).

Section context: {section_context}

Requirements:
- Show the product from a detailed angle or close-up view
- Create elegant space for detailed product information
- Leave MULTIPLE clear areas for text overlay:
  - Title area for product name
  - Multiple smaller areas for specifications, materials, features
  - Description area for longer text
- DO NOT include any text, letters, numbers, or watermarks
- Style: informative yet luxurious, editorial product photography
- Aspect ratio: 3:4 (portrait)
- At least 35% of image area should be clean space for text placement

Product context: {product_info}
Brand: {brand_name}
""",

    "cta_footer": """Create a premium department store call-to-action footer layout image.
This is a CTA FOOTER section for a luxury Korean department store (Shinsegae style).

Section context: {section_context}

Requirements:
- Create a visually compelling footer that encourages action
- Elegant, brand-consistent design with warm, inviting feel
- Leave clear areas for text overlay:
  - Central area for call-to-action message
  - Sub-area for store/brand information
  - Optional area for promotional details
- DO NOT include any text, letters, numbers, or watermarks
- Style: warm, inviting, premium retail aesthetic with strong visual closure
- Wide aspect ratio (16:9)
- At least 50% of image area should be clean space for text

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
