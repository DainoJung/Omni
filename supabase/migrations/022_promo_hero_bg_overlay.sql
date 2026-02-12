-- ================================================================
-- promo_hero: AI 배경 이미지 + 상품 누끼 오버레이 구조로 변경
-- AI는 배경만 생성, 대표 상품 1개를 bg-removal 처리하여 배경 위에 배치
-- ================================================================

UPDATE section_templates
SET
  html_template = '<div class="s-phero" style="background-color: {{bg_color}};">
  <img class="s-phero__bg" src="{{hero_image}}" data-placeholder="hero_image" />
  <div class="s-phero__overlay"></div>
  <div class="s-phero__top">
    <div class="s-phero__script" data-placeholder="script_title" data-editable="true">{{script_title}}</div>
    <div class="s-phero__spacer-1"></div>
    <div class="s-phero__category" data-placeholder="category_title" data-editable="true">{{category_title}}</div>
    <div class="s-phero__spacer-2"></div>
    <div class="s-phero__subtitle" data-placeholder="subtitle" data-editable="true">{{subtitle}}</div>
    <div class="s-phero__spacer-3"></div>
    <div class="s-phero__location" data-placeholder="location" data-editable="true">{{location}}</div>
  </div>
  <div class="s-phero__product-area">
    <img class="s-phero__product" src="{{product_image_0}}" data-placeholder="product_image_0" />
  </div>
</div>',

  css_template = '.s-phero, .s-phero * { box-sizing: border-box; }
.s-phero {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 860px;
  position: relative;
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
.s-phero__overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%);
  z-index: 1;
}
.s-phero__top {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 80px 60px 0;
  position: relative;
  z-index: 2;
}
.s-phero__script {
  color: #D4A574;
  text-align: center;
  font-family: "Great Vibes", "Dancing Script", cursive;
  font-size: 64px;
  line-height: 130%;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
  text-shadow: 0 2px 12px rgba(0,0,0,0.4);
}
.s-phero__spacer-2 { height: 20px; }
.s-phero__subtitle {
  color: rgba(255,255,255,0.9);
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 36px;
  line-height: 140%;
  letter-spacing: -0.01em;
  text-shadow: 0 1px 6px rgba(0,0,0,0.3);
}
.s-phero__spacer-3 { height: 12px; }
.s-phero__location {
  color: rgba(255,255,255,0.75);
  text-align: center;
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 28px;
  line-height: 140%;
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
.s-phero__product-area {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  width: 100%;
  padding: 40px 60px 0;
}
.s-phero__product {
  display: block;
  max-height: 500px;
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
