from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ProductInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    image_id: Optional[str] = None


class LayoutGenerateRequest(BaseModel):
    project_id: UUID
    products: List[ProductInput] = Field(..., min_length=1, max_length=6)
    brand_name: Optional[str] = None
    category: Optional[str] = None


class TextAreaBounds(BaseModel):
    x: float = Field(..., ge=0, le=100, description="X position in %")
    y: float = Field(..., ge=0, le=100, description="Y position in %")
    width: float = Field(..., gt=0, le=100, description="Width in %")
    height: float = Field(..., gt=0, le=100, description="Height in %")


class TextArea(BaseModel):
    id: str
    position: int
    bounds: TextAreaBounds
    background_brightness: Optional[str] = None  # "light" | "dark"
    recommended_font_color: str = "#000000"
    max_font_size: Optional[int] = None
    suitable_for: str  # "headline" | "subtext" | "label" | "description"
    recommended_text: Optional[str] = None
    text_align: str = "center"
    font_weight: int = 500
    letter_spacing: str = "0em"
    font_size_vw: Optional[float] = None


class SectionPlan(BaseModel):
    section_key: str
    title: str
    description: str
    product_indices: List[int] = Field(default_factory=list)
    order: int


class SectionResult(BaseModel):
    section_key: str
    order: int
    layout_image_url: str
    text_areas: List[TextArea]
    aspect_ratio: str = "3:4"


class LayoutGenerateResponse(BaseModel):
    project_id: UUID
    sections: List[SectionResult]
    page_plan: List[SectionPlan]
    products: List[ProductInput]
    generated_at: datetime


class UploadResult(BaseModel):
    file_id: UUID
    storage_path: str
    original_filename: str
    file_size_bytes: int
    content_type: str
