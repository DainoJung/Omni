"""레이아웃 이미지에서 텍스트 배치 가능 영역을 추출하는 프롬프트."""

TEXT_ANALYSIS_PROMPT = """You are an expert layout analyzer for premium department store promotional images.

This image is a "{section_key}" section: {section_description}

Analyze this promotional layout image and identify ALL areas where text can be placed.
These are areas with clean, uncluttered backgrounds suitable for overlaying text.

For each text area, determine:
1. Position (x, y as percentage from top-left, 0-100)
2. Size (width, height as percentage of total image)
3. Background brightness ("light" or "dark") to recommend font color
4. What type of text it's suitable for:
   - "headline": Large prominent area for brand name or main title
   - "subtext": Medium area for product names or descriptions
   - "label": Small area for prices or short labels
   - "description": Wider area for longer descriptive text

IMPORTANT RULES:
- All coordinates are in PERCENTAGE (0-100), not pixels
- x,y is the TOP-LEFT corner of the text area
- Areas must not overlap with product images or key visual elements
- Prefer areas with consistent, smooth backgrounds
- Minimum area size: 5% width and 3% height
- Order areas by visual reading flow (top-to-bottom, left-to-right)

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
      "suitable_for": "headline"
    }},
    {{
      "id": "area_2",
      "position": 2,
      "bounds": {{"x": 15.0, "y": 70.0, "width": 30.0, "height": 8.0}},
      "background_brightness": "dark",
      "recommended_font_color": "#ffffff",
      "max_font_size": 24,
      "suitable_for": "subtext"
    }}
  ],
  "total_areas_found": 2,
  "image_dominant_color": "#f5f0eb"
}}
"""
