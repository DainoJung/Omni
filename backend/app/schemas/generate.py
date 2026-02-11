from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ProductInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: Optional[str] = Field(None, max_length=50)
    brand_name: Optional[str] = Field(None, max_length=100)
    image_id: Optional[str] = None


class GenerateRequest(BaseModel):
    project_id: UUID
    products: List[ProductInput] = Field(..., min_length=1, max_length=9)
    page_type: str = Field(..., min_length=1, max_length=50)


class RenderedSectionResponse(BaseModel):
    section_id: str
    section_type: str
    order: int
    template_id: str
    html_template: str
    css: str
    data: dict[str, Optional[str]]


class GenerateResponse(BaseModel):
    project_id: UUID
    template_used: str
    page_type: str
    rendered_sections: List[RenderedSectionResponse]
    generated_at: datetime


class UploadResult(BaseModel):
    file_id: UUID
    storage_path: str
    original_filename: str
    file_size_bytes: int
    content_type: str
