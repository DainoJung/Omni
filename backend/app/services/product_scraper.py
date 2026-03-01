"""Product scraper: Extract product data from URLs using JSON-LD, OpenGraph, and generic selectors"""

import logging
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.config import settings

logger = logging.getLogger(__name__)


class ScrapedProduct:
    """Scraped product data container"""

    def __init__(
        self,
        name: str = "",
        description: str = "",
        price: str = "",
        currency: str = "",
        brand: str = "",
        images: list[str] | None = None,
        category: str = "",
        url: str = "",
        platform: str = "generic",
    ):
        self.name = name
        self.description = description
        self.price = price
        self.currency = currency
        self.brand = brand
        self.images = images or []
        self.category = category
        self.url = url
        self.platform = platform

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "currency": self.currency,
            "brand": self.brand,
            "images": self.images,
            "category": self.category,
            "url": self.url,
            "platform": self.platform,
        }


def _detect_currency_from_price(price: str) -> str:
    """Detect currency from price string format."""
    if not price:
        return ""
    price = price.strip()
    if price.startswith("$") or "USD" in price.upper():
        return "USD"
    if price.startswith("€") or "EUR" in price.upper():
        return "EUR"
    if price.startswith("£") or "GBP" in price.upper():
        return "GBP"
    if price.startswith("¥") or "JPY" in price.upper():
        return "JPY"
    if price.startswith("₩") or "KRW" in price.upper():
        return "KRW"
    if "원" in price:
        return "KRW"
    if "円" in price:
        return "JPY"
    return ""


def _detect_platform(url: str) -> str:
    """Detect e-commerce platform from URL"""
    domain = url.lower()
    if "amazon." in domain:
        return "amazon"
    if "coupang.com" in domain:
        return "coupang"
    if "shopify" in domain or ".myshopify.com" in domain:
        return "shopify"
    if "aliexpress" in domain:
        return "aliexpress"
    return "generic"


def _extract_json_ld(soup: BeautifulSoup) -> Optional[dict]:
    """Extract Product data from JSON-LD structured data"""
    import json

    scripts = soup.find_all("script", type="application/ld+json")
    for script in scripts:
        try:
            data = json.loads(script.string or "")
            # Handle both direct Product and @graph arrays
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get("@type") == "Product":
                        return item
            elif isinstance(data, dict):
                if data.get("@type") == "Product":
                    return data
                # Check @graph
                graph = data.get("@graph", [])
                for item in graph:
                    if isinstance(item, dict) and item.get("@type") == "Product":
                        return item
        except (json.JSONDecodeError, TypeError):
            continue
    return None


def _normalize_image_url(src: str, base_url: str) -> str:
    """Normalize image URL: handle relative, protocol-relative, and absolute URLs."""
    if not src:
        return ""
    src = src.strip()
    if src.startswith("//"):
        return "https:" + src
    if src.startswith("/"):
        from urllib.parse import urlparse
        parsed = urlparse(base_url)
        return f"{parsed.scheme}://{parsed.netloc}{src}"
    if src.startswith("http"):
        return src
    return ""


def _extract_opengraph(soup: BeautifulSoup) -> dict:
    """Extract product data from OpenGraph meta tags"""
    og = {}
    og_images = []
    for meta in soup.find_all("meta", property=True):
        prop = meta.get("property", "")
        content = meta.get("content", "")
        if prop == "og:image":
            og_images.append(content)
        elif prop.startswith("og:"):
            og[prop[3:]] = content
        elif prop.startswith("product:"):
            og[prop] = content
    og["images"] = og_images
    return og


def _extract_generic(soup: BeautifulSoup, base_url: str = "") -> dict:
    """Extract product data using generic HTML selectors"""
    data = {}

    # Title
    title_selectors = [
        "h1.product-title", "h1.product-name", "h1[data-testid='product-title']",
        "#productTitle", ".product-title h1", "h1",
    ]
    for sel in title_selectors:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            data["name"] = el.get_text(strip=True)
            break

    # Price
    price_selectors = [
        "[data-testid='price']", ".price", ".product-price",
        "#priceblock_ourprice", ".a-price .a-offscreen",
        "[class*='price']",
    ]
    for sel in price_selectors:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            data["price"] = el.get_text(strip=True)
            break

    # Description
    desc_selectors = [
        ".product-description", "#productDescription", "[data-testid='description']",
        "meta[name='description']",
    ]
    for sel in desc_selectors:
        el = soup.select_one(sel)
        if el:
            if el.name == "meta":
                data["description"] = el.get("content", "")
            else:
                data["description"] = el.get_text(strip=True)[:500]
            break

    # Images — multi-strategy with URL normalization
    images = []
    seen = set()

    def _add_img(src: str):
        normalized = _normalize_image_url(src, base_url)
        if normalized and normalized not in seen:
            # 아이콘/로고/트래커 필터링
            lower = normalized.lower()
            skip_patterns = ("logo", "icon", "favicon", "pixel", "tracking", "badge", "button", "banner-ad", "1x1")
            if not any(p in lower for p in skip_patterns):
                seen.add(normalized)
                images.append(normalized)

    # Tier 1: 상품 이미지 전용 셀렉터
    img_selectors = [
        ".product-image img", "#product-images img", ".gallery img",
        "[data-testid='product-image'] img", "img[data-zoom-image]",
        ".product-gallery img", ".product-photos img",
        ".swiper-slide img", ".slick-slide img", ".carousel-item img",
        "[class*='product'] img", "[class*='gallery'] img",
        "[id*='product'] img", "[id*='gallery'] img",
    ]
    for sel in img_selectors:
        for img in soup.select(sel)[:10]:
            src = img.get("data-zoom-image") or img.get("data-large") or img.get("data-src") or img.get("data-original") or img.get("src")
            _add_img(src or "")
        if len(images) >= 5:
            break

    # Tier 2: 큰 이미지 태그 (width/height 속성 또는 실제 크기가 큰 것)
    if len(images) < 3:
        for img in soup.find_all("img", src=True)[:30]:
            src = img.get("data-src") or img.get("data-original") or img.get("src") or ""
            # 최소 크기 힌트가 있는 이미지만
            width = img.get("width", "")
            height = img.get("height", "")
            try:
                w = int(str(width).replace("px", "")) if width else 0
                h = int(str(height).replace("px", "")) if height else 0
            except ValueError:
                w, h = 0, 0
            if w >= 200 or h >= 200 or (not width and not height):
                _add_img(src)
            if len(images) >= 5:
                break

    # Tier 3: og:image 폴백
    if not images:
        for og_img in soup.find_all("meta", property="og:image"):
            content = og_img.get("content", "")
            _add_img(content)

    data["images"] = images[:5]
    return data


async def scrape_product(url: str) -> ScrapedProduct:
    """Scrape product data from a URL.

    Strategy: JSON-LD first, then OpenGraph fallback, then generic selectors.
    """
    platform = _detect_platform(url)
    timeout = settings.SCRAPER_TIMEOUT

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")
    product = ScrapedProduct(url=url, platform=platform)

    # Strategy 1: JSON-LD structured data (most reliable)
    json_ld = _extract_json_ld(soup)
    if json_ld:
        product.name = json_ld.get("name", "")
        product.description = json_ld.get("description", "")[:500]
        product.brand = ""
        brand_data = json_ld.get("brand", {})
        if isinstance(brand_data, dict):
            product.brand = brand_data.get("name", "")
        elif isinstance(brand_data, str):
            product.brand = brand_data
        product.category = json_ld.get("category", "")

        # Price from offers
        offers = json_ld.get("offers", {})
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        if isinstance(offers, dict):
            product.price = str(offers.get("price", ""))
            product.currency = offers.get("priceCurrency", "")

        # Images
        images = json_ld.get("image", [])
        if isinstance(images, str):
            images = [images]
        elif isinstance(images, dict):
            images = [images.get("url", "")]
        elif isinstance(images, list):
            normalized = []
            for img in images:
                if isinstance(img, str):
                    normalized.append(img)
                elif isinstance(img, dict):
                    normalized.append(img.get("url", ""))
            images = normalized
        product.images = [_normalize_image_url(img, url) for img in images if img][:5]
        product.images = [img for img in product.images if img]

        logger.info(f"Scraped via JSON-LD: {product.name}")
        return product

    # Strategy 2: OpenGraph meta tags
    og = _extract_opengraph(soup)
    if og.get("title"):
        product.name = og.get("title", "")
        product.description = og.get("description", "")[:500]
        og_images = og.get("images", [])
        if og_images:
            product.images = [_normalize_image_url(img, url) for img in og_images if img][:5]
            product.images = [img for img in product.images if img]
        if og.get("product:price:amount"):
            product.price = og["product:price:amount"]
            product.currency = og.get("product:price:currency", "")
        if og.get("product:brand"):
            product.brand = og["product:brand"]

        logger.info(f"Scraped via OpenGraph: {product.name} ({len(product.images)} images)")

    # Strategy 3: Generic selectors (supplement or primary)
    generic = _extract_generic(soup, base_url=url)
    if not product.name:
        product.name = generic.get("name", "")
    if not product.description:
        product.description = generic.get("description", "")
    if not product.price:
        product.price = generic.get("price", "")
    # 이미지 보강: 기존 이미지가 부족하면 제네릭 셀렉터로 보충
    generic_images = generic.get("images", [])
    if not product.images:
        product.images = generic_images
    elif len(product.images) < 3 and generic_images:
        existing = set(product.images)
        for img in generic_images:
            if img not in existing:
                product.images.append(img)
                existing.add(img)
            if len(product.images) >= 5:
                break

    # Meta description fallback
    if not product.description:
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc:
            product.description = meta_desc.get("content", "")[:500]

    # 통화 미감지 시 가격 문자열에서 추론
    if not product.currency and product.price:
        product.currency = _detect_currency_from_price(product.price)

    logger.info(f"Scraped product: {product.name} ({platform})")
    return product
