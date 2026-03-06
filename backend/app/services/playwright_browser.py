"""Shared Playwright browser instance for headless scraping.

FastAPI lifespan에서 start_browser()/stop_browser()을 호출하여
애플리케이션 수명 동안 하나의 Chromium 프로세스를 공유한다.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from playwright.async_api import (
    async_playwright,
    Browser,
    BrowserContext,
    Page,
    Playwright,
)

logger = logging.getLogger(__name__)

_playwright: Playwright | None = None
_browser: Browser | None = None
_page_semaphore = asyncio.Semaphore(3)  # 동시 최대 3개 페이지


async def start_browser() -> None:
    """애플리케이션 시작 시 Chromium 실행."""
    global _playwright, _browser
    _playwright = await async_playwright().start()
    _browser = await _playwright.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-blink-features=AutomationControlled",
        ],
    )
    logger.info("Playwright Chromium browser started")


async def stop_browser() -> None:
    """애플리케이션 종료 시 Chromium 종료."""
    global _playwright, _browser
    if _browser:
        await _browser.close()
        _browser = None
    if _playwright:
        await _playwright.stop()
        _playwright = None
    logger.info("Playwright Chromium browser stopped")


@asynccontextmanager
async def new_page(timeout_ms: int = 20_000) -> AsyncGenerator[Page, None]:
    """격리된 BrowserContext + Page를 생성한다. 요청 완료 후 자동 정리."""
    if _browser is None:
        raise RuntimeError("Browser not initialized. Call start_browser() first.")

    async with _page_semaphore:
        context: BrowserContext = await _browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            java_script_enabled=True,
            locale="ko-KR",
            extra_http_headers={
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"macOS"',
            },
        )
        context.set_default_navigation_timeout(timeout_ms)
        context.set_default_timeout(timeout_ms)

        page: Page = await context.new_page()

        # navigator.webdriver 제거 (봇 감지 우회)
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """)

        # 이미지/폰트/미디어 차단 — 속도 향상 + 메모리 절약
        await page.route(
            "**/*.{png,jpg,jpeg,gif,svg,webp,woff,woff2,ttf,eot,mp4,mp3}",
            lambda route: route.abort(),
        )

        try:
            yield page
        finally:
            await context.close()


async def scrape_rendered_html(url: str) -> str:
    """Playwright로 JS 렌더링된 HTML을 가져온다.

    봇 차단(403, 429, 490 등)이 발생해도 페이지에 콘텐츠가 있으면 반환한다.
    일부 사이트는 차단하면서도 기본 HTML은 제공하기 때문.
    """
    async with new_page(timeout_ms=25_000) as page:
        response = await page.goto(url, wait_until="domcontentloaded")

        status = response.status if response else 0
        if response is None:
            raise RuntimeError("Navigation failed: no response")

        # JS 렌더링 대기
        try:
            await page.wait_for_selector("h1, [class*='product'], [class*='item']", timeout=8_000)
        except Exception:
            pass

        html = await page.content()

        # 실패 응답이어도 콘텐츠가 충분하면 반환 (일부 사이트는 차단하면서도 HTML 제공)
        if not response.ok and len(html) < 5000:
            raise RuntimeError(f"Navigation failed: HTTP {status}, content too small ({len(html)} chars)")

        logger.info(f"Playwright fetch: HTTP {status}, {len(html)} chars")
        return html
