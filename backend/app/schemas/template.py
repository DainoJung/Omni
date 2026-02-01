from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class PlaceholderDefinition(BaseModel):
    id: str
    type: str  # "text" | "image" | "html"
    label: str
    editable: bool = True
    source: str = "ai"  # "ai" | "product" | "theme" | "static"


class SectionTemplateResponse(BaseModel):
    id: UUID
    section_type: str
    name: str
    html_template: str
    css_template: str
    placeholders: List[dict]
    is_active: bool = True


class ThemeResponse(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None
    accent_color: Optional[str] = None
    background_prompt: str
    copy_keywords: Optional[List[str]] = None
    is_active: bool = True
