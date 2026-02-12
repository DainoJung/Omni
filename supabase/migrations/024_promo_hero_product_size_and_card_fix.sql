-- ================================================================
-- 1) promo_hero: 상품 이미지 크기 3/4로 축소
-- 2) product_card: 가격에 원 표시, 상품명/가격 폰트 수정
-- ================================================================

-- promo_hero: 상품 이미지 max-height 100%→75%, max-width 80%→60%
UPDATE section_templates
SET css_template = '.s-phero, .s-phero * { box-sizing: border-box; }
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
}'
WHERE section_type = 'promo_hero';


-- product_card: 상품명 font-weight 400, 가격 font-weight 400 & font-size 36px
UPDATE section_templates
SET css_template = '.s-pcard, .s-pcard * { box-sizing: border-box; }
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
  font-weight: 400;
  font-size: 36px;
  line-height: 140%;
  letter-spacing: -0.01em;
}
.s-pcard__spacer-2 { height: 16px; }
.s-pcard__price {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 36px;
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
}'
WHERE section_type = 'product_card';
