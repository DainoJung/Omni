-- ================================================================
-- FIT 템플릿 리디자인: IDML 0130 명절_FIT 템플릿3 HTML5 추출 기반
-- fit_hero, fit_event_info, fit_product_trio 업데이트
-- ================================================================

-- ── fit_hero: 히어로 배너 리디자인 ──
-- 변경사항: 높이 증가 (413→700px), 텍스트 계층 조정,
--          장식 구분선 추가, 폰트 크기/웨이트 레퍼런스 반영
UPDATE section_templates
SET
  html_template = '<div class="s-fhero">
  <img class="s-fhero__bg" src="{{hero_image}}" data-placeholder="hero_image" />
  <div class="s-fhero__overlay"></div>
  <div class="s-fhero__content">
    <div class="s-fhero__divider-line"></div>
    <div class="s-fhero__spacer-1"></div>
    <div class="s-fhero__title" data-placeholder="event_title" data-editable="true">{{event_title}}</div>
    <div class="s-fhero__spacer-2"></div>
    <div class="s-fhero__subtitle" data-placeholder="event_subtitle" data-editable="true">{{event_subtitle}}</div>
    <div class="s-fhero__spacer-3"></div>
    <div class="s-fhero__hashtags" data-placeholder="event_period" data-editable="true">{{event_period}}</div>
  </div>
  <div class="s-fhero__brand-tag" data-placeholder="brand_name" data-editable="true">{{brand_name}}</div>
</div>',
  css_template = '.s-fhero, .s-fhero * { box-sizing: border-box; }
.s-fhero {
  position: relative;
  width: 860px;
  height: 700px;
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
  background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.55) 100%);
}
.s-fhero__content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 48px 64px;
  text-align: center;
}
.s-fhero__divider-line {
  width: 120px;
  height: 1px;
  background: rgba(255,255,255,0.5);
  margin-bottom: 0;
}
.s-fhero__spacer-1 { height: 28px; }
.s-fhero__title {
  color: #FFFFFF;
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 40px;
  line-height: 130%;
  letter-spacing: -0.01em;
}
.s-fhero__spacer-2 { height: 16px; }
.s-fhero__subtitle {
  color: rgba(255,255,255,0.9);
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 28px;
  line-height: 150%;
}
.s-fhero__spacer-3 { height: 20px; }
.s-fhero__hashtags {
  color: rgba(255,255,255,0.7);
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 300;
  font-size: 24px;
  line-height: 140%;
  letter-spacing: 0.02em;
}
.s-fhero__brand-tag {
  position: absolute;
  top: 32px;
  left: 48px;
  z-index: 1;
  color: rgba(255,255,255,0.7);
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 18px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}'
WHERE section_type = 'fit_hero';


-- ── fit_event_info: 행사 정보 리디자인 ──
-- 변경사항: "New Year Gift Curation" 스타일 큐레이션 헤더,
--          심플한 레이아웃, Pretendard SemiBold 타이틀
UPDATE section_templates
SET
  html_template = '<div class="s-finfo" style="background-color: {{bg_color}};">
  <div class="s-finfo__deco-top"></div>
  <div class="s-finfo__content">
    <div class="s-finfo__event-name" data-placeholder="event_name" data-editable="true">{{event_name}}</div>
    <div class="s-finfo__spacer-1"></div>
    <div class="s-finfo__period" data-placeholder="info_period" data-editable="true">{{info_period}}</div>
    <div class="s-finfo__spacer-2"></div>
    <div class="s-finfo__benefit" data-placeholder="benefit_text" data-editable="true">{{benefit_text}}</div>
    <div class="s-finfo__spacer-3"></div>
    <div class="s-finfo__details">
      <div class="s-finfo__detail-row">
        <span class="s-finfo__detail-label">장소</span>
        <span class="s-finfo__detail-value" data-placeholder="info_location" data-editable="true">{{info_location}}</span>
      </div>
    </div>
    <div class="s-finfo__spacer-4"></div>
    <div class="s-finfo__cta" data-placeholder="cta_text" data-editable="true">{{cta_text}}</div>
  </div>
  <div class="s-finfo__deco-bottom"></div>
</div>',
  css_template = '.s-finfo, .s-finfo * { box-sizing: border-box; }
.s-finfo {
  position: relative;
  width: 860px;
  padding: 60px 48px;
}
.s-finfo__deco-top,
.s-finfo__deco-bottom {
  width: 24px;
  height: 80px;
  border-left: 1px solid rgba(255,255,255,0.25);
  border-right: 1px solid rgba(255,255,255,0.25);
  margin: 0 auto 24px;
}
.s-finfo__deco-bottom {
  margin: 24px auto 0;
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
  font-weight: 600;
  font-size: 52px;
  line-height: 130%;
  letter-spacing: -0.01em;
}
.s-finfo__spacer-1 { height: 16px; }
.s-finfo__period {
  color: rgba(255,255,255,0.85);
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 24px;
  line-height: 140%;
}
.s-finfo__spacer-2 { height: 28px; }
.s-finfo__benefit {
  color: rgba(255,255,255,0.75);
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 24px;
  line-height: 160%;
  white-space: pre-line;
}
.s-finfo__spacer-3 { height: 24px; }
.s-finfo__details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 400px;
}
.s-finfo__detail-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}
.s-finfo__detail-label {
  color: rgba(255,255,255,0.5);
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 20px;
}
.s-finfo__detail-value {
  color: rgba(255,255,255,0.85);
  font-family: "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 20px;
}
.s-finfo__spacer-4 { height: 32px; }
.s-finfo__cta {
  display: inline-block;
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 22px;
  line-height: 140%;
  padding: 14px 40px;
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 4px;
  letter-spacing: 0.02em;
}'
WHERE section_type = 'fit_event_info';


-- ── fit_product_trio: 상품 3종 리디자인 ──
-- 변경사항: 가로 그리드 → 세로 스택, 흰색 배경 + 어두운 텍스트,
--          상품 이미지 확대, 구분선 추가, IDML 레퍼런스 반영
UPDATE section_templates
SET
  html_template = '<div class="s-ftrio">
  <div class="s-ftrio__list">
    <div class="s-ftrio__item" data-has-product="{{product_image_0}}">
      <div class="s-ftrio__image-wrap">
        <img class="s-ftrio__image" src="{{product_image_0}}" data-placeholder="product_image_0" />
      </div>
      <div class="s-ftrio__info">
        <div class="s-ftrio__name" data-placeholder="product_name_0" data-editable="true">{{product_name_0}}</div>
        <div class="s-ftrio__desc" data-placeholder="product_desc_0" data-editable="true">{{product_desc_0}}</div>
        <div class="s-ftrio__divider"></div>
        <div class="s-ftrio__price" data-placeholder="product_price_0" data-editable="true">{{product_price_0}}</div>
      </div>
    </div>
    <div class="s-ftrio__item" data-has-product="{{product_image_1}}">
      <div class="s-ftrio__image-wrap">
        <img class="s-ftrio__image" src="{{product_image_1}}" data-placeholder="product_image_1" />
      </div>
      <div class="s-ftrio__info">
        <div class="s-ftrio__name" data-placeholder="product_name_1" data-editable="true">{{product_name_1}}</div>
        <div class="s-ftrio__desc" data-placeholder="product_desc_1" data-editable="true">{{product_desc_1}}</div>
        <div class="s-ftrio__divider"></div>
        <div class="s-ftrio__price" data-placeholder="product_price_1" data-editable="true">{{product_price_1}}</div>
      </div>
    </div>
    <div class="s-ftrio__item" data-has-product="{{product_image_2}}">
      <div class="s-ftrio__image-wrap">
        <img class="s-ftrio__image" src="{{product_image_2}}" data-placeholder="product_image_2" />
      </div>
      <div class="s-ftrio__info">
        <div class="s-ftrio__name" data-placeholder="product_name_2" data-editable="true">{{product_name_2}}</div>
        <div class="s-ftrio__desc" data-placeholder="product_desc_2" data-editable="true">{{product_desc_2}}</div>
        <div class="s-ftrio__divider"></div>
        <div class="s-ftrio__price" data-placeholder="product_price_2" data-editable="true">{{product_price_2}}</div>
      </div>
    </div>
  </div>
</div>',
  css_template = '.s-ftrio, .s-ftrio * { box-sizing: border-box; }
.s-ftrio {
  width: 860px;
  background-color: #FFFFFF;
  padding: 0;
}
.s-ftrio__list {
  display: flex;
  flex-direction: column;
}
.s-ftrio__item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.s-ftrio__item[data-has-product=""] {
  display: none;
}
.s-ftrio__image-wrap {
  width: 100%;
  padding: 32px 95px 0;
  display: flex;
  justify-content: center;
  background-color: #F5F5F5;
}
.s-ftrio__image {
  width: 100%;
  max-width: 670px;
  max-height: 500px;
  object-fit: contain;
}
.s-ftrio__info {
  width: 100%;
  max-width: 670px;
  padding: 24px 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.s-ftrio__name {
  color: #000000;
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 28px;
  line-height: 140%;
}
.s-ftrio__desc {
  color: #666666;
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 22px;
  line-height: 160%;
  margin-top: 8px;
}
.s-ftrio__divider {
  width: 32px;
  height: 1px;
  background-color: #E0E0E0;
  margin: 16px 0;
}
.s-ftrio__price {
  color: #333333;
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 26px;
  line-height: 130%;
}'
WHERE section_type = 'fit_product_trio';
