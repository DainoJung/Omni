-- 모든 섹션의 이미지 placeholder source를 "ai"로 통합
-- hero_banner: hero_bg_image (index 0) "theme" → "ai"
-- description: section_image (index 4) "product" → "ai"
-- feature_point: section_image (index 4) "product" → "ai"

UPDATE section_templates
SET placeholders = jsonb_set(placeholders, '{0,source}', '"ai"')
WHERE section_type = 'hero_banner';

UPDATE section_templates
SET placeholders = jsonb_set(placeholders, '{4,source}', '"ai"')
WHERE section_type = 'description';

UPDATE section_templates
SET placeholders = jsonb_set(placeholders, '{4,source}', '"ai"')
WHERE section_type = 'feature_point';
