from fastapi import APIRouter, HTTPException
from uuid import UUID

from app.database import get_supabase
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)

router = APIRouter()


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(data: ProjectCreate):
    db = get_supabase()
    insert_data = data.model_dump(exclude_none=True)
    result = db.table("projects").insert(insert_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="프로젝트 생성 실패")

    return result.data[0]


@router.get("", response_model=ProjectListResponse)
async def list_projects():
    db = get_supabase()
    result = db.table("projects").select("*").order("created_at", desc=True).execute()
    return {"items": result.data, "total": len(result.data)}


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: UUID):
    db = get_supabase()
    result = db.table("projects").select("*").eq("id", str(project_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    return result.data


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: UUID, data: ProjectUpdate):
    db = get_supabase()
    update_data = data.model_dump(exclude_none=True)
    result = (
        db.table("projects")
        .update(update_data)
        .eq("id", str(project_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    return result.data[0]


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: UUID):
    db = get_supabase()
    db.table("projects").delete().eq("id", str(project_id)).execute()
