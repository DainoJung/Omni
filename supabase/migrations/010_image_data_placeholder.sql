-- ================================================================
-- 이미지 태그에 data-placeholder 속성 추가
-- 이미지 클릭 → 선택 → 재생성 기능을 위해 필요
-- ================================================================

-- hero_banner: hero_bg_image
UPDATE section_templates
SET html_template = REPLACE(
  html_template,
  '<img class="s-hero__bg" src="{{hero_bg_image}}" />',
  '<img class="s-hero__bg" data-placeholder="hero_bg_image" src="{{hero_bg_image}}" />'
)
WHERE section_type = 'hero_banner';

-- description: section_image
UPDATE section_templates
SET html_template = REPLACE(
  html_template,
  '<img class="s-desc__image" src="{{section_image}}" />',
  '<img class="s-desc__image" data-placeholder="section_image" src="{{section_image}}" />'
)
WHERE section_type = 'description';

-- feature_point: section_image
UPDATE section_templates
SET html_template = REPLACE(
  html_template,
  '<img class="s-point__image" src="{{section_image}}" />',
  '<img class="s-point__image" data-placeholder="section_image" src="{{section_image}}" />'
)
WHERE section_type = 'feature_point';
