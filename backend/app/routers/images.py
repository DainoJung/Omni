import logging
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Depends

from app.config import settings
from app.database import get_supabase
from app.services.bg_remove_service import remove_background
from app.services.storage_service import StorageService
from app.dependencies.auth import get_current_user, CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/project/{project_id}")
async def list_project_images(
    project_id: str,
    image_type: Optional[str] = Query(None, description="Filter by image type (input, bg_removed, generated, etc.)"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """프로젝트의 이미지 목록을 반환한다."""
    db = get_supabase()
    storage = StorageService()

    query = db.table("project_images").select("*").eq("project_id", project_id)
    if image_type:
        query = query.eq("image_type", image_type)
    query = query.order("created_at", desc=True)

    result = query.execute()

    images = []
    for record in result.data or []:
        url = storage.get_public_url(record["storage_path"])
        images.append({
            "id": record["id"],
            "url": url,
            "image_type": record["image_type"],
            "created_at": record["created_at"],
        })

    return {"images": images}


@router.post("/remove-bg")
async def remove_bg(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    """첨부 이미지의 배경을 제거하고 결과 URL을 반환한다."""

    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"지원 형식은 {settings.ALLOWED_IMAGE_TYPES} 입니다.",
        )

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"최대 {settings.MAX_UPLOAD_SIZE_MB}MB까지 업로드 가능합니다.",
        )

    try:
        result_bytes = await remove_background(contents, raise_on_error=True)
    except Exception as e:
        logger.error(f"배경 제거 실패: {e}")
        raise HTTPException(status_code=500, detail=f"배경 제거 실패: {e}")

    storage = StorageService()
    filename = f"bg_removed_{uuid4().hex[:8]}.png"

    storage_path = await storage.upload_image(
        file_bytes=result_bytes,
        project_id=project_id,
        image_type="bg_removed",
        filename=filename,
        content_type="image/png",
    )

    public_url = storage.get_public_url(storage_path)

    return {"url": public_url}
