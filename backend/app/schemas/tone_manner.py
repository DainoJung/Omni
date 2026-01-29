from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID


class ToneMannerRequest(BaseModel):
    brand_name: str = Field(..., min_length=1, max_length=100)
    category: Optional[str] = None
    product_name: Optional[str] = None
    color_preset_id: Optional[UUID] = None


class ToneMannerOption(BaseModel):
    style: str
    mood: str
    description: str
    keywords: List[str]


class ToneMannerResponse(BaseModel):
    recommendations: List[ToneMannerOption]
