from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from uuid import UUID

from app.database import get_supabase
from app.schemas.template import TemplateResponse, TemplateListResponse

router = APIRouter()


@router.get("", response_model=TemplateListResponse)
async def list_templates(category: Optional[str] = Query(None)):
    db = get_supabase()
    query = db.table("templates").select("*").eq("is_active", True)

    if category:
        query = query.eq("category", category)

    result = query.execute()
    return {"items": result.data, "total": len(result.data)}


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: UUID):
    db = get_supabase()
    result = (
        db.table("templates")
        .select("*")
        .eq("id", str(template_id))
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="TEMPLATE_NOT_FOUND")
    return result.data
