-- ============================================================
-- PDP Maker - 템플릿 시드 데이터 (식품 + 패션)
-- ============================================================

-- 1. 식품 프로모션 템플릿
INSERT INTO templates (name, category, width, height, structure, styles) VALUES (
    '식품 프로모션',
    'food',
    860,
    3200,
    '[
        {
            "id": "header",
            "type": "banner",
            "position": {"y": 0, "height": 600},
            "elements": [
                {"type": "image", "id": "banner_img", "editable": true, "position": {"x": 0, "y": 0, "w": 860, "h": 400}},
                {"type": "text", "id": "main_copy", "editable": true, "position": {"x": 40, "y": 420, "w": 780}},
                {"type": "text", "id": "sub_copy", "editable": true, "position": {"x": 40, "y": 480, "w": 780}},
                {"type": "text", "id": "event_period", "editable": true, "position": {"x": 40, "y": 530, "w": 780}}
            ]
        },
        {
            "id": "products",
            "type": "grid",
            "position": {"y": 648, "height": 1504},
            "grid": {"columns": 2, "gap": 20, "padding": 40},
            "elements": [
                {"type": "product_card", "id": "product_1", "editable": true},
                {"type": "product_card", "id": "product_2", "editable": true},
                {"type": "product_card", "id": "product_3", "editable": true},
                {"type": "product_card", "id": "product_4", "editable": true}
            ]
        },
        {
            "id": "benefits",
            "type": "text_block",
            "position": {"y": 2200, "height": 600},
            "elements": [
                {"type": "text", "id": "benefits_title", "editable": false, "value": "특별 혜택"},
                {"type": "text", "id": "benefit_1", "editable": true},
                {"type": "text", "id": "benefit_2", "editable": true},
                {"type": "button", "id": "cta", "editable": true}
            ]
        },
        {
            "id": "footer",
            "type": "text_block",
            "position": {"y": 2800, "height": 400},
            "elements": [
                {"type": "text", "id": "hashtags", "editable": true},
                {"type": "text", "id": "disclaimer", "editable": false, "value": "※ 이미지는 실제와 다를 수 있습니다.\n※ 행사 기간은 변경될 수 있습니다."},
                {"type": "text", "id": "contact", "editable": false, "value": "문의: 신세계백화점 고객센터 1588-1234"}
            ]
        }
    ]'::jsonb,
    '{
        "background_color": "#FFFDF7",
        "primary_color": "#8B4513",
        "secondary_color": "#D4A574",
        "accent_color": "#C41E3A",
        "text_color": "#3D2B1F",
        "divider_color": "#E8D5B7",
        "font_family_title": "Noto Serif KR",
        "font_family_body": "Noto Sans KR",
        "font_sizes": {
            "main_copy": 48,
            "sub_copy": 24,
            "body": 16,
            "price": 32,
            "caption": 13,
            "cta": 18
        }
    }'::jsonb
);

-- 2. 패션 룩북 템플릿
INSERT INTO templates (name, category, width, height, structure, styles) VALUES (
    '패션 룩북',
    'fashion',
    860,
    4000,
    '[
        {
            "id": "hero",
            "type": "banner",
            "position": {"y": 0, "height": 800},
            "elements": [
                {"type": "image", "id": "hero_img", "editable": true, "position": {"x": 0, "y": 0, "w": 860, "h": 600}},
                {"type": "text", "id": "main_copy", "editable": true, "position": {"x": 40, "y": 640, "w": 780}},
                {"type": "divider", "id": "title_divider", "position": {"x": 390, "y": 700, "w": 80}},
                {"type": "text", "id": "sub_copy", "editable": true, "position": {"x": 40, "y": 730, "w": 780}}
            ]
        },
        {
            "id": "lookbook",
            "type": "alternating",
            "position": {"y": 800, "height": 1600},
            "elements": [
                {"type": "image", "id": "look_1_img", "editable": true, "position": {"x": 0, "y": 0, "w": 860, "h": 500}},
                {"type": "text", "id": "body_text_1", "editable": true, "position": {"x": 40, "y": 540, "w": 780}},
                {"type": "image", "id": "look_2_img", "editable": true, "position": {"x": 0, "y": 700, "w": 860, "h": 500}},
                {"type": "text", "id": "body_text_2", "editable": true, "position": {"x": 40, "y": 1240, "w": 780}}
            ]
        },
        {
            "id": "products",
            "type": "zigzag",
            "position": {"y": 2400, "height": 1000},
            "elements": [
                {"type": "image", "id": "product_1_img", "editable": true, "position": {"x": 0, "y": 0, "w": 380, "h": 480}},
                {"type": "text", "id": "product_1_name", "editable": true, "position": {"x": 420, "y": 40}},
                {"type": "text", "id": "product_1_desc", "editable": true, "position": {"x": 420, "y": 80}},
                {"type": "text", "id": "product_1_price", "editable": true, "position": {"x": 420, "y": 140}},
                {"type": "text", "id": "product_2_name", "editable": true, "position": {"x": 40, "y": 540}},
                {"type": "text", "id": "product_2_desc", "editable": true, "position": {"x": 40, "y": 580}},
                {"type": "text", "id": "product_2_price", "editable": true, "position": {"x": 40, "y": 640}},
                {"type": "image", "id": "product_2_img", "editable": true, "position": {"x": 480, "y": 500, "w": 380, "h": 480}}
            ]
        },
        {
            "id": "cta_footer",
            "type": "text_block",
            "position": {"y": 3400, "height": 600},
            "elements": [
                {"type": "button", "id": "cta", "editable": true},
                {"type": "text", "id": "hashtags", "editable": true},
                {"type": "text", "id": "disclaimer", "editable": false, "value": "※ 이미지는 실제와 다를 수 있습니다.\n※ 행사 기간은 변경될 수 있습니다."}
            ]
        }
    ]'::jsonb,
    '{
        "background_color": "#FFFFFF",
        "primary_color": "#000000",
        "secondary_color": "#1A1A1A",
        "accent_color": "#B8860B",
        "text_color": "#333333",
        "divider_color": "#E0E0E0",
        "font_family_title": "Noto Serif KR",
        "font_family_body": "Noto Sans KR",
        "font_sizes": {
            "main_copy": 48,
            "sub_copy": 20,
            "body": 16,
            "price": 32,
            "caption": 13,
            "cta": 18
        },
        "letter_spacing": {
            "main_copy": "4px",
            "hashtags": "2px"
        }
    }'::jsonb
);
