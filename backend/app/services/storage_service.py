import httpx
from uuid import uuid4

from app.config import settings
from app.database import get_supabase


class StorageService:
    def __init__(self):
        self.supabase = get_supabase()
        self.bucket_projects = settings.STORAGE_BUCKET_PROJECTS
        self.bucket_templates = settings.STORAGE_BUCKET_TEMPLATES

    async def upload_image(
        self,
        file_bytes: bytes,
        project_id: str,
        image_type: str,
        filename: str,
        content_type: str = "image/png",
    ) -> str:
        """이미지를 Supabase Storage에 업로드하고 경로를 반환한다."""

        storage_path = f"{project_id}/{image_type}/{filename}"

        self.supabase.storage.from_(self.bucket_projects).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type},
        )

        return storage_path

    async def download_and_store(
        self,
        image_url: str,
        project_id: str,
        image_type: str,
        filename: str,
    ) -> str:
        """외부 URL의 이미지를 다운로드하여 Storage에 저장한다."""

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            image_bytes = response.content

        return await self.upload_image(
            file_bytes=image_bytes,
            project_id=project_id,
            image_type=image_type,
            filename=filename,
        )

    def get_public_url(self, storage_path: str) -> str:
        """Storage 경로의 공개 URL을 반환한다."""

        result = self.supabase.storage.from_(self.bucket_projects).get_public_url(
            storage_path
        )
        return result

    def save_image_record(
        self,
        project_id: str,
        image_type: str,
        storage_path: str,
        original_filename: str,
    ) -> dict:
        """project_images 테이블에 레코드를 저장한다."""

        result = (
            self.supabase.table("project_images")
            .insert(
                {
                    "project_id": project_id,
                    "image_type": image_type,
                    "storage_path": storage_path,
                    "original_filename": original_filename,
                }
            )
            .execute()
        )
        return result.data[0] if result.data else {}
