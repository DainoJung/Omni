-- ================================================================
-- 페이지 타입별 히어로 템플릿 추가
-- vip_special_hero, vip_private_hero, gourmet_hero, shinsegae_hero
-- ================================================================

-- ── vip_special_hero: VIP 스페셜위크 히어로 ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('vip_special_hero', 'VIP 스페셜위크 히어로',
-- HTML
'<div class="s-vsh">
  <img class="s-vsh__bg" src="{{hero_image}}" data-placeholder="hero_image" />
  <div class="s-vsh__overlay"></div>
  <div class="s-vsh__content">
    <div class="s-vsh__badge" data-placeholder="vip_badge" data-editable="true">{{vip_badge}}</div>
    <div class="s-vsh__spacer-1"></div>
    <div class="s-vsh__title" data-placeholder="event_title" data-editable="true">{{event_title}}</div>
    <div class="s-vsh__spacer-2"></div>
    <div class="s-vsh__subtitle" data-placeholder="event_subtitle" data-editable="true">{{event_subtitle}}</div>
    <div class="s-vsh__spacer-3"></div>
    <div class="s-vsh__benefit" data-placeholder="benefit_text" data-editable="true">{{benefit_text}}</div>
    <div class="s-vsh__spacer-4"></div>
    <div class="s-vsh__period" data-placeholder="event_period" data-editable="true">{{event_period}}</div>
  </div>
</div>',
-- CSS
'.s-vsh, .s-vsh * { box-sizing: border-box; }
.s-vsh {
  position: relative;
  width: 860px;
  height: 700px;
  overflow: hidden;
}
.s-vsh__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.s-vsh__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(76,29,149,0.2) 0%, rgba(76,29,149,0.5) 60%, rgba(76,29,149,0.7) 100%);
}
.s-vsh__content {
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
.s-vsh__badge {
  display: inline-block;
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 8px 24px;
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 2px;
}
.s-vsh__spacer-1 { height: 24px; }
.s-vsh__title {
  color: #FFFFFF;
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 40px;
  line-height: 130%;
}
.s-vsh__spacer-2 { height: 16px; }
.s-vsh__subtitle {
  color: rgba(255,255,255,0.9);
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 26px;
  line-height: 150%;
}
.s-vsh__spacer-3 { height: 20px; }
.s-vsh__benefit {
  color: #FFD700;
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 24px;
  line-height: 140%;
}
.s-vsh__spacer-4 { height: 16px; }
.s-vsh__period {
  color: rgba(255,255,255,0.6);
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 20px;
  line-height: 140%;
}',
-- placeholders
'[
  {"id": "vip_badge", "type": "text", "label": "VIP 배지", "editable": true, "source": "ai"},
  {"id": "event_title", "type": "text", "label": "이벤트 타이틀", "editable": true, "source": "ai"},
  {"id": "event_subtitle", "type": "text", "label": "서브타이틀", "editable": true, "source": "ai"},
  {"id": "benefit_text", "type": "text", "label": "혜택 문구", "editable": true, "source": "ai"},
  {"id": "event_period", "type": "text", "label": "행사 기간", "editable": true, "source": "ai"},
  {"id": "hero_image", "type": "image", "label": "히어로 이미지", "editable": false, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]');


-- ── vip_private_hero: VIP 프라이빗위크 히어로 ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('vip_private_hero', 'VIP 프라이빗위크 히어로',
-- HTML
'<div class="s-vph">
  <img class="s-vph__bg" src="{{hero_image}}" data-placeholder="hero_image" />
  <div class="s-vph__overlay"></div>
  <div class="s-vph__content">
    <div class="s-vph__label" data-placeholder="private_label" data-editable="true">{{private_label}}</div>
    <div class="s-vph__divider"></div>
    <div class="s-vph__spacer-1"></div>
    <div class="s-vph__title" data-placeholder="event_title" data-editable="true">{{event_title}}</div>
    <div class="s-vph__spacer-2"></div>
    <div class="s-vph__desc" data-placeholder="event_desc" data-editable="true">{{event_desc}}</div>
    <div class="s-vph__spacer-3"></div>
    <div class="s-vph__cta" data-placeholder="cta_text" data-editable="true">{{cta_text}}</div>
  </div>
</div>',
-- CSS
'.s-vph, .s-vph * { box-sizing: border-box; }
.s-vph {
  position: relative;
  width: 860px;
  height: 680px;
  overflow: hidden;
}
.s-vph__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.s-vph__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.8) 100%);
}
.s-vph__content {
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
.s-vph__label {
  color: #C9A96E;
  font-family: "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.s-vph__divider {
  width: 80px;
  height: 1px;
  background: #C9A96E;
  margin-top: 20px;
}
.s-vph__spacer-1 { height: 24px; }
.s-vph__title {
  color: #FFFFFF;
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 42px;
  line-height: 130%;
}
.s-vph__spacer-2 { height: 16px; }
.s-vph__desc {
  color: rgba(255,255,255,0.8);
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 24px;
  line-height: 160%;
  white-space: pre-line;
}
.s-vph__spacer-3 { height: 28px; }
.s-vph__cta {
  display: inline-block;
  color: #C9A96E;
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 22px;
  padding: 14px 40px;
  border: 1px solid #C9A96E;
  border-radius: 2px;
  letter-spacing: 0.02em;
}',
-- placeholders
'[
  {"id": "private_label", "type": "text", "label": "프라이빗 라벨", "editable": true, "source": "ai"},
  {"id": "event_title", "type": "text", "label": "이벤트 타이틀", "editable": true, "source": "ai"},
  {"id": "event_desc", "type": "text", "label": "이벤트 설명", "editable": true, "source": "ai"},
  {"id": "cta_text", "type": "text", "label": "CTA 문구", "editable": true, "source": "ai"},
  {"id": "hero_image", "type": "image", "label": "히어로 이미지", "editable": false, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]');


-- ── gourmet_hero: 고메트립 히어로 ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('gourmet_hero', '고메트립 히어로',
-- HTML
'<div class="s-gmh">
  <img class="s-gmh__bg" src="{{hero_image}}" data-placeholder="hero_image" />
  <div class="s-gmh__overlay"></div>
  <div class="s-gmh__content">
    <div class="s-gmh__tag" data-placeholder="trip_tag" data-editable="true">{{trip_tag}}</div>
    <div class="s-gmh__spacer-1"></div>
    <div class="s-gmh__title" data-placeholder="trip_title" data-editable="true">{{trip_title}}</div>
    <div class="s-gmh__spacer-2"></div>
    <div class="s-gmh__location" data-placeholder="location" data-editable="true">{{location}}</div>
    <div class="s-gmh__spacer-3"></div>
    <div class="s-gmh__desc" data-placeholder="trip_desc" data-editable="true">{{trip_desc}}</div>
    <div class="s-gmh__spacer-4"></div>
    <div class="s-gmh__price" data-placeholder="price" data-editable="true">{{price}}</div>
  </div>
</div>',
-- CSS
'.s-gmh, .s-gmh * { box-sizing: border-box; }
.s-gmh {
  position: relative;
  width: 860px;
  height: 720px;
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
  background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(120,53,15,0.4) 50%, rgba(120,53,15,0.7) 100%);
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
  padding: 0 48px 64px;
  text-align: center;
}
.s-gmh__tag {
  color: #D97706;
  font-family: "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.s-gmh__spacer-1 { height: 20px; }
.s-gmh__title {
  color: #FFFFFF;
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 40px;
  line-height: 130%;
}
.s-gmh__spacer-2 { height: 12px; }
.s-gmh__location {
  color: rgba(255,255,255,0.8);
  font-family: "Pretendard", sans-serif;
  font-weight: 500;
  font-size: 22px;
  letter-spacing: 0.02em;
}
.s-gmh__spacer-3 { height: 16px; }
.s-gmh__desc {
  color: rgba(255,255,255,0.75);
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 22px;
  line-height: 160%;
  white-space: pre-line;
}
.s-gmh__spacer-4 { height: 20px; }
.s-gmh__price {
  color: #FCD34D;
  font-family: "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 28px;
  line-height: 130%;
}',
-- placeholders
'[
  {"id": "trip_tag", "type": "text", "label": "트립 태그", "editable": true, "source": "ai"},
  {"id": "trip_title", "type": "text", "label": "트립 타이틀", "editable": true, "source": "ai"},
  {"id": "location", "type": "text", "label": "장소", "editable": true, "source": "ai"},
  {"id": "trip_desc", "type": "text", "label": "설명", "editable": true, "source": "ai"},
  {"id": "price", "type": "text", "label": "가격 정보", "editable": true, "source": "ai"},
  {"id": "hero_image", "type": "image", "label": "히어로 이미지", "editable": false, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]');


-- ── shinsegae_hero: 뱅드신세계 히어로 ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('shinsegae_hero', '뱅드신세계 히어로',
-- HTML
'<div class="s-sgh">
  <img class="s-sgh__bg" src="{{hero_image}}" data-placeholder="hero_image" />
  <div class="s-sgh__overlay"></div>
  <div class="s-sgh__content">
    <div class="s-sgh__title" data-placeholder="event_title" data-editable="true">{{event_title}}</div>
    <div class="s-sgh__spacer-1"></div>
    <div class="s-sgh__benefits">
      <div class="s-sgh__benefit" data-placeholder="benefit_1" data-editable="true">{{benefit_1}}</div>
      <div class="s-sgh__benefit-divider"></div>
      <div class="s-sgh__benefit" data-placeholder="benefit_2" data-editable="true">{{benefit_2}}</div>
      <div class="s-sgh__benefit-divider"></div>
      <div class="s-sgh__benefit" data-placeholder="benefit_3" data-editable="true">{{benefit_3}}</div>
    </div>
    <div class="s-sgh__spacer-2"></div>
    <div class="s-sgh__period" data-placeholder="event_period" data-editable="true">{{event_period}}</div>
  </div>
</div>',
-- CSS
'.s-sgh, .s-sgh * { box-sizing: border-box; }
.s-sgh {
  position: relative;
  width: 860px;
  height: 700px;
  overflow: hidden;
}
.s-sgh__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.s-sgh__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(127,29,29,0.2) 0%, rgba(127,29,29,0.5) 60%, rgba(127,29,29,0.75) 100%);
}
.s-sgh__content {
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
.s-sgh__title {
  color: #FFFFFF;
  font-family: "Apple SD Gothic Neo", "Pretendard", sans-serif;
  font-weight: 700;
  font-size: 42px;
  line-height: 130%;
}
.s-sgh__spacer-1 { height: 28px; }
.s-sgh__benefits {
  display: flex;
  align-items: center;
  gap: 16px;
}
.s-sgh__benefit {
  color: #FCD34D;
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 22px;
  line-height: 140%;
  white-space: nowrap;
}
.s-sgh__benefit-divider {
  width: 1px;
  height: 20px;
  background: rgba(255,255,255,0.3);
}
.s-sgh__spacer-2 { height: 24px; }
.s-sgh__period {
  color: rgba(255,255,255,0.6);
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 20px;
  line-height: 140%;
}',
-- placeholders
'[
  {"id": "event_title", "type": "text", "label": "이벤트 타이틀", "editable": true, "source": "ai"},
  {"id": "benefit_1", "type": "text", "label": "혜택 1", "editable": true, "source": "ai"},
  {"id": "benefit_2", "type": "text", "label": "혜택 2", "editable": true, "source": "ai"},
  {"id": "benefit_3", "type": "text", "label": "혜택 3", "editable": true, "source": "ai"},
  {"id": "event_period", "type": "text", "label": "행사 기간", "editable": true, "source": "ai"},
  {"id": "hero_image", "type": "image", "label": "히어로 이미지", "editable": false, "source": "ai"},
  {"id": "bg_color", "type": "text", "label": "배경 색상", "editable": false, "source": "theme"}
]');
