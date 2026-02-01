"""v5.2 HTML 템플릿 렌더링 서비스: placeholder 치환 방식"""

import logging

logger = logging.getLogger(__name__)


def render_section(
    section_template: dict,
    order: int,
    data: dict[str, str],
) -> dict:
    """섹션 템플릿 + 바인딩 데이터 → RenderedSection dict를 반환한다.

    Args:
        section_template: section_templates 테이블 행
        order: 섹션 순서 (0-based)
        data: placeholder id → 값 매핑
    """
    section_type = section_template["section_type"]
    section_id = f"{section_type}_{order}"

    result = {
        "section_id": section_id,
        "section_type": section_type,
        "order": order,
        "template_id": section_template["id"],
        "html_template": section_template["html_template"],
        "css": section_template["css_template"],
        "data": data,
    }

    logger.info(f"섹션 렌더링: {section_id} ({len(data)}개 데이터)")
    return result


def bind_section_data(
    section_template: dict,
    section_texts: dict,
    theme: dict,
    product_image_urls: list[str],
    section_image_urls: dict[str, str] | None = None,
) -> dict[str, str]:
    """placeholder 메타 정보를 기반으로 데이터를 매핑한다.

    Args:
        section_template: section_templates 테이블 행
        section_texts: AI가 생성한 텍스트 딕셔너리
        theme: 테마 정보 (accent_color 포함)
        product_image_urls: 상품 이미지 URL 목록
        section_image_urls: 섹션별 AI 생성 이미지 URL
            (예: {"hero_banner": "...", "description": "...", "feature_point": "..."})

    Returns:
        placeholder id → 값 매핑 딕셔너리
    """
    placeholders = section_template.get("placeholders", [])
    section_type = section_template.get("section_type", "")
    accent_color = theme.get("accent_color", "#FF0000")
    section_image_urls = section_image_urls or {}
    data: dict[str, str] = {}

    for ph in placeholders:
        ph_id = ph["id"]
        ph_type = ph["type"]
        source = ph.get("source", "ai")

        if source == "theme":
            if ph_id == "theme_accent":
                data[ph_id] = accent_color
            else:
                data[ph_id] = accent_color

        elif source == "ai":
            if ph_type == "image":
                # AI 생성 섹션 이미지 (hero_banner, description, feature_point)
                ai_url = section_image_urls.get(section_type, "")
                if ai_url:
                    data[ph_id] = ai_url
                elif product_image_urls:
                    data[ph_id] = product_image_urls[0]
                else:
                    data[ph_id] = ""
            elif ph_type == "html":
                if ph_id == "hashtags_html":
                    hashtags = section_texts.get("hashtags", [])
                    if isinstance(hashtags, list):
                        pills = "".join(
                            f'<div class="s-desc__tag">{tag}</div>'
                            for tag in hashtags
                        )
                        data[ph_id] = pills
                    else:
                        data[ph_id] = str(hashtags)
                else:
                    data[ph_id] = section_texts.get(ph_id, "")
            else:
                data[ph_id] = section_texts.get(ph_id, "")

        elif source == "product":
            if ph_type == "image" and product_image_urls:
                data[ph_id] = product_image_urls[0]
            else:
                data[ph_id] = ""

        elif source == "static":
            data[ph_id] = ph.get("default", "")

        else:
            data[ph_id] = section_texts.get(ph_id, "")

    return data
