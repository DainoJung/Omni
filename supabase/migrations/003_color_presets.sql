-- ============================================================
-- PDP Maker - 컬러 프리셋 테이블 + 프로젝트 스타일 컬럼 추가
-- ============================================================

-- 1. 컬러 프리셋 테이블
CREATE TABLE color_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    primary_color VARCHAR(9) NOT NULL,
    secondary_color VARCHAR(9) NOT NULL,
    accent_color VARCHAR(9) NOT NULL,
    background_color VARCHAR(9) NOT NULL,
    text_color VARCHAR(9) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS (PoC: 공개 읽기 허용)
ALTER TABLE color_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for color_presets" ON color_presets
    FOR SELECT USING (true);

CREATE POLICY "Allow all for color_presets" ON color_presets
    FOR ALL USING (true) WITH CHECK (true);

-- 3. 5개 프리셋 시드 데이터
INSERT INTO color_presets (name, primary_color, secondary_color, accent_color, background_color, text_color, category) VALUES
    ('모던블랙', '#1A1A1A', '#F5F5F5', '#E53935', '#FFFFFF', '#1A1A1A', 'fashion'),
    ('럭셔리골드', '#C9A962', '#1A1A1A', '#FFFFFF', '#1A1A1A', '#FFFFFF', 'luxury'),
    ('클린화이트', '#333333', '#F0F0F0', '#2196F3', '#FFFFFF', '#333333', 'general'),
    ('네이처그린', '#4A7C59', '#F5F0E8', '#8B7355', '#FDFBF7', '#3D3D3D', 'food'),
    ('프레시코랄', '#E8A0BF', '#FFF5F8', '#9B2335', '#FFF5F8', '#4A4A4A', 'beauty');

-- 4. projects 테이블에 스타일 관련 컬럼 추가
ALTER TABLE projects
    ADD COLUMN color_preset_id UUID REFERENCES color_presets(id),
    ADD COLUMN tone_manner JSONB;

-- 5. 인덱스
CREATE INDEX idx_color_presets_category ON color_presets(category);
