from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.schemas.generate import ProductInput, BackgroundConfig, RestaurantInput, WineInput


class ProjectCreate(BaseModel):
    products: List[ProductInput] = Field(default_factory=list, max_length=20)
    page_type: str = Field(..., min_length=1, max_length=50)
    selected_sections: Optional[List[str]] = None
    background: Optional[BackgroundConfig] = None
    restaurants: Optional[List[RestaurantInput]] = Field(None, max_length=5)
    include_wine: Optional[bool] = False
    wines: Optional[List[WineInput]] = Field(None, max_length=6)


class ProjectUpdate(BaseModel):
    rendered_sections: Optional[List[dict]] = None
    generated_data: Optional[dict] = None
    restaurants: Optional[List[dict]] = None
    background_config: Optional[dict] = None
    input_data: Optional[dict] = None


class SectionDataUpdateRequest(BaseModel):
    data: dict[str, str]
    style_overrides: Optional[dict[str, dict[str, str]]] = None


class ImageRegenerateRequest(BaseModel):
    prompt: str


class ProjectResponse(BaseModel):
    id: UUID
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
    background_config: Optional[dict] = None
    restaurants: Optional[List[dict]] = None
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    items: List[ProjectResponse]
    total: int
