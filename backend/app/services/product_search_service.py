"""Product search service: Gemini + Google Search grounding

상품 정보(이름, 가격, 브랜드 등)는 Gemini가 담당한다.
URL 입력 시 이미지는 실제 URL에서 스크래핑, 실패 시 Google CSE 폴백.
상품명 검색 시 이미지는 Google CSE에서 가져온다.
"""

import json
import logging
import re

from google import genai
from google.genai import types

from app.config import settings
from app.services.product_scraper import (
    ScrapedProduct, scrape_images_from_url, scrape_product, clean_image_url,
)
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
        cse_images = [clean_image_url(url) for url in cse_images]
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
    """URL의 상품 정보를 가져온다.

    폴백 체인:
    1. Gemini + Google Search로 상품 정보 검색
    2. 실패 시 scrape_product()로 HTML 직접 스크래핑
    3. 둘 다 실패 시 URL에서 상품명 추론 → Gemini knowledge 폴백
    4. 이미지: URL에서 직접 스크래핑 → 부족하면 Google CSE 보충
    """
    product = await _gemini_search_url(url, language)

    # 폴백 1: HTML 직접 스크래핑
    if not product or not product.name:
        logger.info(f"Gemini 실패, HTML 스크래핑 폴백: {url}")
        try:
            product = await scrape_product(url)
            if product and product.name:
                logger.info(f"HTML 스크래핑 성공: {product.name}")
        except Exception as e:
            logger.warning(f"HTML 스크래핑도 실패: {e}")
            product = None

    # 폴백 2: URL에서 상품명 추론 → Gemini knowledge로 검색
    if not product or not product.name:
        inferred = _infer_product_name_from_url(url)
        if inferred:
            logger.info(f"URL에서 상품명 추론: '{inferred}', Gemini knowledge 폴백")
            product = await _search_with_gemini_knowledge(inferred, language)
            product.url = url
        else:
            product = ScrapedProduct(name="", url=url, platform="unknown")

    # 실제 URL에서 이미지 스크래핑 (사용자가 선택할 수 있도록 최대한 많이)
    scraped_images = await scrape_images_from_url(url)
    if scraped_images:
        product.images = scraped_images
        logger.info(f"URL 이미지 스크래핑: {len(scraped_images)}장")

    # 스크래핑 결과가 부족하면(3개 미만) Google CSE로 보충
    if len(product.images) < 3 and product.name:
        logger.info(f"이미지 부족({len(product.images)}장), Google CSE로 보충")
        cse_images = await _fetch_product_images(product, language)
        existing = set(product.images)
        for img in cse_images:
            if img not in existing:
                product.images.append(img)
                existing.add(img)

    return product


def _infer_product_name_from_url(url: str) -> str:
    """URL 경로에서 상품명을 추론한다.

    예: https://smartstore.naver.com/desianghyun/products/8782224683
    → 'desianghyun' (스토어명이라도 추출)

    예: https://www.nike.com/kr/t/air-force-1-07-shoes-NMmm1B
    → 'nike air force 1 07 shoes'
    """
    from urllib.parse import urlparse, unquote

    parsed = urlparse(url)
    path = unquote(parsed.path).strip("/")
    host = parsed.hostname or ""

    if not path:
        return ""

    segments = [s for s in path.split("/") if s]

    # 네이버 스마트스토어: /storename/products/id → 스토어명 + "상품"
    if "smartstore.naver.com" in host and len(segments) >= 1:
        store_name = segments[0]
        return f"{store_name} 상품"

    # 일반: 경로에서 상품명 추출 (숫자/ID 제거, 하이픈→공백)
    # 마지막 의미 있는 세그먼트를 찾는다
    for seg in reversed(segments):
        # 순수 숫자나 짧은 ID는 건너뜀
        if re.match(r'^[\d]+$', seg) or len(seg) < 3:
            continue
        # 'products', 'items', 'dp', 't' 같은 경로 키워드 건너뜀
        if seg.lower() in ("products", "product", "items", "item", "dp", "t", "p", "gp"):
            continue
        # 하이픈/언더스코어를 공백으로 변환
        name = re.sub(r'[-_]+', ' ', seg)
        # 끝의 해시코드 제거 (예: shoes-NMmm1B → shoes)
        name = re.sub(r'\s+[A-Za-z0-9]{5,8}$', '', name)
        # 브랜드명 추가 (도메인에서)
        brand = _extract_brand_from_host(host)
        if brand and brand.lower() not in name.lower():
            name = f"{brand} {name}"
        return name.strip()

    return ""


def _extract_brand_from_host(host: str) -> str:
    """호스트에서 브랜드명 추출."""
    host = host.lower().replace("www.", "")
    # 주요 도메인 매핑
    brand_map = {
        "nike.com": "Nike",
        "adidas.com": "Adidas",
        "apple.com": "Apple",
        "samsung.com": "Samsung",
        "coupang.com": "Coupang",
        "musinsa.com": "Musinsa",
        "29cm.co.kr": "29CM",
        "uniqlo.com": "Uniqlo",
        "zara.com": "Zara",
    }
    for domain, brand in brand_map.items():
        if domain in host:
            return brand
    return ""


async def _gemini_search_url(url: str, language: str) -> ScrapedProduct | None:
    """Gemini UrlContext + Google Search로 URL 상품 정보를 가져온다.

    UrlContext: Google 인프라가 직접 URL을 fetch하여 페이지 내용을 읽음.
    GoogleSearch: 페이지에서 부족한 정보를 웹 검색으로 보충.
    """
    lang_label = "한국어" if language == "ko" else "English"

    prompt = f"""Read the product page at this URL and extract product information: {url}

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
- Read the ACTUAL page content at the URL above.
- If some details are missing from the page, search the web to supplement.
- Do NOT include image URLs — images will be fetched separately.
- Return ONLY valid JSON."""

    try:
        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[
                    types.Tool(url_context=types.UrlContext()),
                    types.Tool(google_search=types.GoogleSearch()),
                ],
                max_output_tokens=4096,
                temperature=0.3,
            ),
        )

        # URL fetch 상태 로깅
        if response.candidates and response.candidates[0].url_context_metadata:
            for m in response.candidates[0].url_context_metadata.url_metadata:
                logger.info(f"UrlContext: {m.retrieved_url} → {m.url_retrieval_status}")

        if not response.text:
            logger.warning("Gemini response.text is None")
            return None

        raw = _strip_markdown_fences(response.text)

        match = re.search(r'(\{.*\})', raw, re.DOTALL)
        if match:
            raw = match.group(1)

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
        logger.info(f"Gemini URL 검색 성공: {product.name}")
        return product

    except Exception as e:
        logger.warning(f"Gemini URL 검색 실패: {e}")
        return None


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

        if not response.text:
            logger.warning("Grounding: response.text is None")
            return None

        raw = _strip_markdown_fences(response.text)

        match = re.search(r'(\{.*\})', raw, re.DOTALL)
        if match:
            raw = match.group(1)

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
                max_output_tokens=2048,
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )

        if not response.text:
            raise ValueError("Gemini knowledge response.text is None")

        raw = response.text.strip()

        match = re.search(r'(\{.*\})', raw, re.DOTALL)
        if match:
            raw = match.group(1)
            
        data = json.loads(raw)
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
