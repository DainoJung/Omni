from fastapi import APIRouter, HTTPException

from app.database import get_supabase
from app.services.gemini_service import GeminiService
from app.schemas.tone_manner import ToneMannerRequest, ToneMannerResponse

router = APIRouter()


@router.post("/recommend", response_model=ToneMannerResponse)
async def recommend_tone_manner(data: ToneMannerRequest):
    # 색상 프리셋 이름 조회 (선택된 경우)
    color_preset_name = None
    if data.color_preset_id:
        db = get_supabase()
        result = (
            db.table("color_presets")
            .select("name")
            .eq("id", str(data.color_preset_id))
            .single()
            .execute()
        )
        if result.data:
            color_preset_name = result.data["name"]

    gemini = GeminiService()
    recommendations = await gemini.recommend_tone_manner(
        brand_name=data.brand_name,
        category=data.category,
        product_name=data.product_name,
        color_preset_name=color_preset_name,
    )

    return ToneMannerResponse(recommendations=recommendations)
