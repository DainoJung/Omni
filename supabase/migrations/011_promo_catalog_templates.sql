-- ================================================================
-- 프로모션 카탈로그 템플릿: promo_hero + product_card
-- 다수 상품 나열용 카탈로그 스타일 페이지
-- ================================================================

-- ── promo_hero ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('promo_hero', '프로모 헤더',
-- HTML
'<div class="s-phero" style="background-color: {{bg_color}};">
  <div class="s-phero__top">
    <div class="s-phero__script" data-placeholder="script_title" data-editable="true">{{script_title}}</div>
    <div class="s-phero__spacer-1"></div>
    <div class="s-phero__category" data-placeholder="category_title" data-editable="true">{{category_title}}</div>
    <div class="s-phero__spacer-2"></div>
    <div class="s-phero__subtitle" data-placeholder="subtitle" data-editable="true">{{subtitle}}</div>
    <div class="s-phero__spacer-3"></div>
    <div class="s-phero__location" data-placeholder="location" data-editable="true">{{location}}</div>
  </div>
  <div class="s-phero__spacer-4"></div>
  <img class="s-phero__image" src="{{hero_image}}" data-placeholder="hero_image" />
</div>',
-- CSS
'.s-phero, .s-phero * { box-sizing: border-box; }
.s-phero {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 860px;
  padding: 80px 60px 0;
  position: relative;
  overflow: hidden;
}
.s-phero__top {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.s-phero__script {
  color: #D4A574;
  text-align: center;
  font-family: "Great Vibes", "Dancing Script", cursive;
  font-size: 64px;
  line-height: 130%;
  letter-spacing: 0.02em;
}
.s-phero__spacer-1 { height: 24px; }
.s-phero__category {
  color: #FFFFFF;
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 800;
  font-size: 72px;
  line-height: 120%;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}
.s-phero__spacer-2 { height: 20px; }
.s-phero__subtitle {
  color: rgba(255,255,255,0.85);
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 36px;
  line-height: 140%;
  letter-spacing: -0.01em;
}
.s-phero__spacer-3 { height: 12px; }
.s-phero__location {
  color: rgba(255,255,255,0.6);
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 28px;
  line-height: 140%;
}
.s-phero__spacer-4 { height: 60px; }
.s-phero__image {
  display: block;
  width: calc(100% + 120px);
  margin-left: -60px;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}',
-- placeholders
'[
  {"id": "script_title", "type": "text", "label": "필기체 타이틀", "editable": true, "source": "ai"},
  {"id": "category_title", "type": "text", "label": "카테고리 타이틀", "editable": true, "source": "ai"},
  {"id": "subtitle", "type": "text", "label": "서브타이틀", "editable": true, "source": "ai"},
  {"id": "location", "type": "text", "label": "위치 정보", "editable": true, "source": "ai"},
  {"id": "hero_image", "type": "image", "label": "히어로 이미지", "editable": false, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]');

-- ── product_card ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('product_card', '상품 카드',
-- HTML
'<div class="s-pcard" style="background-color: {{bg_color}};" data-layout="{{layout_dir}}">
  <div class="s-pcard__inner">
    <div class="s-pcard__image-wrap">
      <img class="s-pcard__image" src="{{product_image}}" data-placeholder="product_image" />
    </div>
    <div class="s-pcard__info">
      <div class="s-pcard__brand" data-placeholder="brand_name" data-editable="true">{{brand_name}}</div>
      <div class="s-pcard__spacer-1"></div>
      <div class="s-pcard__name" data-placeholder="product_name" data-editable="true">{{product_name}}</div>
      <div class="s-pcard__spacer-2"></div>
      <div class="s-pcard__price" data-placeholder="product_price" data-editable="true">{{product_price}}</div>
      <div class="s-pcard__spacer-3"></div>
      <div class="s-pcard__note" data-placeholder="product_note" data-editable="true">{{product_note}}</div>
    </div>
  </div>
</div>',
-- CSS
'.s-pcard, .s-pcard * { box-sizing: border-box; }
.s-pcard {
  width: 860px;
  padding: 40px 60px;
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
  width: 350px;
  height: 350px;
  object-fit: contain;
}
.s-pcard__info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.s-pcard__brand {
  color: rgba(255,255,255,0.7);
  font-family: "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 28px;
  line-height: 140%;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.s-pcard__spacer-1 { height: 12px; }
.s-pcard__name {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 36px;
  line-height: 140%;
  letter-spacing: -0.01em;
}
.s-pcard__spacer-2 { height: 16px; }
.s-pcard__price {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 800;
  font-size: 42px;
  line-height: 130%;
  letter-spacing: -0.02em;
}
.s-pcard__spacer-3 { height: 16px; }
.s-pcard__note {
  color: rgba(255,255,255,0.6);
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 24px;
  line-height: 150%;
}',
-- placeholders
'[
  {"id": "product_image", "type": "image", "label": "상품 이미지", "editable": false, "source": "product"},
  {"id": "brand_name", "type": "text", "label": "브랜드명", "editable": true, "source": "product"},
  {"id": "product_name", "type": "text", "label": "상품명", "editable": true, "source": "product"},
  {"id": "product_price", "type": "text", "label": "가격", "editable": true, "source": "product"},
  {"id": "product_note", "type": "text", "label": "혜택/메모", "editable": true, "source": "ai"},
  {"id": "layout_dir", "type": "text", "label": "레이아웃 방향", "editable": false, "source": "computed"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]');
