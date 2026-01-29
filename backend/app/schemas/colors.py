from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime


class ColorPresetResponse(BaseModel):
    id: UUID
    name: str
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str
    category: str
    created_at: datetime


class ColorPresetListResponse(BaseModel):
    items: List[ColorPresetResponse]
    total: int
