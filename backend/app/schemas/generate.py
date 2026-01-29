from pydantic import BaseModel
from typing import Optional, List, Dict
from uuid import UUID
from datetime import datetime


class GenerateRequest(BaseModel):
    project_id: UUID
    template_id: UUID
    color_preset_id: Optional[UUID] = None
    tone_manner: Optional[Dict] = None


class GeneratedTexts(BaseModel):
    main_copy: str
    sub_copy: str
    body_texts: List[str]
    product_descriptions: List[Dict[str, str]]
    cta_text: str
    hashtags: List[str]
    benefits: Optional[List[str]] = None


class GeneratedImages(BaseModel):
    banner: Optional[str] = None
    background: Optional[str] = None
    products: List[str] = []


class GenerateResult(BaseModel):
    project_id: UUID
    texts: GeneratedTexts
    images: GeneratedImages
    generated_at: datetime


class TextGenRequest(BaseModel):
    project_id: UUID
    template_id: UUID
    brand_name: str
    description: str
    category: Optional[str] = None
    event_period: Optional[str] = None


class TextGenResult(BaseModel):
    project_id: UUID
    texts: GeneratedTexts
    model_used: str
    token_usage: dict


class ImageGenRequest(BaseModel):
    project_id: UUID
    prompt: str
    width: int = 860
    height: int = 400
    style: str = "commercial"


class ImageGenResult(BaseModel):
    project_id: UUID
    storage_path: str
    width: int
    height: int
    file_size_bytes: int


class UploadResult(BaseModel):
    file_id: UUID
    storage_path: str
    original_filename: str
    file_size_bytes: int
    content_type: str
