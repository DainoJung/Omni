-- ================================================================
-- FIT 명절 템플릿: fit_hero + fit_event_info + fit_product_trio
-- IDML 0130 명절_FIT 템플릿3 기반 변환
-- ================================================================

-- ── fit_hero: 히어로 배너 (배경 이미지 + 브랜드 + 이벤트 타이틀 + 기간) ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('fit_hero', 'FIT 히어로 배너',
-- HTML
'<div class="s-fhero">
  <img class="s-fhero__bg" src="{{hero_image}}" data-placeholder="hero_image" />
  <div class="s-fhero__overlay"></div>
  <div class="s-fhero__content">
    <div class="s-fhero__brand" data-placeholder="brand_name" data-editable="true">{{brand_name}}</div>
    <div class="s-fhero__spacer-1"></div>
    <div class="s-fhero__title" data-placeholder="event_title" data-editable="true">{{event_title}}</div>
    <div class="s-fhero__spacer-2"></div>
    <div class="s-fhero__subtitle" data-placeholder="event_subtitle" data-editable="true">{{event_subtitle}}</div>
    <div class="s-fhero__spacer-3"></div>
    <div class="s-fhero__period" data-placeholder="event_period" data-editable="true">{{event_period}}</div>
  </div>
</div>',
-- CSS
'.s-fhero, .s-fhero * { box-sizing: border-box; }
.s-fhero {
  position: relative;
  width: 860px;
  height: 413px;
  overflow: hidden;
}
.s-fhero__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.s-fhero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 100%);
}
.s-fhero__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 48px 60px;
  text-align: center;
}
.s-fhero__brand {
  color: rgba(255,255,255,0.8);
  font-family: "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 24px;
  line-height: 140%;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.s-fhero__spacer-1 { height: 16px; }
.s-fhero__title {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 800;
  font-size: 56px;
  line-height: 120%;
  letter-spacing: -0.02em;
}
.s-fhero__spacer-2 { height: 12px; }
.s-fhero__subtitle {
  color: rgba(255,255,255,0.9);
  font-family: "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 28px;
  line-height: 140%;
}
.s-fhero__spacer-3 { height: 16px; }
.s-fhero__period {
  color: rgba(255,255,255,0.7);
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 22px;
  line-height: 140%;
  padding: 6px 20px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 4px;
}',
-- placeholders
'[
  {"id": "hero_image", "type": "image", "label": "히어로 배경 이미지", "editable": false, "source": "ai"},
  {"id": "brand_name", "type": "text", "label": "브랜드명", "editable": true, "source": "product"},
  {"id": "event_title", "type": "text", "label": "이벤트 타이틀", "editable": true, "source": "ai"},
  {"id": "event_subtitle", "type": "text", "label": "이벤트 서브타이틀", "editable": true, "source": "ai"},
  {"id": "event_period", "type": "text", "label": "이벤트 기간", "editable": true, "source": "ai"}
]');

-- ── fit_event_info: 행사 정보 (이벤트명, 혜택, 기간, 장소, CTA) ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('fit_event_info', 'FIT 행사 정보',
-- HTML
'<div class="s-finfo" style="background-color: {{bg_color}};">
  <div class="s-finfo__content">
    <div class="s-finfo__event-name" data-placeholder="event_name" data-editable="true">{{event_name}}</div>
    <div class="s-finfo__spacer-1"></div>
    <div class="s-finfo__benefit" data-placeholder="benefit_text" data-editable="true">{{benefit_text}}</div>
    <div class="s-finfo__spacer-2"></div>
    <div class="s-finfo__details">
      <div class="s-finfo__detail-row">
        <span class="s-finfo__detail-label">기간</span>
        <span class="s-finfo__detail-value" data-placeholder="info_period" data-editable="true">{{info_period}}</span>
      </div>
      <div class="s-finfo__detail-row">
        <span class="s-finfo__detail-label">장소</span>
        <span class="s-finfo__detail-value" data-placeholder="info_location" data-editable="true">{{info_location}}</span>
      </div>
    </div>
    <div class="s-finfo__spacer-3"></div>
    <div class="s-finfo__cta" data-placeholder="cta_text" data-editable="true">{{cta_text}}</div>
  </div>
</div>',
-- CSS
'.s-finfo, .s-finfo * { box-sizing: border-box; }
.s-finfo {
  width: 860px;
  padding: 60px;
}
.s-finfo__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.s-finfo__event-name {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 800;
  font-size: 48px;
  line-height: 130%;
  letter-spacing: -0.02em;
}
.s-finfo__spacer-1 { height: 24px; }
.s-finfo__benefit {
  color: rgba(255,255,255,0.9);
  font-family: "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 32px;
  line-height: 150%;
  white-space: pre-line;
}
.s-finfo__spacer-2 { height: 32px; }
.s-finfo__details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 500px;
}
.s-finfo__detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.15);
}
.s-finfo__detail-label {
  color: rgba(255,255,255,0.6);
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 24px;
}
.s-finfo__detail-value {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 24px;
}
.s-finfo__spacer-3 { height: 36px; }
.s-finfo__cta {
  display: inline-block;
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 28px;
  line-height: 140%;
  padding: 16px 48px;
  border: 2px solid #FFFFFF;
  border-radius: 8px;
  letter-spacing: 0.02em;
}',
-- placeholders
'[
  {"id": "event_name", "type": "text", "label": "이벤트명", "editable": true, "source": "ai"},
  {"id": "benefit_text", "type": "text", "label": "혜택 문구", "editable": true, "source": "ai"},
  {"id": "info_period", "type": "text", "label": "기간", "editable": true, "source": "ai"},
  {"id": "info_location", "type": "text", "label": "장소", "editable": true, "source": "ai"},
  {"id": "cta_text", "type": "text", "label": "CTA 버튼", "editable": true, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]');

-- ── fit_product_trio: 상품 3종 가로 배열 ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('fit_product_trio', 'FIT 상품 3종',
-- HTML
'<div class="s-ftrio" style="background-color: {{bg_color}};">
  <div class="s-ftrio__grid">
    <div class="s-ftrio__item">
      <img class="s-ftrio__image" src="{{product_image_0}}" data-placeholder="product_image_0" />
      <div class="s-ftrio__info">
        <div class="s-ftrio__name" data-placeholder="product_name_0" data-editable="true">{{product_name_0}}</div>
        <div class="s-ftrio__desc" data-placeholder="product_desc_0" data-editable="true">{{product_desc_0}}</div>
        <div class="s-ftrio__price" data-placeholder="product_price_0" data-editable="true">{{product_price_0}}</div>
      </div>
    </div>
    <div class="s-ftrio__item">
      <img class="s-ftrio__image" src="{{product_image_1}}" data-placeholder="product_image_1" />
      <div class="s-ftrio__info">
        <div class="s-ftrio__name" data-placeholder="product_name_1" data-editable="true">{{product_name_1}}</div>
        <div class="s-ftrio__desc" data-placeholder="product_desc_1" data-editable="true">{{product_desc_1}}</div>
        <div class="s-ftrio__price" data-placeholder="product_price_1" data-editable="true">{{product_price_1}}</div>
      </div>
    </div>
    <div class="s-ftrio__item">
      <img class="s-ftrio__image" src="{{product_image_2}}" data-placeholder="product_image_2" />
      <div class="s-ftrio__info">
        <div class="s-ftrio__name" data-placeholder="product_name_2" data-editable="true">{{product_name_2}}</div>
        <div class="s-ftrio__desc" data-placeholder="product_desc_2" data-editable="true">{{product_desc_2}}</div>
        <div class="s-ftrio__price" data-placeholder="product_price_2" data-editable="true">{{product_price_2}}</div>
      </div>
    </div>
  </div>
</div>',
-- CSS
'.s-ftrio, .s-ftrio * { box-sizing: border-box; }
.s-ftrio {
  width: 860px;
  padding: 48px 40px;
}
.s-ftrio__grid {
  display: flex;
  gap: 24px;
}
.s-ftrio__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.s-ftrio__image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
}
.s-ftrio__info {
  width: 100%;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.s-ftrio__name {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 24px;
  line-height: 140%;
}
.s-ftrio__desc {
  color: rgba(255,255,255,0.7);
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 20px;
  line-height: 150%;
  margin-top: 8px;
}
.s-ftrio__price {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 800;
  font-size: 28px;
  line-height: 130%;
  margin-top: 12px;
}',
-- placeholders
'[
  {"id": "product_image_0", "type": "image", "label": "상품1 이미지", "editable": false, "source": "product"},
  {"id": "product_name_0", "type": "text", "label": "상품1 이름", "editable": true, "source": "product"},
  {"id": "product_desc_0", "type": "text", "label": "상품1 설명", "editable": true, "source": "ai"},
  {"id": "product_price_0", "type": "text", "label": "상품1 가격", "editable": true, "source": "product"},
  {"id": "product_image_1", "type": "image", "label": "상품2 이미지", "editable": false, "source": "product"},
  {"id": "product_name_1", "type": "text", "label": "상품2 이름", "editable": true, "source": "product"},
  {"id": "product_desc_1", "type": "text", "label": "상품2 설명", "editable": true, "source": "ai"},
  {"id": "product_price_1", "type": "text", "label": "상품2 가격", "editable": true, "source": "product"},
  {"id": "product_image_2", "type": "image", "label": "상품3 이미지", "editable": false, "source": "product"},
  {"id": "product_name_2", "type": "text", "label": "상품3 이름", "editable": true, "source": "product"},
  {"id": "product_desc_2", "type": "text", "label": "상품3 설명", "editable": true, "source": "ai"},
  {"id": "product_price_2", "type": "text", "label": "상품3 가격", "editable": true, "source": "product"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]');
