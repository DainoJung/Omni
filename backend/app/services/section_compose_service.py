"""v5.2 페이지 구성 서비스: DB에서 섹션 템플릿 조회 (선택된 섹션만)"""

import logging

from app.database import get_supabase

logger = logging.getLogger(__name__)

# 고정 4개 섹션 순서
SECTION_ORDER = ["hero_banner", "feature_badges", "description", "feature_point"]


def compose_sections(selected_sections: list[str] | None = None) -> list[dict]:
    """섹션 템플릿을 조회하여 순서대로 반환한다.

    Args:
        selected_sections: 포함할 섹션 타입 리스트. None이면 전체 반환.
    """
    # selected_sections가 있으면 사용자 지정 순서 그대로, 없으면 기본 순서
    target_ordered = selected_sections if selected_sections else list(SECTION_ORDER)

    db = get_supabase()

    result = (
        db.table("section_templates")
        .select("*")
        .in_("section_type", target_ordered)
        .eq("is_active", True)
        .execute()
    )

    if not result.data:
        raise ValueError("섹션 템플릿을 찾을 수 없습니다.")

    # 섹션 맵 구성
    section_map: dict[str, dict] = {}
    for s in result.data:
        section_map[s["section_type"]] = s

    # 순서대로 정렬하여 반환 (중복 섹션 지원을 위해 복사본 사용)
    sections = []
    for i, section_type in enumerate(target_ordered):
        template = section_map.get(section_type)
        if not template:
            raise ValueError(f"섹션 템플릿을 찾을 수 없습니다: {section_type}")
        entry = {**template, "_order": i}
        sections.append(entry)

    logger.info(f"페이지 구성 완료: {len(sections)}개 ({target_ordered})")
    return sections


# Global template section types (v2)
GLOBAL_SECTION_ORDER = [
    "global_hero", "global_feature_grid", "global_description",
    "global_product_showcase", "global_gallery", "global_cta",
]


def compose_sections_for_style(
    template_style: str,
    product_count: int = 1,
) -> list[dict]:
    """v2 섹션 구성: hero_banner → feature_badges → description → feature_point x N.

    Args:
        template_style: 템플릿 스타일 ID (현재 미사용, 향후 확장용)
        product_count: 상품 수 (feature_point 반복 횟수, 최소 1, 최대 6)

    Returns:
        섹션 템플릿 딕셔너리 목록
    """
    feature_point_count = max(1, min(product_count, 6))

    # 고정 3개 + feature_point x N
    section_types = ["hero_banner", "feature_badges", "description"]
    section_types += ["feature_point"] * feature_point_count

    db = get_supabase()
    result = (
        db.table("section_templates")
        .select("*")
        .in_("section_type", list(set(section_types)))
        .eq("is_active", True)
        .execute()
    )

    if not result.data:
        raise ValueError("섹션 템플릿을 찾을 수 없습니다.")

    section_map: dict[str, dict] = {}
    for s in result.data:
        section_map[s["section_type"]] = s

    sections = []
    for i, section_type in enumerate(section_types):
        template = section_map.get(section_type)
        if not template:
            raise ValueError(f"섹션 템플릿을 찾을 수 없습니다: {section_type}")
        entry = {**template, "_order": i}
        sections.append(entry)

    logger.info(f"v2 페이지 구성 완료: {len(sections)}개 (hero_banner, feature_badges, description, feature_point x {feature_point_count})")
    return sections
