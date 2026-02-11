-- 021: 고메트립 템플릿 V2 - InDesign 기반 리디자인
-- gourmet_product 삭제, gourmet_hero 업데이트,
-- gourmet_restaurant, gourmet_wine_intro, gourmet_wine 신규 추가

-- 1. 기존 gourmet_product 삭제
DELETE FROM section_templates WHERE section_type = 'gourmet_product';

-- 2. gourmet_hero 업데이트 (텍스트 전용 인트로 섹션 — 이미지 없음)
UPDATE section_templates
SET
  html_template = $html$<div class="s-gh">
  <div class="s-gh__inner">
    <h1 class="s-gh__title">{{hero_title}}</h1>
    <p class="s-gh__subtitle">{{hero_subtitle}}</p>
    <div class="s-gh__divider"></div>
    <div class="s-gh__tag">RESTAURANT</div>
    <h2 class="s-gh__heading">{{restaurant_heading}}</h2>
    <div class="s-gh__deco">레스토랑</div>
    <p class="s-gh__desc">{{hero_desc}}</p>
  </div>
</div>$html$,
  css_template = $css$@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
.s-gh{width:860px;background:#fff;padding:80px 0 48px}
.s-gh__inner{text-align:center;padding:0 80px}
.s-gh__title{font-family:'Pretendard',sans-serif;font-weight:400;font-size:34px;line-height:1.4;color:#000;letter-spacing:.002em;margin:0 0 6px}
.s-gh__subtitle{font-family:'Pretendard',sans-serif;font-weight:400;font-size:34px;line-height:1.4;color:#000;margin:0 0 40px}
.s-gh__divider{width:40px;height:1px;background:#873a30;margin:0 auto 28px}
.s-gh__tag{font-family:'Pretendard',sans-serif;font-weight:600;font-size:15px;letter-spacing:.15em;color:#873a30;margin-bottom:14px}
.s-gh__heading{font-family:'Pretendard',sans-serif;font-weight:600;font-size:38px;line-height:1.4;color:#000;letter-spacing:.002em;margin:0 0 6px}
.s-gh__deco{font-family:'Pretendard',sans-serif;font-weight:600;font-size:70px;line-height:1.2;letter-spacing:.02em;color:#873a30;margin-bottom:28px}
.s-gh__desc{font-family:'Pretendard',sans-serif;font-weight:400;font-size:30px;line-height:1.6;color:#222;white-space:pre-line;margin:0}$css$,
  placeholders = '[
    {"id":"hero_title","type":"text","source":"ai"},
    {"id":"hero_subtitle","type":"text","source":"ai"},
    {"id":"restaurant_heading","type":"text","source":"ai"},
    {"id":"hero_desc","type":"text","source":"ai"}
  ]'::jsonb
WHERE section_type = 'gourmet_hero';

-- 3. gourmet_restaurant 추가 (레스토랑 카드 — 이미지 + 메뉴 + 이벤트)
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders)
VALUES ('gourmet_restaurant', '고메트립 레스토랑',
$html$<div class="s-gr">
  <div class="s-gr__travel">
    <span class="s-gr__travel-tag">{{travel_tag}}</span>
  </div>
  <p class="s-gr__travel-desc">{{travel_desc}}</p>
  <div class="s-gr__scene">
    <img class="s-gr__scene-img" src="{{restaurant_image}}" alt="" />
    <div class="s-gr__scene-overlay">
      <span class="s-gr__name">{{product_name}}</span>
      <span class="s-gr__floor">{{restaurant_floor}}</span>
    </div>
  </div>
  <p class="s-gr__desc">{{restaurant_desc}}</p>
  <div class="s-gr__menus">
    <div class="s-gr__menu-item">
      <h3 class="s-gr__menu-name">{{menu1_name}}</h3>
      <p class="s-gr__menu-desc">{{menu1_desc}}</p>
    </div>
    <div class="s-gr__menu-divider"></div>
    <div class="s-gr__menu-item">
      <h3 class="s-gr__menu-name">{{menu2_name}}</h3>
      <p class="s-gr__menu-desc">{{menu2_desc}}</p>
    </div>
  </div>
  <div class="s-gr__event">
    <div class="s-gr__event-line"></div>
    <span class="s-gr__event-title">SPECIAL EVENT</span>
    <div class="s-gr__event-line"></div>
  </div>
  <div class="s-gr__event-list">
    <p class="s-gr__event-item">{{event1}}</p>
    <p class="s-gr__event-item">{{event2}}</p>
  </div>
</div>$html$,
$css$@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
.s-gr{width:860px;background:#fff;padding:40px 0}
.s-gr__travel{text-align:center;margin-bottom:6px}
.s-gr__travel-tag{font-family:'Pretendard',sans-serif;font-weight:500;font-size:16px;letter-spacing:.1em;color:#873a30;text-transform:uppercase}
.s-gr__travel-desc{font-family:'Pretendard',sans-serif;font-weight:400;font-size:28px;line-height:1.5;color:#222;text-align:center;margin:0 0 20px;padding:0 60px}
.s-gr__scene{position:relative;width:100%;height:480px;overflow:hidden;margin-bottom:24px}
.s-gr__scene-img{width:100%;height:100%;object-fit:cover}
.s-gr__scene-overlay{position:absolute;bottom:0;left:0;right:0;padding:24px 32px;background:linear-gradient(transparent,rgba(0,0,0,.65));display:flex;align-items:baseline;gap:8px}
.s-gr__name{font-family:'Pretendard',sans-serif;font-weight:700;font-size:34px;color:#fff}
.s-gr__floor{font-family:'Pretendard',sans-serif;font-weight:400;font-size:20px;color:rgba(255,255,255,.8)}
.s-gr__desc{font-family:'Pretendard',sans-serif;font-weight:400;font-size:26px;line-height:1.6;color:#444;text-align:center;padding:0 60px;margin:0 0 28px;white-space:pre-line}
.s-gr__menus{display:flex;gap:20px;padding:0 40px;margin-bottom:28px}
.s-gr__menu-item{flex:1;text-align:center}
.s-gr__menu-name{font-family:'Pretendard',sans-serif;font-weight:600;font-size:26px;color:#222;margin:0 0 8px}
.s-gr__menu-desc{font-family:'Pretendard',sans-serif;font-weight:200;font-size:22px;line-height:1.5;color:#444;margin:0;white-space:pre-line}
.s-gr__menu-divider{width:1px;background:#ddd}
.s-gr__event{display:flex;align-items:center;gap:12px;padding:0 60px;margin-bottom:14px}
.s-gr__event-line{flex:1;height:1px;background:#873a30}
.s-gr__event-title{font-family:'Pretendard',sans-serif;font-weight:600;font-size:13px;letter-spacing:.12em;color:#873a30;white-space:nowrap}
.s-gr__event-list{padding:0 80px;margin-bottom:8px}
.s-gr__event-item{font-family:'Pretendard',sans-serif;font-weight:400;font-size:20px;line-height:1.6;color:#444;margin:0 0 4px;text-align:center}$css$,
'[
  {"id":"travel_tag","type":"text","source":"ai"},
  {"id":"travel_desc","type":"text","source":"ai"},
  {"id":"restaurant_image","type":"image","source":"ai"},
  {"id":"product_name","type":"text","source":"product"},
  {"id":"restaurant_floor","type":"text","source":"ai"},
  {"id":"restaurant_desc","type":"text","source":"ai"},
  {"id":"menu1_name","type":"text","source":"ai"},
  {"id":"menu1_desc","type":"text","source":"ai"},
  {"id":"menu2_name","type":"text","source":"ai"},
  {"id":"menu2_desc","type":"text","source":"ai"},
  {"id":"event1","type":"text","source":"ai"},
  {"id":"event2","type":"text","source":"ai"}
]'::jsonb);

-- 4. gourmet_wine_intro 추가 (와인 섹션 인트로 — 이미지 없음)
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders)
VALUES ('gourmet_wine_intro', '고메트립 와인 인트로',
$html$<div class="s-gwi">
  <div class="s-gwi__inner">
    <p class="s-gwi__desc">{{wine_desc}}</p>
    <div class="s-gwi__divider"></div>
    <div class="s-gwi__tag">WINE</div>
    <h2 class="s-gwi__heading">{{wine_heading}}</h2>
    <div class="s-gwi__deco">와인</div>
  </div>
</div>$html$,
$css$@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
.s-gwi{width:860px;background:#fff;padding:60px 0 48px}
.s-gwi__inner{text-align:center;padding:0 80px}
.s-gwi__desc{font-family:'Pretendard',sans-serif;font-weight:400;font-size:30px;line-height:1.6;color:#222;margin:0 0 36px;white-space:pre-line}
.s-gwi__divider{width:40px;height:1px;background:#9a1230;margin:0 auto 28px}
.s-gwi__tag{font-family:'Pretendard',sans-serif;font-weight:600;font-size:15px;letter-spacing:.15em;color:#9a1230;margin-bottom:14px}
.s-gwi__heading{font-family:'Pretendard',sans-serif;font-weight:600;font-size:38px;line-height:1.4;color:#000;letter-spacing:.002em;margin:0 0 6px}
.s-gwi__deco{font-family:'Pretendard',sans-serif;font-weight:600;font-size:70px;line-height:1.2;letter-spacing:.03em;color:#9a1230}$css$,
'[
  {"id":"wine_desc","type":"text","source":"ai"},
  {"id":"wine_heading","type":"text","source":"ai"}
]'::jsonb);

-- 5. gourmet_wine 추가 (와인 카드 — 병 이미지 + 테이스팅 노트)
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders)
VALUES ('gourmet_wine', '고메트립 와인',
$html$<div class="s-gw">
  <div class="s-gw__inner">
    <div class="s-gw__bottle-wrap">
      <img class="s-gw__bottle" src="{{wine_image}}" alt="" />
    </div>
    <div class="s-gw__info">
      <h3 class="s-gw__name">{{product_name}}</h3>
      <p class="s-gw__note">{{wine_note}}</p>
    </div>
  </div>
</div>$html$,
$css$@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
.s-gw{width:860px;background:#fff;padding:24px 0}
.s-gw__inner{display:flex;align-items:center;gap:28px;padding:0 60px}
.s-gw__bottle-wrap{flex-shrink:0;width:180px;height:260px}
.s-gw__bottle{width:100%;height:100%;object-fit:contain}
.s-gw__info{flex:1}
.s-gw__name{font-family:'Pretendard',sans-serif;font-weight:600;font-size:28px;color:#222;margin:0 0 12px}
.s-gw__note{font-family:'Pretendard',sans-serif;font-weight:200;font-size:24px;line-height:1.6;color:#444;margin:0;white-space:pre-line}$css$,
'[
  {"id":"wine_image","type":"image","source":"ai"},
  {"id":"product_name","type":"text","source":"product","product_offset":3},
  {"id":"wine_note","type":"text","source":"ai"}
]'::jsonb);
