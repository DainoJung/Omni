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
    instance_index: int | None = None,
) -> dict[str, str]:
    """placeholder 메타 정보를 기반으로 데이터를 매핑한다.

    Args:
        section_template: section_templates 테이블 행
        section_texts: AI가 생성한 텍스트 딕셔너리
        theme: 테마 정보 (accent_color 포함)
        product_image_urls: 상품 이미지 URL 목록
        section_image_urls: 섹션별 AI 생성 이미지 URL
        instance_index: 중복 섹션의 인스턴스 인덱스 (None이면 단일 섹션)

    Returns:
        placeholder id → 값 매핑 딕셔너리
    """
    placeholders = section_template.get("placeholders", [])
    section_type = section_template.get("section_type", "")
    accent_color = theme.get("accent_color", "#FF0000")
    section_image_urls = section_image_urls or {}
    data: dict[str, str] = {}

    def _get_text(key: str) -> str:
        """인덱스 접미사가 있는 키 우선, 없으면 원본 키로 조회."""
        if instance_index is not None:
            indexed_key = f"{key}__{instance_index}"
            if indexed_key in section_texts:
                return section_texts[indexed_key]
        return section_texts.get(key, "")

    for ph in placeholders:
        ph_id = ph["id"]
        ph_type = ph["type"]
        source = ph.get("source", "ai")

        if source == "theme":
            data[ph_id] = accent_color

        elif source == "ai":
            if ph_type == "image":
                # 인스턴스 키 우선 조회 ("type__idx"), 없으면 타입 키
                if instance_index is not None:
                    ai_url = section_image_urls.get(
                        f"{section_type}__{instance_index}",
                        section_image_urls.get(section_type, ""),
                    )
                else:
                    ai_url = section_image_urls.get(section_type, "")
                if ai_url:
                    data[ph_id] = ai_url
                elif product_image_urls:
                    data[ph_id] = product_image_urls[0]
                else:
                    data[ph_id] = ""
            elif ph_type == "html":
                if ph_id == "hashtags_html":
                    hashtag_key = "hashtags"
                    if instance_index is not None:
                        indexed = f"hashtags__{instance_index}"
                        if indexed in section_texts:
                            hashtag_key = indexed
                    hashtags = section_texts.get(hashtag_key, [])
                    if isinstance(hashtags, list):
                        pills = "".join(
                            f'<div class="s-desc__tag">{tag}</div>'
                            for tag in hashtags
                        )
                        data[ph_id] = pills
                    else:
                        data[ph_id] = str(hashtags)
                else:
                    data[ph_id] = _get_text(ph_id)
            else:
                data[ph_id] = _get_text(ph_id)

        elif source == "product":
            if ph_type == "image" and product_image_urls:
                data[ph_id] = product_image_urls[0]
            else:
                data[ph_id] = ""

        elif source == "static":
            data[ph_id] = ph.get("default", "")

        else:
            data[ph_id] = _get_text(ph_id)

    return data
