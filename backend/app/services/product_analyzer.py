"""Product analyzer: AI-powered product analysis using Gemini"""

import json
import logging
import re

from google import genai
from google.genai import types

from app.config import settings
from app.services.product_search_service import _strip_markdown_fences

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)


class AnalysisResult:
    """Product analysis result"""

    def __init__(
        self,
        category: str = "",
        subcategory: str = "",
        usp_points: list[str] | None = None,
        target_customer: str = "",
        tone: str = "",
        recommended_template_style: str = "clean_minimal",
        color_palette: list[str] | None = None,
        summary: str = "",
    ):
        self.category = category
        self.subcategory = subcategory
        self.usp_points = usp_points or []
        self.target_customer = target_customer
        self.tone = tone
        self.recommended_template_style = recommended_template_style
        self.color_palette = color_palette or []
        self.summary = summary

    def to_dict(self) -> dict:
        return {
            "category": self.category,
            "subcategory": self.subcategory,
            "usp_points": self.usp_points,
            "target_customer": self.target_customer,
            "tone": self.tone,
            "recommended_template_style": self.recommended_template_style,
            "color_palette": self.color_palette,
            "summary": self.summary,
        }


def _extract_json_from_text(text: str) -> str:
    """Extract json cleanly from AI response, ignoring conversational prefixes."""
    text = _strip_markdown_fences(text)
    # try to find the start of a JSON block
    match = re.search(r'(\{.*\})', text, re.DOTALL)
    if match:
        return match.group(1)
    return text


async def analyze_product(
    product_data: dict,
    language: str = "ko",
) -> AnalysisResult:
    """Analyze product data using Gemini to determine category, USPs, and recommended template style.

    Args:
        product_data: Scraped or manually entered product data
        language: Target language for analysis (ko, en)

    Returns:
        AnalysisResult with category, USP points, recommended template, etc.
    """
    name = product_data.get("name", "")
    description = product_data.get("description", "")
    brand = product_data.get("brand", "")
    price = product_data.get("price", "")
    category_hint = product_data.get("category", "")

    lang_instruction = "한국어로 작성하세요." if language == "ko" else "Write in English."

    prompt = f"""Analyze this product and provide structured information for creating a product detail page.

Product Name: {name}
Description: {description}
Brand: {brand}
Price: {price}
Category Hint: {category_hint}

{lang_instruction}

Return a JSON object with exactly these fields:
{{
  "category": "Main category (e.g., fashion, electronics, food, beauty, home, sports)",
  "subcategory": "Specific subcategory (e.g., luxury_handbag, smartphone, organic_food)",
  "usp_points": ["USP 1", "USP 2", "USP 3"],
  "target_customer": "Brief target customer description",
  "tone": "Recommended copy tone (e.g., premium, playful, professional, warm, modern)",
  "recommended_template_style": "One of: clean_minimal, premium_luxury, bold_casual, tech_modern, organic_natural",
  "color_palette": ["#hex1", "#hex2", "#hex3"],
  "summary": "One-line product summary for the page"
}}

Template style guide:
- premium_luxury: Luxury/high-end fashion, jewelry, premium brands → dark tones, gold accents
- tech_modern: Electronics, gadgets, tech products → gradients, geometric shapes
- organic_natural: Food, organic, health, beauty → earth tones, natural shapes
- bold_casual: Youth/casual fashion, sports, entertainment → vivid colors, playful
- clean_minimal: General products, home goods, professional → white space, typography focused

Return ONLY valid JSON, no explanation."""

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            response = await client.aio.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=2048,
                    temperature=0.5,
                    response_mime_type="application/json",
                ),
            )

            raw = response.text.strip()
            raw = _extract_json_from_text(raw)
            data = json.loads(raw)

            # Validate recommended_template_style
            valid_styles = {"clean_minimal", "premium_luxury", "bold_casual", "tech_modern", "organic_natural"}
            style = data.get("recommended_template_style", "clean_minimal")
            if style not in valid_styles:
                style = "clean_minimal"

            result = AnalysisResult(
                category=data.get("category", ""),
                subcategory=data.get("subcategory", ""),
                usp_points=data.get("usp_points", []),
                target_customer=data.get("target_customer", ""),
                tone=data.get("tone", ""),
                recommended_template_style=style,
                color_palette=data.get("color_palette", []),
                summary=data.get("summary", ""),
            )

            logger.info(f"Product analysis complete: {result.category}/{result.subcategory} → {result.recommended_template_style}")
            return result

        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Analysis JSON parse error (attempt {attempt + 1}): {e}\nRaw output: {raw}")
            if attempt == max_retries:
                # Return safe defaults
                return AnalysisResult(
                    category="general",
                    subcategory="product",
                    usp_points=[name] if name else [],
                    target_customer="general consumer",
                    tone="professional",
                    recommended_template_style="clean_minimal",
                    summary=name,
                )
        except Exception as e:
            logger.warning(f"Analysis error (attempt {attempt + 1}): {e}")
            if attempt == max_retries:
                return AnalysisResult(
                    category="general",
                    recommended_template_style="clean_minimal",
                    summary=name,
                )

    # Should not reach here, but just in case
    return AnalysisResult(category="general", recommended_template_style="clean_minimal")
