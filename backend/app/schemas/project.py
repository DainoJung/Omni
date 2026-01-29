from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from enum import Enum


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    EDITING = "editing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProjectCreate(BaseModel):
    brand_name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=2000)
    category: Optional[str] = Field(None, pattern=r"^(food|fashion|beauty|electronics|etc)$")
    event_period_start: Optional[date] = None
    event_period_end: Optional[date] = None
    price_info: Optional[str] = Field(None, max_length=200)


class ProjectUpdate(BaseModel):
    template_id: Optional[UUID] = None
    color_preset_id: Optional[UUID] = None
    tone_manner: Optional[dict] = None
    generated_content: Optional[dict] = None
    edit_history: Optional[List[dict]] = None
    status: Optional[ProjectStatus] = None
    brand_name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    status: ProjectStatus
    brand_name: str
    description: str
    category: Optional[str] = None
    event_period_start: Optional[date] = None
    event_period_end: Optional[date] = None
    price_info: Optional[str] = None
    template_id: Optional[UUID] = None
    color_preset_id: Optional[UUID] = None
    tone_manner: Optional[dict] = None
    generated_content: Optional[dict] = None
    edit_history: Optional[List[dict]] = None
    output_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    items: List[ProjectResponse]
    total: int
