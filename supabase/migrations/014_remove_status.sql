-- ============================================================
-- projects.status 컬럼 및 관련 인덱스 제거
-- ============================================================

-- 인덱스 제거
DROP INDEX IF EXISTS idx_projects_status;

-- status 컬럼 제거
ALTER TABLE projects DROP COLUMN IF EXISTS status;
