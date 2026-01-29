import re
import unicodedata
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.config import settings
from app.services.storage_service import StorageService


def sanitize_filename(filename: str) -> str:
    """파일명에서 공백·특수문자를 제거하여 Supabase Storage 호환 키로 변환한다."""
    # NFKC 정규화로 유니코드 특수 공백 처리 (한글 유지)
    name = unicodedata.normalize("NFKC", filename)
    # 확장자 분리
    dot_idx = name.rfind(".")
    if dot_idx > 0:
        stem, ext = name[:dot_idx], name[dot_idx:]
    else:
        stem, ext = name, ""
    # 영문·숫자·하이픈·언더스코어만 남기고 나머지는 _ 로 치환
    stem = re.sub(r"[^a-zA-Z0-9가-힣_-]", "_", stem)
    # 연속 언더스코어 정리
    stem = re.sub(r"_+", "_", stem).strip("_")
    # 빈 이름이면 uuid
    if not stem:
        stem = uuid4().hex[:8]
    return f"{stem}{ext}"

router = APIRouter()


@router.post("")
async def upload_image(
    project_id: str = Form(...),
    image_type: str = Form(default="input"),
    file: UploadFile = File(...),
):
    # 파일 타입 검증
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"UPLOAD_INVALID_TYPE: 지원 형식은 {settings.ALLOWED_IMAGE_TYPES} 입니다.",
        )

    # 파일 크기 검증
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"UPLOAD_TOO_LARGE: 최대 {settings.MAX_UPLOAD_SIZE_MB}MB까지 업로드 가능합니다.",
        )

    storage = StorageService()

    # 파일명 sanitize (공백·특수문자 제거)
    safe_filename = sanitize_filename(file.filename or "upload.png")

    # Storage에 업로드
    storage_path = await storage.upload_image(
        file_bytes=contents,
        project_id=project_id,
        image_type=image_type,
        filename=safe_filename,
        content_type=file.content_type or "image/png",
    )

    # DB에 레코드 저장
    record = storage.save_image_record(
        project_id=project_id,
        image_type=image_type,
        storage_path=storage_path,
        original_filename=file.filename or "upload.png",
    )

    public_url = storage.get_public_url(storage_path)

    return {
        "file_id": record.get("id"),
        "storage_path": storage_path,
        "public_url": public_url,
        "original_filename": file.filename,
        "file_size_bytes": len(contents),
        "content_type": file.content_type,
    }
