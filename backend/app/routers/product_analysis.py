"""Product analysis router: Gemini Search + AI analysis"""

import logging

from fastapi import APIRouter, HTTPException, Depends

from app.dependencies.auth import get_current_user, CurrentUser
from app.schemas.product_analysis import (
    AnalyzeSearchRequest,
    AnalyzeUrlRequest,
    AnalyzeManualRequest,
    AnalysisResponse,
    ScrapedProductResponse,
)
from app.services.product_search_service import search_product_by_name, search_product_by_url
from app.services.product_analyzer import analyze_product
from app.services.template_matcher import match_template

logger = logging.getLogger(__name__)

router = APIRouter()


async def _build_response(scraped, language: str) -> AnalysisResponse:
    """공통: 스크래핑/검색 결과 → AI 분석 → 템플릿 매칭 → 응답 생성."""
    analysis = await analyze_product(scraped.to_dict(), language=language)
    matched_style = match_template(analysis.to_dict())
    analysis.recommended_template_style = matched_style

    return AnalysisResponse(
        category=analysis.category,
        subcategory=analysis.subcategory,
        usp_points=analysis.usp_points,
        target_customer=analysis.target_customer,
        tone=analysis.tone,
        recommended_template_style=analysis.recommended_template_style,
        color_palette=analysis.color_palette,
        summary=analysis.summary,
        scraped_data=ScrapedProductResponse(**scraped.to_dict()),
    )


@router.post("/search", response_model=AnalysisResponse)
async def analyze_search(
    data: AnalyzeSearchRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """상품명으로 웹 검색하여 상품 정보를 수집하고 AI 분석을 수행한다."""
    try:
        scraped = await search_product_by_name(data.name, language=data.language)
        return await _build_response(scraped, data.language)

    except Exception as e:
        logger.exception(f"Search analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"상품 검색 실패: {str(e)}")


@router.post("/url", response_model=AnalysisResponse)
async def analyze_url(
    data: AnalyzeUrlRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """URL의 상품 정보를 Gemini + Google Search로 검색하고 AI 분석을 수행한다."""
    try:
        scraped = await search_product_by_url(data.url, language=data.language)

        if not scraped or not scraped.name:
            raise HTTPException(
                status_code=422,
                detail="상품 정보를 추출할 수 없습니다. 상품명을 직접 입력해 주세요.",
            )

        return await _build_response(scraped, data.language)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"URL analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"분석 실패: {str(e)}")


@router.post("/manual", response_model=AnalysisResponse)
async def analyze_manual(
    data: AnalyzeManualRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """수동 입력 상품 데이터를 AI로 분석한다."""
    try:
        product_data = {
            "name": data.name,
            "description": data.description,
            "brand": data.brand or "",
            "price": data.price or "",
            "images": data.images,
            "category": "",
        }

        analysis = await analyze_product(product_data, language=data.language)
        matched_style = match_template(analysis.to_dict())
        analysis.recommended_template_style = matched_style

        return AnalysisResponse(
            category=analysis.category,
            subcategory=analysis.subcategory,
            usp_points=analysis.usp_points,
            target_customer=analysis.target_customer,
            tone=analysis.tone,
            recommended_template_style=analysis.recommended_template_style,
            color_palette=analysis.color_palette,
            summary=analysis.summary,
            scraped_data=None,
        )

    except Exception as e:
        logger.exception(f"Manual analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"분석 실패: {str(e)}")
