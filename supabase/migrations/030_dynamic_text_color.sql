-- ================================================================
-- 배경색 밝기 기반 동적 텍스트 색상
-- bg_color 밝기에 따라 텍스트 색상이 자동 전환됨
-- 어두운 배경 → 밝은 텍스트, 밝은 배경 → 어두운 텍스트
-- backend template_render_service.py에서 text_color/text_color_sub 자동 산출
-- ================================================================

-- ── promo_hero: 텍스트 색상을 {{text_color}} / {{text_color_sub}}로 교체 ──
UPDATE section_templates
SET
  css_template = '.s-phero, .s-phero * { box-sizing: border-box; }
.s-phero {
  display: flex;
  flex-direction: column;
  width: 860px;
  overflow: hidden;
}

/* ── 상단: 텍스트 영역 (단색 배경) ── */
.s-phero__text-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 100px 60px 80px;
}
.s-phero__script {
  color: {{theme_accent}};
  text-align: center;
  font-family: "Great Vibes", "Dancing Script", cursive;
  font-size: 64px;
  line-height: 130%;
  letter-spacing: 0.02em;
}
.s-phero__spacer-1 { height: 20px; }
.s-phero__category {
  color: {{text_color}};
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 800;
  font-size: 56px;
  line-height: 120%;
  letter-spacing: -0.02em;
}
.s-phero__spacer-2 { height: 16px; }
.s-phero__subtitle {
  color: {{text_color_sub}};
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 32px;
  line-height: 140%;
  letter-spacing: -0.01em;
}
.s-phero__spacer-3 { height: 10px; }
.s-phero__location {
  color: {{text_color_sub}};
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 26px;
  line-height: 140%;
}

/* ── 하단: 콘셉트 이미지 영역 ── */
.s-phero__image-area {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 1;
  overflow: hidden;
}
.s-phero__bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
  z-index: 0;
}
.s-phero__product-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 60px;
}
.s-phero__product {
  display: block;
  max-height: 75%;
  max-width: 60%;
  object-fit: contain;
}',

  placeholders = '[
  {"id": "hero_image", "type": "image", "label": "콘셉트 이미지", "editable": false, "source": "ai"},
  {"id": "script_title", "type": "text", "label": "필기체 타이틀", "editable": true, "source": "ai"},
  {"id": "category_title", "type": "text", "label": "카테고리 타이틀", "editable": true, "source": "ai"},
  {"id": "subtitle", "type": "text", "label": "서브타이틀", "editable": true, "source": "ai"},
  {"id": "location", "type": "text", "label": "위치 정보", "editable": true, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"},
  {"id": "text_color", "type": "text", "label": "텍스트 색상", "editable": false, "source": "theme"},
  {"id": "text_color_sub", "type": "text", "label": "보조 텍스트 색상", "editable": false, "source": "theme"},
  {"id": "theme_accent", "type": "text", "label": "액센트 색상", "editable": false, "source": "theme"}
]'

WHERE section_type = 'promo_hero';


-- ── product_card: 텍스트 색상을 {{text_color}} / {{text_color_sub}}로 교체 ──
UPDATE section_templates
SET
  css_template = '.s-pcard, .s-pcard * { box-sizing: border-box; }
.s-pcard {
  width: 860px;
  padding: 16px 60px;
}
.s-pcard__inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 48px;
}
.s-pcard[data-layout="right"] .s-pcard__inner {
  flex-direction: row-reverse;
}
.s-pcard__image-wrap {
  flex-shrink: 0;
}
.s-pcard__image {
  width: 420px;
  height: 420px;
  object-fit: contain;
}
.s-pcard__info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.s-pcard__brand {
  color: {{text_color_sub}};
  font-family: "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 28px;
  line-height: 140%;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.s-pcard__spacer-1 { height: 12px; }
.s-pcard__name {
  color: {{text_color}};
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 36px;
  line-height: 140%;
  letter-spacing: -0.01em;
}
.s-pcard__spacer-2 { height: 16px; }
.s-pcard__price {
  color: {{text_color}};
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 36px;
  line-height: 130%;
  letter-spacing: -0.02em;
}
.s-pcard__spacer-3 { height: 16px; }
.s-pcard__note {
  color: {{text_color_sub}};
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 24px;
  line-height: 150%;
}',

  placeholders = '[
  {"id": "product_image", "type": "image", "label": "상품 이미지", "source": "product", "editable": true, "bg_remove": true},
  {"id": "brand_name", "type": "text", "label": "브랜드명", "source": "product", "editable": true},
  {"id": "product_name", "type": "text", "label": "상품명", "source": "product", "editable": true},
  {"id": "product_price", "type": "text", "label": "가격", "source": "product", "editable": true},
  {"id": "product_note", "type": "text", "label": "혜택/메모", "editable": true, "source": "ai"},
  {"id": "layout_dir", "type": "text", "label": "레이아웃 방향", "source": "computed", "editable": false},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"},
  {"id": "text_color", "type": "text", "label": "텍스트 색상", "editable": false, "source": "theme"},
  {"id": "text_color_sub", "type": "text", "label": "보조 텍스트 색상", "editable": false, "source": "theme"}
]'

WHERE section_type = 'product_card';
