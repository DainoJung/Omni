"""Product search service: Gemini + Google Search grounding + Google CSE images

이미지는 Gemini가 아닌 Google Custom Search API에서 가져온다.
Gemini는 상품 정보(이름, 가격, 브랜드 등)만 담당한다.
"""

import json
import logging

from google import genai
from google.genai import types

from app.config import settings
from app.services.product_scraper import ScrapedProduct
from app.services.google_image_search import search_product_images

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)


def _strip_markdown_fences(text: str) -> str:
    """Strip markdown code fences from Gemini response."""
    raw = text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()
    return raw


async def _fetch_product_images(product: ScrapedProduct, language: str) -> list[str]:
    """Google CSE로 상품 이미지를 검색한다."""
    search_query = f"{product.brand} {product.name}" if product.brand else product.name
    cse_images = await search_product_images(search_query, num=5, language=language)
    if cse_images:
        logger.info(f"Google CSE 이미지: '{search_query}' → {len(cse_images)}장")
    return cse_images[:5]


async def search_product_by_name(
    name: str,
    language: str = "ko",
) -> ScrapedProduct:
    """상품명으로 Gemini + Google Search로 검색하여 상품 정보를 가져온다.

    이미지는 Google CSE에서 별도로 가져온다.
    """
    product = await _search_with_grounding(name, language)
    if not product or not product.name:
        logger.info("Google Search grounding failed, falling back to Gemini knowledge")
        product = await _search_with_gemini_knowledge(name, language)

    # Google CSE로 상품 이미지 검색
    if product.name:
        product.images = await _fetch_product_images(product, language)

    return product


async def search_product_by_url(
    url: str,
    language: str = "ko",
) -> ScrapedProduct:
    """URL의 상품 정보를 Gemini + Google Search로 검색한다.

    HTML 스크래핑 대신 Gemini가 Google Search로 해당 URL의 상품을 검색.
    이미지는 Gemini가 아닌 Google CSE에서 별도로 가져온다.
    """
    lang_label = "한국어" if language == "ko" else "English"

    prompt = f"""Find the product sold at this URL: {url}

Search the web and provide detailed product information.

Respond in {lang_label} with a JSON object:
{{
  "name": "Full official product name",
  "description": "Product description (max 300 chars)",
  "brand": "Brand name",
  "price": "Price with currency symbol (e.g., '$999', '€499', '₩39,000')",
  "currency": "ISO 4217 currency code (USD, EUR, KRW, etc.)",
  "category": "Product category",
  "platform": "Source (coupang, amazon, naver, etc.)"
}}

IMPORTANT:
- Find the EXACT product at this URL, not similar products.
- Do NOT include image URLs — images will be fetched separately.
- Return ONLY valid JSON."""

    try:
        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                max_output_tokens=2048,
                temperature=0.3,
            ),
        )

        raw = _strip_markdown_fences(response.text)
        data = json.loads(raw)

        product = ScrapedProduct(
            name=data.get("name", ""),
            description=data.get("description", "")[:500],
            brand=data.get("brand", ""),
            price=str(data.get("price", "")),
            currency=data.get("currency", ""),
            category=data.get("category", ""),
            images=[],
            url=url,
            platform=data.get("platform", "search"),
        )
        logger.info(f"Search by URL: {product.name}")

    except Exception as e:
        logger.warning(f"Search by URL failed: {e}")
        product = ScrapedProduct(name="", url=url, platform="unknown")

    # Google CSE로 상품 이미지 검색 (Gemini 이미지 대신)
    if product.name:
        product.images = await _fetch_product_images(product, language)

    return product


async def _search_with_grounding(name: str, language: str) -> ScrapedProduct | None:
    """Use Gemini + Google Search to find real-time product info."""
    lang_label = "한국어" if language == "ko" else "English"

    prompt = f"""Search for the product "{name}" and provide detailed information.

Respond in {lang_label} with a JSON object:
{{
  "name": "Full official product name",
  "description": "Product description (max 300 chars)",
  "brand": "Brand name",
  "price": "Price with currency symbol (e.g., '$999', '€499', '₩39,000')",
  "currency": "ISO 4217 currency code (USD, EUR, KRW, etc.). Only return what you actually find.",
  "category": "Product category",
  "url": "Official product page URL if found",
  "platform": "Source (official, amazon, coupang, etc.)"
}}

IMPORTANT:
- Do NOT include image URLs — images will be fetched separately.
- Return ONLY valid JSON, no markdown, no explanation."""

    try:
        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                max_output_tokens=2048,
                temperature=0.3,
            ),
        )

        raw = _strip_markdown_fences(response.text)
        data = json.loads(raw)

        product = ScrapedProduct(
            name=data.get("name", name),
            description=data.get("description", "")[:500],
            brand=data.get("brand", ""),
            price=str(data.get("price", "")),
            currency=data.get("currency", ""),
            category=data.get("category", ""),
            images=[],
            url=data.get("url", ""),
            platform=data.get("platform", "search"),
        )
        logger.info(f"Search with grounding: {product.name}")
        return product

    except json.JSONDecodeError as e:
        logger.warning(f"Search grounding JSON parse error: {e}")
        return None
    except Exception as e:
        logger.warning(f"Search grounding failed: {e}")
        return None


async def _search_with_gemini_knowledge(name: str, language: str) -> ScrapedProduct:
    """Fall back to Gemini's training knowledge for product info."""
    lang_instruction = "한국어로 작성하세요." if language == "ko" else "Write in English."

    prompt = f"""You are a product information expert. Provide detailed information about: "{name}"

{lang_instruction}

Return a JSON object:
{{
  "name": "Full official product name",
  "description": "Product description (max 300 chars)",
  "brand": "Brand name",
  "price": "Price with currency symbol (e.g., '$999', '€499', '¥39,800')",
  "currency": "ISO 4217 currency code based on the product's actual market. If unsure, return empty string.",
  "category": "Product category"
}}

Return ONLY valid JSON."""

    try:
        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=1024,
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )

        data = json.loads(response.text.strip())
        product = ScrapedProduct(
            name=data.get("name", name),
            description=data.get("description", "")[:500],
            brand=data.get("brand", ""),
            price=str(data.get("price", "")),
            currency=data.get("currency", ""),
            category=data.get("category", ""),
            images=[],
            url="",
            platform="ai_knowledge",
        )
        logger.info(f"Search with Gemini knowledge: {product.name}")
        return product

    except Exception as e:
        logger.warning(f"Gemini knowledge fallback failed: {e}")
        return ScrapedProduct(
            name=name,
            description="",
            platform="manual",
        )
