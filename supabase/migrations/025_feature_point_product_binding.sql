-- feature_point: point_label → 브랜드명 (product source, bind_to brand_name)
UPDATE section_templates
SET placeholders = jsonb_set(
  jsonb_set(
    jsonb_set(placeholders, '{0,source}', '"product"'),
    '{0,bind_to}', '"brand_name"'
  ),
  '{0,label}', '"브랜드명"'
)
WHERE section_type = 'feature_point';

-- feature_point: point_title_main → 상품명 (product source, bind_to product_name)
UPDATE section_templates
SET placeholders = jsonb_set(
  jsonb_set(
    jsonb_set(placeholders, '{1,source}', '"product"'),
    '{1,bind_to}', '"product_name"'
  ),
  '{1,label}', '"상품명"'
)
WHERE section_type = 'feature_point';

-- feature_point: section_image → 상품 원본 이미지 + 누끼 제거 (product source, bg_remove)
UPDATE section_templates
SET placeholders = jsonb_set(
  jsonb_set(placeholders, '{4,source}', '"product"'),
  '{4,bg_remove}', 'true'
)
WHERE section_type = 'feature_point';

-- feature_point: 이미지 CSS → 누끼 제거된 상품 이미지 정중앙 정렬
UPDATE section_templates
SET css_template = REPLACE(
  css_template,
  '.s-point__image {
  align-self: stretch;
  height: 957px;
  object-fit: cover;
  background: #f5f5f5;
}',
  '.s-point__image {
  width: 700px;
  height: 900px;
  object-fit: contain;
  align-self: center;
  background: #ffffff;
}'
)
WHERE section_type = 'feature_point';
