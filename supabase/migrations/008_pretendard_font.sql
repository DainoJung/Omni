-- 모든 섹션 템플릿 폰트를 Pretendard로 통합
-- BmDoHyeonOtf-Regular → Pretendard weight 800
-- SCoreDream-3Light → Pretendard weight 300
-- SCoreDream-5Medium → Pretendard weight 500
-- SCoreDream-6Bold → Pretendard weight 700

UPDATE section_templates
SET css_template = replace(
  replace(
    replace(css_template,
      '"BmDoHyeonOtf-Regular", sans-serif',
      '"Pretendard", sans-serif; font-weight: 800'),
    '"SCoreDream-3Light", sans-serif',
    '"Pretendard", sans-serif; font-weight: 300'),
  '"SCoreDream-5Medium", sans-serif',
  '"Pretendard", sans-serif; font-weight: 500')
WHERE section_type IN ('hero_banner', 'description');

UPDATE section_templates
SET css_template = replace(css_template,
  '"SCoreDream-5Medium", sans-serif',
  '"Pretendard", sans-serif; font-weight: 500')
WHERE section_type = 'feature_badges';

UPDATE section_templates
SET css_template = replace(
  replace(
    replace(css_template,
      '"BmDoHyeonOtf-Regular", sans-serif',
      '"Pretendard", sans-serif; font-weight: 800'),
    '"SCoreDream-5Medium", sans-serif',
    '"Pretendard", sans-serif; font-weight: 500'),
  '"SCoreDream-6Bold", sans-serif',
  '"Pretendard", sans-serif; font-weight: 700')
WHERE section_type = 'feature_point';
