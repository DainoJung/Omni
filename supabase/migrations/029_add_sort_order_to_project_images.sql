-- project_images에 sort_order 컬럼 추가 (이미지 입력 순서 보장)
-- 병렬 업로드 시 created_at 순서가 비결정적이므로 명시적 순서 관리
ALTER TABLE project_images
ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
