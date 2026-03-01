-- ============================================================
-- Omni v5.0 - 템플릿 기반 렌더링 마이그레이션
-- ============================================================

-- 1. themes 테이블 생성
CREATE TABLE IF NOT EXISTS themes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    background_prompt TEXT NOT NULL,
    copy_keywords TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. templates 테이블 새로 생성 (v5.0 슬롯 기반)
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    thumbnail_url VARCHAR(500),
    template_key VARCHAR(50) UNIQUE,
    product_count INT DEFAULT 1,
    slots JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. projects 테이블 v5.0 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS theme_id VARCHAR(50) REFERENCES themes(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_used VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS generated_data JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rendered_slots JSONB;
-- brand_name을 nullable로 변경 (v5.0에서는 불필요)
ALTER TABLE projects ALTER COLUMN brand_name DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN description DROP NOT NULL;

-- 4. themes 시드 데이터
INSERT INTO themes (id, name, icon, background_prompt, copy_keywords) VALUES
('holiday', '홀리데이', '🎄', '홀리데이 프로모션 배경, 크리스마스 트리, 따뜻한 조명, 축제 분위기, 고급스러운 골드 포인트, 텍스트 없이', ARRAY['특별한', '선물', '홀리데이', '시즌']),
('spring_sale', '봄 세일', '🌸', '봄 세일 배경, 벚꽃, 파스텔톤, 산뜻한 느낌, 부드러운 그라데이션, 텍스트 없이', ARRAY['새로운', '산뜻한', '봄', '시작']),
('summer_special', '여름 특가', '☀️', '여름 특가 배경, 시원한 블루톤, 청량감, 트로피컬 느낌, 밝고 활기찬, 텍스트 없이', ARRAY['시원한', '특별한', '여름', '할인']),
('autumn_new', '가을 신상', '🍂', '가을 신상 배경, 따뜻한 브라운톤, 단풍, 고급스러운 분위기, 우아한, 텍스트 없이', ARRAY['새로운', '트렌드', '가을', '신상품']),
('winter_promo', '겨울 프로모션', '❄️', '겨울 프로모션 배경, 눈꽃, 화이트 & 실버톤, 고급스러운 느낌, 아늑한 분위기, 텍스트 없이', ARRAY['따뜻한', '특별한', '겨울', '프로모션'])
ON CONFLICT (id) DO NOTHING;

-- 5. v5.0 템플릿 시드 데이터 (슬롯 기반)
INSERT INTO templates (name, category, width, height, template_key, product_count, slots, is_active) VALUES
('싱글 상품', 'general', 860, 1200, 'single_product', 1, '[
    {"id": "background", "type": "image", "label": "배경 이미지", "x": 0, "y": 0, "width": 100, "height": 100, "editable": false},
    {"id": "campaign_copy", "type": "text", "label": "캠페인 카피", "x": 10, "y": 8, "width": 80, "height": 10, "editable": true, "style": {"fontSize": 32, "fontWeight": 700, "color": "#FFFFFF", "textAlign": "center"}},
    {"id": "product_image_0", "type": "image", "label": "상품 이미지", "x": 20, "y": 25, "width": 60, "height": 45, "editable": true},
    {"id": "product_name_0", "type": "text", "label": "상품명", "x": 10, "y": 75, "width": 80, "height": 8, "editable": true, "style": {"fontSize": 24, "fontWeight": 600, "color": "#FFFFFF", "textAlign": "center"}},
    {"id": "product_price_0", "type": "text", "label": "가격", "x": 10, "y": 85, "width": 80, "height": 8, "editable": true, "style": {"fontSize": 28, "fontWeight": 700, "color": "#FFD700", "textAlign": "center"}}
]'::jsonb, true),
('듀얼 상품', 'general', 860, 1600, 'dual_product', 2, '[
    {"id": "background", "type": "image", "label": "배경 이미지", "x": 0, "y": 0, "width": 100, "height": 100, "editable": false},
    {"id": "campaign_copy", "type": "text", "label": "캠페인 카피", "x": 10, "y": 5, "width": 80, "height": 8, "editable": true, "style": {"fontSize": 32, "fontWeight": 700, "color": "#FFFFFF", "textAlign": "center"}},
    {"id": "product_image_0", "type": "image", "label": "상품 1 이미지", "x": 5, "y": 18, "width": 42, "height": 35, "editable": true},
    {"id": "product_name_0", "type": "text", "label": "상품 1 이름", "x": 5, "y": 55, "width": 42, "height": 6, "editable": true, "style": {"fontSize": 20, "fontWeight": 600, "color": "#FFFFFF", "textAlign": "center"}},
    {"id": "product_price_0", "type": "text", "label": "상품 1 가격", "x": 5, "y": 62, "width": 42, "height": 6, "editable": true, "style": {"fontSize": 24, "fontWeight": 700, "color": "#FFD700", "textAlign": "center"}},
    {"id": "product_image_1", "type": "image", "label": "상품 2 이미지", "x": 53, "y": 18, "width": 42, "height": 35, "editable": true},
    {"id": "product_name_1", "type": "text", "label": "상품 2 이름", "x": 53, "y": 55, "width": 42, "height": 6, "editable": true, "style": {"fontSize": 20, "fontWeight": 600, "color": "#FFFFFF", "textAlign": "center"}},
    {"id": "product_price_1", "type": "text", "label": "상품 2 가격", "x": 53, "y": 62, "width": 42, "height": 6, "editable": true, "style": {"fontSize": 24, "fontWeight": 700, "color": "#FFD700", "textAlign": "center"}}
]'::jsonb, true),
('트리플 상품', 'general', 860, 2000, 'triple_product', 3, '[
    {"id": "background", "type": "image", "label": "배경 이미지", "x": 0, "y": 0, "width": 100, "height": 100, "editable": false},
    {"id": "campaign_copy", "type": "text", "label": "캠페인 카피", "x": 10, "y": 4, "width": 80, "height": 6, "editable": true, "style": {"fontSize": 32, "fontWeight": 700, "color": "#FFFFFF", "textAlign": "center"}},
    {"id": "product_image_0", "type": "image", "label": "상품 1 이미지", "x": 5, "y": 14, "width": 28, "height": 28, "editable": true},
    {"id": "product_name_0", "type": "text", "label": "상품 1 이름", "x": 5, "y": 44, "width": 28, "height": 5, "editable": true, "style": {"fontSize": 18, "fontWeight": 600, "color": "#FFFFFF", "textAlign": "center"}},
    {"id": "product_price_0", "type": "text", "label": "상품 1 가격", "x": 5, "y": 50, "width": 28, "height": 5, "editable": true, "style": {"fontSize": 22, "fontWeight": 700, "color": "#FFD700", "textAlign": "center"}},
    {"id": "product_image_1", "type": "image", "label": "상품 2 이미지", "x": 36, "y": 14, "width": 28, "height": 28, "editable": true},
    {"id": "product_name_1", "type": "text", "label": "상품 2 이름", "x": 36, "y": 44, "width": 28, "height": 5, "editable": true, "style": {"fontSize": 18, "fontWeight": 600, "color": "#FFFFFF", "textAlign": "center"}},
    {"id": "product_price_1", "type": "text", "label": "상품 2 가격", "x": 36, "y": 50, "width": 28, "height": 5, "editable": true, "style": {"fontSize": 22, "fontWeight": 700, "color": "#FFD700", "textAlign": "center"}},
    {"id": "product_image_2", "type": "image", "label": "상품 3 이미지", "x": 67, "y": 14, "width": 28, "height": 28, "editable": true},
    {"id": "product_name_2", "type": "text", "label": "상품 3 이름", "x": 67, "y": 44, "width": 28, "height": 5, "editable": true, "style": {"fontSize": 18, "fontWeight": 600, "color": "#FFFFFF", "textAlign": "center"}},
    {"id": "product_price_2", "type": "text", "label": "상품 3 가격", "x": 67, "y": 50, "width": 28, "height": 5, "editable": true, "style": {"fontSize": 22, "fontWeight": 700, "color": "#FFD700", "textAlign": "center"}}
]'::jsonb, true)
ON CONFLICT (template_key) DO NOTHING;

-- 6. RLS
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for themes" ON themes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for templates" ON templates FOR ALL USING (true) WITH CHECK (true);

-- 7. 인덱스
CREATE INDEX IF NOT EXISTS idx_templates_template_key ON templates(template_key);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_projects_theme_id ON projects(theme_id);
