-- ================================================================
-- v5.1 멀티 섹션 PDP 시스템 마이그레이션
-- section_templates 테이블 + projects.rendered_sections 컬럼
-- ================================================================

-- 1. section_templates 테이블 생성
CREATE TABLE IF NOT EXISTS section_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type VARCHAR(50) NOT NULL,          -- hero_banner | product_showcase | detail_info | benefits | cta_footer
    variant VARCHAR(50),                        -- product_showcase: single | dual | triple
    name VARCHAR(100) NOT NULL,
    width INT NOT NULL DEFAULT 860,
    height INT NOT NULL,
    background_type VARCHAR(20) NOT NULL DEFAULT 'solid_color',  -- ai_image | solid_color
    background_config JSONB NOT NULL DEFAULT '{}',
    slots JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_section_templates_type ON section_templates(section_type);
CREATE INDEX IF NOT EXISTS idx_section_templates_active ON section_templates(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_section_templates_type_variant ON section_templates(section_type, COALESCE(variant, ''));

-- RLS
ALTER TABLE section_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "section_templates_select" ON section_templates FOR SELECT USING (true);

-- 2. projects 테이블에 rendered_sections 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rendered_sections JSONB;

-- 3. 시드 데이터: 7개 섹션 템플릿

-- hero_banner (500px, AI 배경 이미지)
INSERT INTO section_templates (section_type, variant, name, width, height, background_type, background_config, slots) VALUES
('hero_banner', NULL, '히어로 배너', 860, 500, 'ai_image', '{}', '[
  {"id": "campaign_copy", "type": "text", "label": "캠페인 카피", "x": 10, "y": 35, "width": 80, "height": 15, "editable": true, "style": {"fontSize": 42, "fontWeight": 700, "color": "#FFFFFF", "textAlign": "center"}},
  {"id": "subtitle", "type": "text", "label": "서브타이틀", "x": 15, "y": 55, "width": 70, "height": 10, "editable": true, "style": {"fontSize": 20, "fontWeight": 400, "color": "#FFFFFF", "textAlign": "center"}}
]');

-- product_showcase: single (600px)
INSERT INTO section_templates (section_type, variant, name, width, height, background_type, background_config, slots) VALUES
('product_showcase', 'single', '상품 쇼케이스 (1개)', 860, 600, 'solid_color', '{"color": "#FFFFFF"}', '[
  {"id": "product_image_0", "type": "image", "label": "상품 이미지", "x": 20, "y": 5, "width": 60, "height": 60, "editable": false},
  {"id": "product_name_0", "type": "text", "label": "상품명", "x": 15, "y": 70, "width": 70, "height": 10, "editable": true, "style": {"fontSize": 24, "fontWeight": 600, "color": "#1A1A1A", "textAlign": "center"}},
  {"id": "product_price_0", "type": "text", "label": "가격", "x": 25, "y": 82, "width": 50, "height": 10, "editable": true, "style": {"fontSize": 28, "fontWeight": 700, "color": "#E53E3E", "textAlign": "center"}}
]');

-- product_showcase: dual (550px)
INSERT INTO section_templates (section_type, variant, name, width, height, background_type, background_config, slots) VALUES
('product_showcase', 'dual', '상품 쇼케이스 (2개)', 860, 550, 'solid_color', '{"color": "#FFFFFF"}', '[
  {"id": "product_image_0", "type": "image", "label": "상품1 이미지", "x": 5, "y": 5, "width": 42, "height": 55, "editable": false},
  {"id": "product_name_0", "type": "text", "label": "상품1명", "x": 5, "y": 63, "width": 42, "height": 10, "editable": true, "style": {"fontSize": 20, "fontWeight": 600, "color": "#1A1A1A", "textAlign": "center"}},
  {"id": "product_price_0", "type": "text", "label": "상품1 가격", "x": 5, "y": 76, "width": 42, "height": 10, "editable": true, "style": {"fontSize": 22, "fontWeight": 700, "color": "#E53E3E", "textAlign": "center"}},
  {"id": "product_image_1", "type": "image", "label": "상품2 이미지", "x": 53, "y": 5, "width": 42, "height": 55, "editable": false},
  {"id": "product_name_1", "type": "text", "label": "상품2명", "x": 53, "y": 63, "width": 42, "height": 10, "editable": true, "style": {"fontSize": 20, "fontWeight": 600, "color": "#1A1A1A", "textAlign": "center"}},
  {"id": "product_price_1", "type": "text", "label": "상품2 가격", "x": 53, "y": 76, "width": 42, "height": 10, "editable": true, "style": {"fontSize": 22, "fontWeight": 700, "color": "#E53E3E", "textAlign": "center"}}
]');

-- product_showcase: triple (550px)
INSERT INTO section_templates (section_type, variant, name, width, height, background_type, background_config, slots) VALUES
('product_showcase', 'triple', '상품 쇼케이스 (3개)', 860, 550, 'solid_color', '{"color": "#FFFFFF"}', '[
  {"id": "product_image_0", "type": "image", "label": "상품1 이미지", "x": 2, "y": 5, "width": 30, "height": 55, "editable": false},
  {"id": "product_name_0", "type": "text", "label": "상품1명", "x": 2, "y": 63, "width": 30, "height": 10, "editable": true, "style": {"fontSize": 18, "fontWeight": 600, "color": "#1A1A1A", "textAlign": "center"}},
  {"id": "product_price_0", "type": "text", "label": "상품1 가격", "x": 2, "y": 76, "width": 30, "height": 10, "editable": true, "style": {"fontSize": 20, "fontWeight": 700, "color": "#E53E3E", "textAlign": "center"}},
  {"id": "product_image_1", "type": "image", "label": "상품2 이미지", "x": 35, "y": 5, "width": 30, "height": 55, "editable": false},
  {"id": "product_name_1", "type": "text", "label": "상품2명", "x": 35, "y": 63, "width": 30, "height": 10, "editable": true, "style": {"fontSize": 18, "fontWeight": 600, "color": "#1A1A1A", "textAlign": "center"}},
  {"id": "product_price_1", "type": "text", "label": "상품2 가격", "x": 35, "y": 76, "width": 30, "height": 10, "editable": true, "style": {"fontSize": 20, "fontWeight": 700, "color": "#E53E3E", "textAlign": "center"}},
  {"id": "product_image_2", "type": "image", "label": "상품3 이미지", "x": 68, "y": 5, "width": 30, "height": 55, "editable": false},
  {"id": "product_name_2", "type": "text", "label": "상품3명", "x": 68, "y": 63, "width": 30, "height": 10, "editable": true, "style": {"fontSize": 18, "fontWeight": 600, "color": "#1A1A1A", "textAlign": "center"}},
  {"id": "product_price_2", "type": "text", "label": "상품3 가격", "x": 68, "y": 76, "width": 30, "height": 10, "editable": true, "style": {"fontSize": 20, "fontWeight": 700, "color": "#E53E3E", "textAlign": "center"}}
]');

-- detail_info (400px)
INSERT INTO section_templates (section_type, variant, name, width, height, background_type, background_config, slots) VALUES
('detail_info', NULL, '상세 설명', 860, 400, 'solid_color', '{"color": "#F7F7F7"}', '[
  {"id": "detail_title", "type": "text", "label": "상세 제목", "x": 10, "y": 15, "width": 80, "height": 15, "editable": true, "style": {"fontSize": 28, "fontWeight": 700, "color": "#1A1A1A", "textAlign": "center"}},
  {"id": "detail_description", "type": "text", "label": "상세 설명", "x": 10, "y": 40, "width": 80, "height": 40, "editable": true, "style": {"fontSize": 16, "fontWeight": 400, "color": "#4A4A4A", "textAlign": "center", "lineHeight": 1.6}}
]');

-- benefits (350px)
INSERT INTO section_templates (section_type, variant, name, width, height, background_type, background_config, slots) VALUES
('benefits', NULL, '혜택 안내', 860, 350, 'solid_color', '{"color": "#FFFFFF"}', '[
  {"id": "benefit_1_title", "type": "text", "label": "혜택1 제목", "x": 3, "y": 10, "width": 28, "height": 12, "editable": true, "style": {"fontSize": 20, "fontWeight": 700, "color": "#1A1A1A", "textAlign": "center"}},
  {"id": "benefit_1_desc", "type": "text", "label": "혜택1 설명", "x": 3, "y": 30, "width": 28, "height": 50, "editable": true, "style": {"fontSize": 14, "fontWeight": 400, "color": "#6B6B6B", "textAlign": "center", "lineHeight": 1.5}},
  {"id": "benefit_2_title", "type": "text", "label": "혜택2 제목", "x": 36, "y": 10, "width": 28, "height": 12, "editable": true, "style": {"fontSize": 20, "fontWeight": 700, "color": "#1A1A1A", "textAlign": "center"}},
  {"id": "benefit_2_desc", "type": "text", "label": "혜택2 설명", "x": 36, "y": 30, "width": 28, "height": 50, "editable": true, "style": {"fontSize": 14, "fontWeight": 400, "color": "#6B6B6B", "textAlign": "center", "lineHeight": 1.5}},
  {"id": "benefit_3_title", "type": "text", "label": "혜택3 제목", "x": 69, "y": 10, "width": 28, "height": 12, "editable": true, "style": {"fontSize": 20, "fontWeight": 700, "color": "#1A1A1A", "textAlign": "center"}},
  {"id": "benefit_3_desc", "type": "text", "label": "혜택3 설명", "x": 69, "y": 30, "width": 28, "height": 50, "editable": true, "style": {"fontSize": 14, "fontWeight": 400, "color": "#6B6B6B", "textAlign": "center", "lineHeight": 1.5}}
]');

-- cta_footer (250px)
INSERT INTO section_templates (section_type, variant, name, width, height, background_type, background_config, slots) VALUES
('cta_footer', NULL, 'CTA 푸터', 860, 250, 'solid_color', '{"color": "#1A1A1A"}', '[
  {"id": "cta_text", "type": "text", "label": "CTA 문구", "x": 10, "y": 20, "width": 80, "height": 20, "editable": true, "style": {"fontSize": 24, "fontWeight": 600, "color": "#FFFFFF", "textAlign": "center"}},
  {"id": "cta_button_text", "type": "text", "label": "버튼 텍스트", "x": 30, "y": 55, "width": 40, "height": 20, "editable": true, "style": {"fontSize": 18, "fontWeight": 700, "color": "#FFFFFF", "textAlign": "center", "backgroundColor": "#E53E3E", "borderRadius": 8, "padding": "12px 24px"}}
]');
