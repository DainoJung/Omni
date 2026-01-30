from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from enum import Enum


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class ProjectCreate(BaseModel):
    brand_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = None
    products: Optional[List[dict]] = None


class ProjectUpdate(BaseModel):
    input_data: Optional[dict] = None
    pipeline_result: Optional[dict] = None
    status: Optional[ProjectStatus] = None
    brand_name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    status: ProjectStatus
    brand_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    products: Optional[List[dict]] = None
    input_data: Optional[dict] = None
    pipeline_result: Optional[dict] = None
    output_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    items: List[ProjectResponse]
    total: int
