"""v5.2 섹션 구성 서비스: DB에서 4개 섹션 템플릿 조회"""

import logging

from app.database import get_supabase

logger = logging.getLogger(__name__)

# 고정 4개 섹션 순서
SECTION_ORDER = ["hero_banner", "feature_badges", "description", "feature_point"]


def compose_sections() -> list[dict]:
    """4개 섹션 템플릿을 조회하여 순서대로 반환한다.

    반환 순서: hero_banner → feature_badges → description → feature_point
    """
    db = get_supabase()

    result = (
        db.table("section_templates")
        .select("*")
        .in_("section_type", SECTION_ORDER)
        .eq("is_active", True)
        .execute()
    )

    if not result.data:
        raise ValueError("섹션 템플릿을 찾을 수 없습니다.")

    # 섹션 맵 구성
    section_map: dict[str, dict] = {}
    for s in result.data:
        section_map[s["section_type"]] = s

    # 순서대로 정렬하여 반환
    sections = []
    for i, section_type in enumerate(SECTION_ORDER):
        template = section_map.get(section_type)
        if not template:
            raise ValueError(f"섹션 템플릿을 찾을 수 없습니다: {section_type}")
        template["_order"] = i
        sections.append(template)

    logger.info(f"섹션 구성 완료: {len(sections)}개")
    return sections
