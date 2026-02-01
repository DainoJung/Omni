-- projects 테이블에 selected_sections 컬럼 추가
-- 사용자가 생성 시 선택한 섹션 목록 저장
ALTER TABLE projects ADD COLUMN IF NOT EXISTS selected_sections JSONB DEFAULT NULL;
