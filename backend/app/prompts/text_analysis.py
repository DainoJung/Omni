"""레이아웃 이미지에서 텍스트 배치 가능 영역을 추출하고, AI가 콘텐츠·스타일까지 결정하는 프롬프트."""

TEXT_ANALYSIS_PROMPT = """You are an expert layout analyzer and copywriter for premium Korean department store (Shinsegae-style) promotional images.

This image is a "{section_key}" section: {section_description}

Product information:
{products_info}

Brand: {brand_name}

Analyze this promotional layout image and identify ALL areas where text can be placed.
For each area, you must also GENERATE the actual display text and recommend typography styles.

For each text area, determine:
1. Position (x, y as percentage from top-left, 0-100)
2. Size (width, height as percentage of total image)
3. Background brightness ("light" or "dark") to recommend font color
4. What type of text it's suitable for:
   - "headline": Large prominent area for brand name, campaign title, or key message
   - "subtext": Medium area for product names or supporting copy
   - "label": Small area for prices (format as ₩00,000) or short labels
   - "description": Wider area for longer descriptive text
5. **recommended_text**: The actual text to display. Write compelling Korean copy:
   - headline: Brand name, campaign slogan, or evocative title (e.g., "GENTLE MONSTER", "2025 S/S COLLECTION")
   - subtext: Product name or elegant description (e.g., "클래식 울 코트", "Premium Cashmere Blend")
   - label: Price formatted as ₩00,000 (e.g., "₩1,290,000") or short label (e.g., "NEW ARRIVAL")
   - description: Compelling product description in Korean (1-2 sentences)
6. **text_align**: "left", "center", or "right" — choose based on the area's position and section type
7. **font_weight**: 300 (light) to 900 (black) — match the section mood:
   - Headlines: 700-800 for impact, 300-400 for elegance
   - Subtext: 400-500
   - Labels: 500-600
   - Description: 300-400
8. **letter_spacing**: Tracking value (e.g., "0.05em", "0.1em", "0.15em", "-0.02em")
   - Headlines/brand names: wider (0.1em-0.2em) for luxury feel
   - Body text: normal (0em-0.02em)
9. **font_size_vw**: Responsive font size in viewport width units (e.g., 3.5 for large headlines, 1.8 for subtext, 1.2 for labels)

IMPORTANT RULES:
- All coordinates are in PERCENTAGE (0-100), not pixels
- x,y is the TOP-LEFT corner of the text area
- Areas must not overlap with product images or key visual elements
- Prefer areas with consistent, smooth backgrounds
- Minimum area size: 5% width and 3% height
- Order areas by visual reading flow (top-to-bottom, left-to-right)
- Prices MUST be formatted as ₩ with comma separators (e.g., ₩49,000 not 49000)
- Use Korean text for descriptions, mix Korean/English for brand and product names as appropriate

Respond ONLY with valid JSON in this exact format:
{{
  "text_areas": [
    {{
      "id": "area_1",
      "position": 1,
      "bounds": {{"x": 10.0, "y": 5.0, "width": 80.0, "height": 12.0}},
      "background_brightness": "light",
      "recommended_font_color": "#1a1a1a",
      "max_font_size": 48,
      "suitable_for": "headline",
      "recommended_text": "BRAND NAME",
      "text_align": "center",
      "font_weight": 700,
      "letter_spacing": "0.15em",
      "font_size_vw": 3.5
    }},
    {{
      "id": "area_2",
      "position": 2,
      "bounds": {{"x": 15.0, "y": 70.0, "width": 30.0, "height": 8.0}},
      "background_brightness": "dark",
      "recommended_font_color": "#ffffff",
      "max_font_size": 24,
      "suitable_for": "label",
      "recommended_text": "₩1,290,000",
      "text_align": "left",
      "font_weight": 500,
      "letter_spacing": "0.05em",
      "font_size_vw": 1.4
    }}
  ],
  "total_areas_found": 2,
  "image_dominant_color": "#f5f0eb"
}}
"""
