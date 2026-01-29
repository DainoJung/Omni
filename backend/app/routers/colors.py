from fastapi import APIRouter, HTTPException
from uuid import UUID

from app.database import get_supabase
from app.schemas.colors import ColorPresetResponse, ColorPresetListResponse

router = APIRouter()


@router.get("", response_model=ColorPresetListResponse)
async def list_color_presets():
    db = get_supabase()
    result = db.table("color_presets").select("*").execute()
    return {"items": result.data, "total": len(result.data)}


@router.get("/{preset_id}", response_model=ColorPresetResponse)
async def get_color_preset(preset_id: UUID):
    db = get_supabase()
    result = (
        db.table("color_presets")
        .select("*")
        .eq("id", str(preset_id))
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="COLOR_PRESET_NOT_FOUND")
    return result.data
