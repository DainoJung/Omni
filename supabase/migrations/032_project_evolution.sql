-- Migration 032: Project schema evolution for global SaaS
-- Adds fields for URL scraping, AI analysis, global template system, and language support

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS product_url TEXT,
  ADD COLUMN IF NOT EXISTS analysis_result JSONB,
  ADD COLUMN IF NOT EXISTS template_style VARCHAR(50),
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ko';

-- Make page_type nullable for backward compatibility (new projects won't use SSG page types)
ALTER TABLE projects
  ALTER COLUMN page_type DROP NOT NULL;

-- Index for filtering by template style and language
CREATE INDEX IF NOT EXISTS idx_projects_template_style ON projects(template_style);
CREATE INDEX IF NOT EXISTS idx_projects_language ON projects(language);

COMMENT ON COLUMN projects.product_url IS 'Source product URL for scraping';
COMMENT ON COLUMN projects.analysis_result IS 'AI product analysis result JSON';
COMMENT ON COLUMN projects.template_style IS 'Global template style: clean_minimal, premium_luxury, bold_casual, tech_modern, organic_natural';
COMMENT ON COLUMN projects.language IS 'Content generation language (ko, en, etc.)';
