"""v5.2 HTML 템플릿 기반 섹션 스키마 정의"""

from typing import Optional
from pydantic import BaseModel


class RenderedSection(BaseModel):
    section_id: str       # "hero_banner_0"
    section_type: str     # hero_banner | feature_badges | description | feature_point
    order: int
    template_id: str
    html_template: str
    css: str
    data: dict[str, Optional[str]]


class SectionDataUpdateRequest(BaseModel):
    data: dict[str, str]
