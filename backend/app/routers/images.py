import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.config import settings
from app.services.bg_remove_service import remove_background
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/remove-bg")
async def remove_bg(
    project_id: str = Form(...),
    file: UploadFile = File(...),
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
