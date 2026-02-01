from fastapi import APIRouter, HTTPException

from app.database import get_supabase
from app.schemas.template import SectionTemplateResponse

router = APIRouter()


@router.get("", response_model=list[SectionTemplateResponse])
async def list_templates():
    db = get_supabase()
    result = db.table("section_templates").select("*").eq("is_active", True).execute()
    return result.data or []


@router.get("/{section_type}", response_model=SectionTemplateResponse)
async def get_template(section_type: str):
    db = get_supabase()
    result = (
        db.table("section_templates")
        .select("*")
        .eq("section_type", section_type)
        .eq("is_active", True)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="TEMPLATE_NOT_FOUND")
    return result.data
