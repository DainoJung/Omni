from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class TemplateResponse(BaseModel):
    id: UUID
    name: str
    category: str
    width: int
    height: int
    thumbnail_url: Optional[str] = None
    structure: list
    styles: dict
    is_active: bool


class TemplateListResponse(BaseModel):
    items: List[TemplateResponse]
    total: int
