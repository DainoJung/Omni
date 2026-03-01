"""Product analysis schemas"""

from pydantic import BaseModel, Field
from typing import Optional, List


class AnalyzeSearchRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    language: str = Field(default="ko", pattern=r"^(ko|en|ja|zh)$")


class AnalyzeUrlRequest(BaseModel):
    url: str = Field(..., min_length=10, max_length=2000)
    language: str = Field(default="ko", pattern=r"^(ko|en|ja|zh)$")


class AnalyzeManualRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    brand: Optional[str] = Field(None, max_length=200)
    price: Optional[str] = Field(None, max_length=50)
    images: List[str] = Field(default_factory=list, max_length=10)
    language: str = Field(default="ko", pattern=r"^(ko|en)$")


class ScrapedProductResponse(BaseModel):
    name: str
    description: str
    price: str
    currency: str
    brand: str
    images: List[str]
    category: str
    url: str
    platform: str


class AnalysisResponse(BaseModel):
    category: str
    subcategory: str
    usp_points: List[str]
    target_customer: str
    tone: str
    recommended_template_style: str
    color_palette: List[str]
    summary: str
    scraped_data: Optional[ScrapedProductResponse] = None
