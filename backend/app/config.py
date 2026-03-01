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
    IMAGE_GEN_MODEL: str = "gemini-2.5-flash-image"

    # AWS Bedrock (배경 제거)
    AWS_REGION: str = "us-east-1"
    AWS_BEARER_TOKEN_BEDROCK: str = ""
    BEDROCK_BG_MODEL: str = "amazon.nova-canvas-v1:0"

    # App
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "https://ssgpopmaker.squarelight.ai"]
    LOG_LEVEL: str = "INFO"

    # Auth (JWT)
    AUTH_SECRET: str = "change-this-secret-key"
    JWT_EXPIRY_HOURS: int = 72
    ADMIN_DEFAULT_PASSWORD: str = "ssg2026!"

    # Google Custom Search (이미지 검색)
    GOOGLE_CSE_API_KEY: str = ""  # 비어있으면 GEMINI_API_KEY 사용
    GOOGLE_CSE_ID: str = ""  # Programmable Search Engine ID

    # Scraping & Generation
    SCRAPER_TIMEOUT: int = 15
    DEFAULT_LANGUAGE: str = "ko"

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
