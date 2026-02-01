from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum

from app.schemas.generate import ProductInput


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class ProjectCreate(BaseModel):
    products: List[ProductInput] = Field(..., min_length=1, max_length=6)
    theme: str = Field(..., min_length=1, max_length=50)
    selected_sections: Optional[List[str]] = None


class ProjectUpdate(BaseModel):
    status: Optional[ProjectStatus] = None
    rendered_sections: Optional[List[dict]] = None
    generated_data: Optional[dict] = None


class SectionDataUpdateRequest(BaseModel):
    data: dict[str, str]


class ProjectResponse(BaseModel):
    id: UUID
    status: ProjectStatus
    brand_name: Optional[str] = None
    theme_id: Optional[str] = None
    template_used: Optional[str] = None
    products: Optional[List[dict]] = None
    selected_sections: Optional[List[str]] = None
    rendered_sections: Optional[List[dict]] = None
    generated_data: Optional[dict] = None
    input_data: Optional[dict] = None
    pipeline_result: Optional[dict] = None
    output_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    items: List[ProjectResponse]
    total: int
