-- ================================================================
-- 고메트립 템플릿 InDesign 기반 리디자인
-- gourmet_hero UPDATE + gourmet_product INSERT
-- ================================================================

-- ── gourmet_hero UPDATE: InDesign 디자인 기반 리디자인 ──
UPDATE section_templates
SET
  name = '고메트립 히어로 (InDesign)',
  html_template = '<div class="s-gmh">
  <img class="s-gmh__bg" src="{{hero_image}}" data-placeholder="hero_image" />
  <div class="s-gmh__overlay"></div>
  <div class="s-gmh__content">
    <div class="s-gmh__title" data-placeholder="hero_title" data-editable="true">{{hero_title}}</div>
    <div class="s-gmh__spacer-1"></div>
    <div class="s-gmh__subtitle" data-placeholder="hero_subtitle" data-editable="true">{{hero_subtitle}}</div>
    <div class="s-gmh__spacer-2"></div>
    <div class="s-gmh__desc" data-placeholder="hero_desc" data-editable="true">{{hero_desc}}</div>
    <div class="s-gmh__spacer-3"></div>
    <div class="s-gmh__sub-desc" data-placeholder="hero_sub_desc" data-editable="true">{{hero_sub_desc}}</div>
    <div class="s-gmh__spacer-4"></div>
    <div class="s-gmh__tag">RESTAURANT &middot; WINE</div>
  </div>
</div>',
  css_template = '.s-gmh, .s-gmh * { box-sizing: border-box; }
.s-gmh {
  position: relative;
  width: 860px;
  height: 780px;
  overflow: hidden;
}
.s-gmh__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.s-gmh__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(135,58,48,0.05) 0%, rgba(135,58,48,0.35) 40%, rgba(135,58,48,0.75) 100%);
}
.s-gmh__content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 48px 56px;
  text-align: center;
}
.s-gmh__title {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 36px;
  line-height: 140%;
  letter-spacing: -0.01em;
}
.s-gmh__spacer-1 { height: 16px; }
.s-gmh__subtitle {
  color: rgba(255,255,255,0.92);
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 26px;
  line-height: 150%;
}
.s-gmh__spacer-2 { height: 14px; }
.s-gmh__desc {
  color: rgba(255,255,255,0.78);
  font-family: "Pretendard", sans-serif;
  font-weight: 300;
  font-size: 22px;
  line-height: 160%;
  white-space: pre-line;
}
.s-gmh__spacer-3 { height: 12px; }
.s-gmh__sub-desc {
  color: rgba(255,255,255,0.65);
  font-family: "Pretendard", sans-serif;
  font-weight: 300;
  font-size: 20px;
  line-height: 150%;
}
.s-gmh__spacer-4 { height: 24px; }
.s-gmh__tag {
  color: rgba(255,255,255,0.5);
  font-family: "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 16px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}',
  placeholders = '[
  {"id": "hero_title", "type": "text", "label": "메인 타이틀", "editable": true, "source": "ai"},
  {"id": "hero_subtitle", "type": "text", "label": "서브타이틀", "editable": true, "source": "ai"},
  {"id": "hero_desc", "type": "text", "label": "소개 문구", "editable": true, "source": "ai"},
  {"id": "hero_sub_desc", "type": "text", "label": "추가 설명", "editable": true, "source": "ai"},
  {"id": "hero_image", "type": "image", "label": "히어로 이미지", "editable": false, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]'
WHERE section_type = 'gourmet_hero';


-- ── gourmet_product: 고메트립 상품 카드 (InDesign 기반) ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('gourmet_product', '고메트립 상품 카드',
-- HTML
'<div class="s-gmp">
  <div class="s-gmp__image-wrap">
    <img class="s-gmp__image" src="{{product_image}}" data-placeholder="product_image" />
    <div class="s-gmp__image-overlay"></div>
    <div class="s-gmp__image-name" data-placeholder="product_name" data-editable="true">{{product_name}}</div>
  </div>
  <div class="s-gmp__body">
    <div class="s-gmp__note" data-placeholder="product_note" data-editable="true">{{product_note}}</div>
    <div class="s-gmp__spacer-1"></div>
    <div class="s-gmp__price" data-placeholder="product_price" data-editable="true">{{product_price}}</div>
  </div>
</div>',
-- CSS
'.s-gmp, .s-gmp * { box-sizing: border-box; }
.s-gmp {
  width: 860px;
  background: #FFFFFF;
  overflow: hidden;
}
.s-gmp__image-wrap {
  position: relative;
  width: 100%;
  height: 400px;
  overflow: hidden;
}
.s-gmp__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.s-gmp__image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%);
}
.s-gmp__image-name {
  position: absolute;
  bottom: 20px;
  left: 32px;
  right: 32px;
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 28px;
  line-height: 140%;
  z-index: 1;
}
.s-gmp__body {
  padding: 28px 32px 36px;
}
.s-gmp__note {
  color: #444444;
  font-family: "Pretendard", sans-serif;
  font-weight: 200;
  font-size: 22px;
  line-height: 160%;
  white-space: pre-line;
}
.s-gmp__spacer-1 { height: 16px; }
.s-gmp__price {
  color: #873a30;
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 26px;
  line-height: 130%;
}',
-- placeholders
'[
  {"id": "product_name", "type": "text", "label": "상품명", "editable": true, "source": "product"},
  {"id": "product_price", "type": "text", "label": "가격", "editable": true, "source": "product"},
  {"id": "product_image", "type": "image", "label": "상품 이미지", "editable": false, "source": "product"},
  {"id": "product_note", "type": "text", "label": "상품 설명", "editable": true, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]');
