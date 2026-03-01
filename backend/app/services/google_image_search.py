"""Google Custom Search API: 상품 이미지 검색"""

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GOOGLE_CSE_ENDPOINT = "https://www.googleapis.com/customsearch/v1"


async def search_product_images(
    query: str,
    num: int = 5,
    language: str = "ko",
) -> list[str]:
    """Google Custom Search API로 상품 이미지 URL을 검색한다.

    Args:
        query: 검색어 (상품명)
        num: 반환할 이미지 수 (최대 10)
        language: 검색 언어

    Returns:
        이미지 URL 리스트
    """
    api_key = settings.GOOGLE_CSE_API_KEY or settings.GEMINI_API_KEY
    cse_id = settings.GOOGLE_CSE_ID

    if not api_key or not cse_id:
        logger.warning("Google CSE 설정 없음 (GOOGLE_CSE_API_KEY, GOOGLE_CSE_ID) — 이미지 검색 스킵")
        return []

    params = {
        "key": api_key,
        "cx": cse_id,
        "q": f"{query} product",
        "searchType": "image",
        "num": min(num, 10),
        "imgSize": "large",
        "safe": "active",
    }

    # 언어별 검색 지역 설정
    lang_map = {"ko": "kr", "en": "us", "ja": "jp", "zh": "cn"}
    gl = lang_map.get(language, "us")
    params["gl"] = gl

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(GOOGLE_CSE_ENDPOINT, params=params)
            resp.raise_for_status()

        data = resp.json()
        items = data.get("items", [])

        image_urls = []
        for item in items:
            link = item.get("link", "")
            if link and link.startswith("http"):
                image_urls.append(link)

        logger.info(f"Google CSE 이미지 검색: '{query}' → {len(image_urls)}장")
        return image_urls

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            logger.warning("Google CSE 일일 할당량 초과")
        else:
            logger.warning(f"Google CSE HTTP 에러: {e.response.status_code}")
        return []
    except Exception as e:
        logger.warning(f"Google CSE 이미지 검색 실패: {e}")
        return []
