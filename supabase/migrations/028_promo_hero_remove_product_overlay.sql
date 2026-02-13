-- ================================================================
-- promo_hero: 상품 누끼 오버레이 제거
-- 하단 이미지 영역을 콘셉트 AI 이미지 단독으로 표시
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

/* ── 하단: 콘셉트 이미지 영역 ── */
.s-phero__image-area {
  width: 100%;
  overflow: hidden;
}
.s-phero__bg {
  display: block;
  width: 100%;
  max-width: none;
  object-fit: cover;
}',

  placeholders = '[
  {"id": "hero_image", "type": "image", "label": "콘셉트 이미지", "editable": false, "source": "ai"},
  {"id": "script_title", "type": "text", "label": "필기체 타이틀", "editable": true, "source": "ai"},
  {"id": "category_title", "type": "text", "label": "카테고리 타이틀", "editable": true, "source": "ai"},
  {"id": "subtitle", "type": "text", "label": "서브타이틀", "editable": true, "source": "ai"},
  {"id": "location", "type": "text", "label": "위치 정보", "editable": true, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]'

WHERE section_type = 'promo_hero';
