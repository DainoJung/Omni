from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ProductInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: Optional[str] = Field(None, max_length=50)
    brand_name: Optional[str] = Field(None, max_length=100)
    image_id: Optional[str] = None


class BackgroundConfig(BaseModel):
    mode: str = Field(..., pattern=r"^(solid|ai)$")  # "solid" | "ai"
    hex_color: str = Field("#FFFFFF", max_length=7)
    ai_prompt: Optional[str] = Field(None, max_length=500)


class FoodInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    image_id: Optional[str] = None


class RestaurantInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    food1: FoodInput
    food2: FoodInput


class WineInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    image_id: Optional[str] = None


class GenerateRequest(BaseModel):
    project_id: UUID
    products: List[ProductInput] = Field(default_factory=list, max_length=20)
    page_type: str = Field(..., min_length=1, max_length=50)
    background: Optional[BackgroundConfig] = None
    concept: Optional[str] = Field(None, max_length=500)
    restaurants: Optional[List[RestaurantInput]] = Field(None, max_length=5)
    include_wine: Optional[bool] = False
    wines: Optional[List[WineInput]] = Field(None, max_length=6)


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


class GenerateV2Request(BaseModel):
    project_id: UUID
    template_style: Optional[str] = Field(None, max_length=50)
    language: str = Field(default="ko", pattern=r"^(ko|en)$")


class GenerateV2Response(BaseModel):
    project_id: UUID
    template_style: str
    language: str
    rendered_sections: List[RenderedSectionResponse]
    generated_at: datetime


class UploadResult(BaseModel):
    file_id: UUID
    storage_path: str
    original_filename: str
    file_size_bytes: int
    content_type: str
