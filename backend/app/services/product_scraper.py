"""Product scraper: Extract product data from URLs using JSON-LD, OpenGraph, and generic selectors"""

import logging
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.config import settings

logger = logging.getLogger(__name__)

# 봇 차단 우회를 위한 브라우저 헤더
_BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


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


def clean_image_url(raw_url: str) -> str:
    """CDN별 썸네일 → 고해상도 URL 변환.

    Amazon, Shopify, Cloudinary(Nike 등), imgix, WordPress, 일반 CDN 패턴 지원.
    """
    if not raw_url:
        return ""

    url = raw_url

    # ── Amazon media CDN ──
    # 710RpePupiL._SY88_.jpg → 710RpePupiL.jpg
    # 710RpePupiL._SX300_SY300_.jpg → 710RpePupiL.jpg
    if "media-amazon.com" in url or "ssl-images-amazon.com" in url:
        url = re.sub(r'\._[A-Z]{2}\d+[^./]*_*\.(jpg|jpeg|png|webp|gif)', r'.\1', url, flags=re.IGNORECASE)
        # Multiple modifiers: ._AA200_QL40_.jpg → .jpg
        url = re.sub(r'\._[^./]+\.(jpg|jpeg|png|webp|gif)$', r'.\1', url, flags=re.IGNORECASE)
        return url

    # ── Shopify CDN ──
    # product_300x300.jpg → product.jpg
    # product_300x300_crop_center.jpg → product.jpg
    if "shopify.com" in url or "cdn.shopify" in url:
        url = re.sub(r'_\d+x\d*(?:_crop_center)?\.(jpg|jpeg|png|webp|gif)', r'.\1', url, flags=re.IGNORECASE)
        return url

    # ── Cloudinary / Nike CDN ──
    # /t_PDP_144_v1/ → /t_PDP_1728_v1/  (Nike)
    # /c_thumb,w_300/ → /c_fill,w_1200/
    # /f_auto,q_auto:eco/ 유지, 크기 변환만
    if "cloudinary.com" in url or "static.nike.com" in url:
        # Nike PDP transforms: 144, 535, 936 → 1728
        url = re.sub(r'/t_PDP_\d+_v\d+/', '/t_PDP_1728_v1/', url)
        url = re.sub(r'/t_web_pdp_\d+_v\d+/', '/t_PDP_1728_v1/', url)
        # Generic Cloudinary thumb → large
        url = re.sub(r'/c_thumb,w_\d+/', '/c_fill,w_1200/', url)
        url = re.sub(r'/c_scale,w_\d+/', '/c_scale,w_1200/', url)
        url = re.sub(r',w_\d+,h_\d+/', ',w_1200,h_1200/', url)
        return url

    # ── imgix CDN ──
    if "imgix.net" in url:
        url = re.sub(r'[?&]w=\d+', '?w=1200', url)
        url = re.sub(r'[?&]h=\d+', '', url)
        return url

    # ── WordPress / WooCommerce ──
    # image-300x300.jpg → image.jpg
    if "wp-content" in url:
        url = re.sub(r'-\d+x\d+\.(jpg|jpeg|png|webp|gif)', r'.\1', url, flags=re.IGNORECASE)
        return url

    # ── 알 수 없는 CDN: 최소한의 안전한 변환만 ──
    # 쿼리 파라미터는 건드리지 않음 (CDN마다 필수 파라미터가 다름)
    # 파일명 suffix만 안전하게 처리
    url = re.sub(r'[_-](thumb|small|thumbnail|sq)\.(jpg|jpeg|png|webp|gif)$', r'.\2', url, flags=re.IGNORECASE)

    return url



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
        normalized = clean_image_url(_normalize_image_url(src, base_url))
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


def _extract_js_image_urls(html: str) -> list[str]:
    """HTML 내 JavaScript/JSON에 포함된 이미지 URL을 추출한다.

    많은 사이트가 img 태그 대신 JS 변수로 이미지 URL을 전달한다 (Nike, Amazon 등).
    """
    urls: list[str] = []
    seen: set[str] = set()

    # 패턴 1: JSON 내 고해상도 이미지 키 ("hiRes", "large", "zoom", "original" 등)
    hi_res_patterns = [
        r'"hiRes"\s*:\s*"(https?://[^"]+)"',
        r'"large"\s*:\s*"(https?://[^"]+)"',
        r'"zoom"\s*:\s*"(https?://[^"]+)"',
        r'"original"\s*:\s*"(https?://[^"]+)"',
        r'"full"\s*:\s*"(https?://[^"]+)"',
        r'"hero"\s*:\s*"(https?://[^"]+)"',
        r'"mainImageUrl"\s*:\s*"(https?://[^"]+)"',
        r'"imageUrl"\s*:\s*"(https?://[^"]+)"',
    ]
    for pattern in hi_res_patterns:
        for match in re.finditer(pattern, html):
            u = match.group(1)
            if u not in seen:
                seen.add(u)
                urls.append(u)

    # 패턴 2: 이미지 확장자를 가진 URL (jpg, png, webp)
    # - 최소 길이 40자 (의미 있는 이미지 URL)
    # - 크기 힌트가 600px 이상이거나 크기 힌트 없는 것 우선
    img_pattern = re.compile(
        r'"(https?://[^"]{40,}\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"',
        re.IGNORECASE,
    )
    for match in img_pattern.finditer(html):
        u = match.group(1)
        if u in seen:
            continue
        lower = u.lower()
        # 추적/아이콘 URL 제외
        if any(skip in lower for skip in ("pixel", "tracking", "logo", "icon", "favicon",
                                           "sprite", "badge", "1x1", ".svg")):
            continue
        seen.add(u)
        urls.append(u)

    return urls


def _extract_all_images(soup: BeautifulSoup, base_url: str, html: str = "") -> list[str]:
    """URL 페이지에서 가능한 모든 상품 이미지를 추출한다.

    우선순위: JSON-LD → JS 임베디드(고화질) → 상품 셀렉터 → srcset → OG → 큰 이미지
    아이콘/로고/트래커는 필터링.
    """
    images: list[str] = []
    seen: set[str] = set()

    skip_patterns = (
        "logo", "icon", "favicon", "pixel", "tracking", "badge",
        "button", "banner-ad", "1x1", "sprite", "spacer", "blank",
        "arrow", "checkbox", "radio", "star-rating", "rating",
        "payment", "visa", "mastercard", "paypal",
    )

    def _add(src: str) -> None:
        normalized = clean_image_url(_normalize_image_url(src, base_url))
        if not normalized or normalized in seen:
            return
        lower = normalized.lower()
        if any(p in lower for p in skip_patterns):
            return
        if normalized.startswith("data:"):
            return
        seen.add(normalized)
        images.append(normalized)

    # 1) JSON-LD 이미지 (가장 신뢰도 높음, 보통 고화질)
    json_ld = _extract_json_ld(soup)
    if json_ld:
        ld_images = json_ld.get("image", [])
        if isinstance(ld_images, str):
            ld_images = [ld_images]
        elif isinstance(ld_images, dict):
            ld_images = [ld_images.get("url", "")]
        elif isinstance(ld_images, list):
            flat = []
            for img in ld_images:
                if isinstance(img, str):
                    flat.append(img)
                elif isinstance(img, dict):
                    flat.append(img.get("url", ""))
            ld_images = flat
        for src in ld_images:
            _add(src)

    # 2) 상품 이미지 전용 셀렉터
    product_selectors = [
        ".product-image img", "#product-images img", ".gallery img",
        "[data-testid='product-image'] img", "img[data-zoom-image]",
        ".product-gallery img", ".product-photos img",
        ".swiper-slide img", ".slick-slide img", ".carousel-item img",
        "[class*='product'] img", "[class*='gallery'] img",
        "[id*='product'] img", "[id*='gallery'] img",
        # Amazon 전용
        "#altImages img", "#imageBlock img", ".imageThumbnail img",
        "#main-image-container img",
        # Coupang 전용
        ".prod-image img", ".prod-image__item img",
        # 일반 이커머스
        ".product-detail img", ".product-main img",
        ".detail-image img", ".item-image img",
        ".product-slider img", ".product-carousel img",
    ]
    for sel in product_selectors:
        for img in soup.select(sel)[:20]:
            src = (
                img.get("data-zoom-image")
                or img.get("data-large")
                or img.get("data-large_size_url")
                or img.get("data-old-hires")
                or img.get("data-a-dynamic-image", "")
                or img.get("data-src")
                or img.get("data-original")
                or img.get("src")
                or ""
            )
            # Amazon data-a-dynamic-image (JSON 형태)
            if src.startswith("{"):
                import json as _json
                try:
                    dynamic = _json.loads(src)
                    if isinstance(dynamic, dict) and dynamic:
                        def _get_res(v):
                            return v[0] * v[1] if isinstance(v, list) and len(v) >= 2 else 0
                        best = max(dynamic.keys(), key=lambda k: _get_res(dynamic[k]))
                        _add(best)
                    continue
                except (ValueError, AttributeError):
                    pass
            _add(src)

    # 4) srcset에서 최고 해상도 이미지
    for img in soup.find_all("img", srcset=True):
        srcset = img.get("srcset", "")
        best_url = ""
        max_w = 0
        for part in srcset.split(","):
            part = part.strip()
            if not part:
                continue
            tokens = part.split()
            url_part = tokens[0]
            if len(tokens) > 1 and tokens[1].endswith("w"):
                try:
                    w = int(tokens[1][:-1])
                    if w > max_w:
                        max_w = w
                        best_url = url_part
                except ValueError:
                    if not best_url:
                        best_url = url_part
            elif not best_url:
                best_url = url_part
        if best_url:
            _add(best_url)

    # 5) OpenGraph 이미지
    for meta in soup.find_all("meta", property="og:image"):
        _add(meta.get("content", ""))

    # 6) 큰 이미지 (width/height ≥ 200 또는 크기 힌트 없음)
    for img in soup.find_all("img", src=True)[:50]:
        src = img.get("data-src") or img.get("data-original") or img.get("src") or ""
        width = img.get("width", "")
        height = img.get("height", "")
        try:
            w = int(str(width).replace("px", "")) if width else 0
            h = int(str(height).replace("px", "")) if height else 0
        except ValueError:
            w, h = 0, 0
        if w >= 200 or h >= 200 or (not width and not height):
            _add(src)

    # 7) DOM에서 충분하지 않으면 JS 임베디드 이미지로 보충
    if len(images) < 5 and html:
        js_images = _extract_js_image_urls(html)
        for src in js_images:
            _add(src)
            if len(images) >= 30:
                break

    return images[:30]


async def scrape_images_from_url(url: str) -> list[str]:
    """URL에서 상품 이미지만 추출한다.

    1차: httpx로 빠르게 시도
    2차: httpx 실패 시 Playwright headless browser로 JS 렌더링 후 추출
    """
    # 1차: httpx (빠름)
    images = await _scrape_images_httpx(url)
    if images:
        return images

    # 2차: Playwright 폴백 (JS 렌더링, 봇 차단 우회)
    logger.info(f"httpx 실패, Playwright 폴백: {url}")
    return await _scrape_images_playwright(url)


async def _scrape_images_httpx(url: str) -> list[str]:
    """httpx로 이미지 스크래핑 (빠르지만 JS 렌더링 불가)."""
    headers = {**_BROWSER_HEADERS, "Referer": url}
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()

        html = resp.text
        soup = BeautifulSoup(html, "lxml")
        images = _extract_all_images(soup, base_url=url, html=html)
        logger.info(f"httpx 이미지 스크래핑: {len(images)}장")
        return images

    except httpx.HTTPStatusError as e:
        logger.warning(f"httpx HTTP error ({e.response.status_code}): {url}")
        return []
    except Exception as e:
        logger.warning(f"httpx 스크래핑 실패: {e}")
        return []


async def _scrape_images_playwright(url: str) -> list[str]:
    """Playwright headless browser로 이미지 스크래핑."""
    try:
        from app.services.playwright_browser import scrape_rendered_html
        html = await scrape_rendered_html(url)
        soup = BeautifulSoup(html, "lxml")
        images = _extract_all_images(soup, base_url=url, html=html)
        logger.info(f"Playwright 이미지 스크래핑: {len(images)}장")
        return images
    except Exception as e:
        logger.warning(f"Playwright 스크래핑 실패: {e}")
        return []


async def scrape_product(url: str) -> ScrapedProduct:
    """Scrape product data from a URL.

    Strategy: httpx → Playwright 폴백 → JSON-LD/OpenGraph/generic 파싱.
    """
    platform = _detect_platform(url)
    timeout = settings.SCRAPER_TIMEOUT

    html = None
    # 1차: httpx
    headers = {**_BROWSER_HEADERS, "Referer": url}
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
        html = resp.text
    except Exception as e:
        logger.warning(f"scrape_product httpx 실패: {e}")

    # 2차: Playwright 폴백
    if not html:
        try:
            from app.services.playwright_browser import scrape_rendered_html
            html = await scrape_rendered_html(url)
            logger.info("scrape_product: Playwright 폴백 성공")
        except Exception as e:
            logger.warning(f"scrape_product Playwright도 실패: {e}")
            raise

    soup = BeautifulSoup(html, "lxml")
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
        product.images = [clean_image_url(_normalize_image_url(img, url)) for img in images if img][:5]
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
            product.images = [clean_image_url(_normalize_image_url(img, url)) for img in og_images if img][:5]
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
