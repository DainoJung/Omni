-- ================================================================
-- promo_hero: 텍스트/이미지 영역 분리 레이아웃
-- 상단: 단색 bg_color 배경 + 텍스트
-- 하단: AI 배경 이미지 + 상품 누끼 오버레이
-- ================================================================

UPDATE section_templates
SET
  html_template = '<div class="s-phero">
  <div class="s-phero__text-area" style="background-color: {{bg_color}};">
    <div class="s-phero__script" data-placeholder="script_title" data-editable="true">{{script_title}}</div>
    <div class="s-phero__spacer-1"></div>
    <div class="s-phero__category" data-placeholder="category_title" data-editable="true">{{category_title}}</div>
    <div class="s-phero__spacer-2"></div>
    <div class="s-phero__subtitle" data-placeholder="subtitle" data-editable="true">{{subtitle}}</div>
    <div class="s-phero__spacer-3"></div>
    <div class="s-phero__location" data-placeholder="location" data-editable="true">{{location}}</div>
  </div>
  <div class="s-phero__image-area">
    <img class="s-phero__bg" src="{{hero_image}}" data-placeholder="hero_image" />
    <div class="s-phero__product-area">
      <img class="s-phero__product" src="{{product_image_0}}" data-placeholder="product_image_0" />
    </div>
  </div>
</div>',

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
  padding: 72px 60px 52px;
}
.s-phero__script {
  color: #D4A574;
  text-align: center;
  font-family: "Great Vibes", "Dancing Script", cursive;
  font-size: 64px;
  line-height: 130%;
  letter-spacing: 0.02em;
}
.s-phero__spacer-1 { height: 20px; }
.s-phero__category {
  color: #FFFFFF;
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 800;
  font-size: 56px;
  line-height: 120%;
  letter-spacing: -0.02em;
}
.s-phero__spacer-2 { height: 16px; }
.s-phero__subtitle {
  color: rgba(255,255,255,0.9);
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 32px;
  line-height: 140%;
  letter-spacing: -0.01em;
}
.s-phero__spacer-3 { height: 10px; }
.s-phero__location {
  color: rgba(255,255,255,0.75);
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 26px;
  line-height: 140%;
}

/* ── 하단: 이미지 영역 (AI 배경 + 상품 누끼) ── */
.s-phero__image-area {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
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
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 0 60px;
  height: 75%;
}
.s-phero__product {
  display: block;
  max-height: 100%;
  max-width: 80%;
  object-fit: contain;
}',

  placeholders = '[
  {"id": "hero_image", "type": "image", "label": "배경 이미지", "editable": false, "source": "ai"},
  {"id": "script_title", "type": "text", "label": "필기체 타이틀", "editable": true, "source": "ai"},
  {"id": "category_title", "type": "text", "label": "카테고리 타이틀", "editable": true, "source": "ai"},
  {"id": "subtitle", "type": "text", "label": "서브타이틀", "editable": true, "source": "ai"},
  {"id": "location", "type": "text", "label": "위치 정보", "editable": true, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"},
  {"id": "product_image_0", "type": "image", "label": "대표 상품 이미지", "source": "product", "bg_remove": true, "editable": true}
]'

WHERE section_type = 'promo_hero';
