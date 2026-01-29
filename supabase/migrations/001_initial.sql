-- ============================================================
-- POP Maker - 초기 스키마
-- ============================================================

-- 1. 템플릿 테이블
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    thumbnail_url VARCHAR(500),
    structure JSONB NOT NULL,
    styles JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 프로젝트 테이블
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'draft',

    brand_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50),
    event_period_start DATE,
    event_period_end DATE,
    price_info VARCHAR(200),

    template_id UUID REFERENCES templates(id),
    generated_content JSONB,
    edit_history JSONB DEFAULT '[]'::jsonb,
    output_url VARCHAR(500)
);

-- 3. 프로젝트 이미지 테이블
CREATE TABLE project_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    image_type VARCHAR(50),
    storage_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 인덱스
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created ON projects(created_at DESC);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_project_images_project ON project_images(project_id);

-- 5. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 6. RLS (PoC: 공개 접근 허용)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for projects" ON projects
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for templates" ON templates
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for project_images" ON project_images
    FOR ALL USING (true) WITH CHECK (true);

-- 7. Storage 버킷
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책
CREATE POLICY "Allow public read on project-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-images');

CREATE POLICY "Allow public upload on project-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-images');

CREATE POLICY "Allow public read on templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'templates');
