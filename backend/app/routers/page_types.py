from fastapi import APIRouter

from app.constants.page_types import list_page_types

router = APIRouter()


@router.get("")
async def get_page_types():
    return list_page_types()
