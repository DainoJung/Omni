-- ================================================================
-- 상품 이미지 placeholder에 bg_remove 플래그 추가
-- fit_product_trio: product_image_0/1/2
-- product_card: product_image
-- ================================================================

-- fit_product_trio: 상품 이미지에 bg_remove: true 추가
UPDATE section_templates
SET placeholders = '[
  {"id": "product_image_0", "type": "image", "label": "상품1 이미지", "editable": false, "source": "product", "bg_remove": true},
  {"id": "product_name_0", "type": "text", "label": "상품1 이름", "editable": true, "source": "product"},
  {"id": "product_desc_0", "type": "text", "label": "상품1 설명", "editable": true, "source": "ai"},
  {"id": "product_price_0", "type": "text", "label": "상품1 가격", "editable": true, "source": "product"},
  {"id": "product_image_1", "type": "image", "label": "상품2 이미지", "editable": false, "source": "product", "bg_remove": true},
  {"id": "product_name_1", "type": "text", "label": "상품2 이름", "editable": true, "source": "product"},
  {"id": "product_desc_1", "type": "text", "label": "상품2 설명", "editable": true, "source": "ai"},
  {"id": "product_price_1", "type": "text", "label": "상품2 가격", "editable": true, "source": "product"},
  {"id": "product_image_2", "type": "image", "label": "상품3 이미지", "editable": false, "source": "product", "bg_remove": true},
  {"id": "product_name_2", "type": "text", "label": "상품3 이름", "editable": true, "source": "product"},
  {"id": "product_desc_2", "type": "text", "label": "상품3 설명", "editable": true, "source": "ai"},
  {"id": "product_price_2", "type": "text", "label": "상품3 가격", "editable": true, "source": "product"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]'
WHERE section_type = 'fit_product_trio';

-- product_card: 상품 이미지에 bg_remove: true 추가
UPDATE section_templates
SET placeholders = '[
  {"id": "product_image", "type": "image", "label": "상품 이미지", "editable": false, "source": "product", "bg_remove": true},
  {"id": "brand_name", "type": "text", "label": "브랜드명", "editable": true, "source": "product"},
  {"id": "product_name", "type": "text", "label": "상품명", "editable": true, "source": "product"},
  {"id": "product_price", "type": "text", "label": "가격", "editable": true, "source": "product"},
  {"id": "product_note", "type": "text", "label": "혜택/메모", "editable": true, "source": "ai"},
  {"id": "layout_dir", "type": "text", "label": "레이아웃 방향", "editable": false, "source": "computed"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]'
WHERE section_type = 'product_card';
