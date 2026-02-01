from fastapi import APIRouter

from app.constants.themes import list_themes
from app.schemas.template import ThemeResponse

router = APIRouter()


@router.get("", response_model=list[ThemeResponse])
async def get_themes():
    return list_themes()
