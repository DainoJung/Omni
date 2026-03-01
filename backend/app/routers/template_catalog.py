"""Template catalog router: Browse and preview global templates"""

from fastapi import APIRouter, HTTPException

from app.constants.global_templates import list_template_styles, get_template_style

router = APIRouter()


@router.get("/catalog")
async def get_template_catalog():
    """글로벌 템플릿 스타일 카탈로그 목록 (미리보기 포함)"""
    styles = list_template_styles()
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "name_ko": s["name_ko"],
            "description": s["description"],
            "description_ko": s["description_ko"],
            "preview_colors": s["preview_colors"],
            "css_variables": s["css_variables"],
        }
        for s in styles
    ]


@router.get("/catalog/{style_id}")
async def get_template_detail(style_id: str):
    """특정 템플릿 스타일 상세 정보"""
    style = get_template_style(style_id)
    if style["id"] != style_id:
        raise HTTPException(status_code=404, detail=f"Template style not found: {style_id}")
    return style
