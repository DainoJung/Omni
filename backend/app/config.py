from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    # AI (Gemini - 텍스트 + 이미지 생성 통합)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_MAX_TOKENS: int = 2048
    IMAGE_GEN_MODEL: str = "gemini-2.0-flash-preview-image-generation"
    VISION_MODEL: str = "gemini-2.5-pro"

    # App
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    LOG_LEVEL: str = "INFO"

    # Storage
    STORAGE_BUCKET_PROJECTS: str = "project-images"
    STORAGE_BUCKET_TEMPLATES: str = "templates"
    MAX_UPLOAD_SIZE_MB: int = 5
    ALLOWED_IMAGE_TYPES: List[str] = ["image/png", "image/jpeg", "image/webp"]

    @field_validator("ALLOWED_IMAGE_TYPES", mode="before")
    @classmethod
    def parse_comma_separated(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [s.strip() for s in v.split(",")]
        return v

    model_config = {"env_file": ".env"}


settings = Settings()
