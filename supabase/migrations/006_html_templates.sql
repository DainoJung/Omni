-- ================================================================
-- v5.2 HTML 템플릿 기반 렌더링 시스템 마이그레이션
-- section_templates: slots/background → html_template/css/placeholders
-- ================================================================

-- 1. 기존 컬럼 제거
ALTER TABLE section_templates DROP COLUMN IF EXISTS slots;
ALTER TABLE section_templates DROP COLUMN IF EXISTS background_type;
ALTER TABLE section_templates DROP COLUMN IF EXISTS background_config;
ALTER TABLE section_templates DROP COLUMN IF EXISTS width;
ALTER TABLE section_templates DROP COLUMN IF EXISTS height;
ALTER TABLE section_templates DROP COLUMN IF EXISTS variant;

-- 2. 새 컬럼 추가
ALTER TABLE section_templates ADD COLUMN html_template TEXT NOT NULL DEFAULT '';
ALTER TABLE section_templates ADD COLUMN css_template TEXT NOT NULL DEFAULT '';
ALTER TABLE section_templates ADD COLUMN placeholders JSONB NOT NULL DEFAULT '[]';

-- 3. 기존 시드 데이터 삭제
DELETE FROM section_templates;

-- 4. 새 섹션 템플릿 INSERT (4개)

-- ── hero_banner ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('hero_banner', '히어로 배너',
-- HTML
'<div class="s-hero">
  <img class="s-hero__bg" src="{{hero_bg_image}}" />
  <div class="s-hero__spacer-top"></div>
  <div class="s-hero__category" data-placeholder="category" data-editable="true">{{category}}</div>
  <div class="s-hero__spacer-1"></div>
  <div class="s-hero__title" data-placeholder="title" data-editable="true">{{title}}</div>
  <div class="s-hero__spacer-2"></div>
  <div class="s-hero__subtitle" data-placeholder="subtitle" data-editable="true">{{subtitle}}</div>
  <div class="s-hero__spacer-bottom"></div>
</div>',
-- CSS
'.s-hero, .s-hero * { box-sizing: border-box; }
.s-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  width: 860px;
}
.s-hero__bg {
  background: linear-gradient(180deg, rgba(0,0,0,0.8) 20%, rgba(0,0,0,0) 45%);
  width: 860px;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  object-fit: cover;
}
.s-hero__spacer-top {
  align-self: stretch;
  height: 122px;
  position: relative;
}
.s-hero__category {
  color: #fff7f7;
  text-align: center;
  font-family: "SCoreDream-3Light", sans-serif;
  font-size: 54px;
  line-height: 140%;
  letter-spacing: -0.02em;
  position: relative;
  align-self: stretch;
}
.s-hero__spacer-1 {
  align-self: stretch;
  height: 24px;
  position: relative;
}
.s-hero__title {
  color: {{theme_accent}};
  text-align: center;
  font-family: "BmDoHyeonOtf-Regular", sans-serif;
  font-size: 86px;
  line-height: 120%;
  letter-spacing: -0.05em;
  position: relative;
  width: 751px;
}
.s-hero__spacer-2 {
  align-self: stretch;
  height: 32px;
  position: relative;
}
.s-hero__subtitle {
  color: #ffffff;
  text-align: center;
  font-family: "SCoreDream-5Medium", sans-serif;
  font-size: 42px;
  line-height: 140%;
  letter-spacing: -0.02em;
  position: relative;
  align-self: stretch;
}
.s-hero__spacer-bottom {
  align-self: stretch;
  height: 984px;
  position: relative;
}',
-- placeholders
'[
  {"id": "hero_bg_image", "type": "image", "label": "히어로 배경", "editable": false, "source": "theme"},
  {"id": "category", "type": "text", "label": "카테고리", "editable": true, "source": "ai"},
  {"id": "title", "type": "text", "label": "메인 타이틀", "editable": true, "source": "ai"},
  {"id": "subtitle", "type": "text", "label": "서브 타이틀", "editable": true, "source": "ai"},
  {"id": "theme_accent", "type": "text", "label": "강조 색상", "editable": false, "source": "theme"}
]');

-- ── feature_badges ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('feature_badges', '특징 뱃지',
-- HTML
'<div class="s-badges">
  <div class="s-badges__row">
    <div class="s-badges__col s-badges__col--border">
      <div class="s-badges__item">
        <svg class="s-badges__icon" width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M60 18L27 51L12 36" stroke="{{theme_accent}}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div class="s-badges__text" data-placeholder="badge_1" data-editable="true">{{badge_1}}</div>
      </div>
    </div>
    <div class="s-badges__col s-badges__col--border">
      <div class="s-badges__item">
        <svg class="s-badges__icon" width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M60 18L27 51L12 36" stroke="{{theme_accent}}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div class="s-badges__text" data-placeholder="badge_2" data-editable="true">{{badge_2}}</div>
      </div>
    </div>
    <div class="s-badges__col">
      <div class="s-badges__item">
        <svg class="s-badges__icon" width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M60 18L27 51L12 36" stroke="{{theme_accent}}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div class="s-badges__text" data-placeholder="badge_3" data-editable="true">{{badge_3}}</div>
      </div>
    </div>
  </div>
</div>',
-- CSS
'.s-badges, .s-badges * { box-sizing: border-box; }
.s-badges {
  background: #ffffff;
  padding: 70px 49px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 860px;
}
.s-badges__row {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
}
.s-badges__col {
  padding: 21px 75px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 158px;
}
.s-badges__col--border {
  border-right: 1px solid rgba(0,0,0,0.5);
}
.s-badges__item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
}
.s-badges__icon {
  width: 72px;
  height: 72px;
}
.s-badges__text {
  color: rgba(0,0,0,0.7);
  text-align: center;
  font-family: "SCoreDream-5Medium", sans-serif;
  font-size: 36px;
  line-height: 160%;
  letter-spacing: -0.02em;
}',
-- placeholders
'[
  {"id": "badge_1", "type": "text", "label": "뱃지 1", "editable": true, "source": "ai"},
  {"id": "badge_2", "type": "text", "label": "뱃지 2", "editable": true, "source": "ai"},
  {"id": "badge_3", "type": "text", "label": "뱃지 3", "editable": true, "source": "ai"},
  {"id": "theme_accent", "type": "text", "label": "강조 색상", "editable": false, "source": "theme"}
]');

-- ── description ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('description', '상세 설명',
-- HTML
'<div class="s-desc">
  <div class="s-desc__spacer-top"></div>
  <div class="s-desc__title">
    <span class="s-desc__title-main" data-placeholder="desc_title_main" data-editable="true">{{desc_title_main}}</span><br/>
    <span class="s-desc__title-accent" data-placeholder="desc_title_accent" data-editable="true">{{desc_title_accent}}</span>
  </div>
  <div class="s-desc__spacer-1"></div>
  <div class="s-desc__body" data-placeholder="desc_body" data-editable="true">{{desc_body}}</div>
  <div class="s-desc__spacer-2"></div>
  <div class="s-desc__tags">{{hashtags_html}}</div>
  <div class="s-desc__spacer-3"></div>
  <img class="s-desc__image" src="{{section_image}}" />
  <div class="s-desc__spacer-bottom"></div>
</div>',
-- CSS
'.s-desc, .s-desc * { box-sizing: border-box; }
.s-desc {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 860px;
  position: relative;
}
.s-desc__spacer-top { align-self: stretch; height: 150px; }
.s-desc__title {
  text-align: center;
  font-family: "BmDoHyeonOtf-Regular", sans-serif;
  font-size: 60px;
  line-height: 140%;
  letter-spacing: -0.02em;
}
.s-desc__title-main { color: #000000; }
.s-desc__title-accent { color: {{theme_accent}}; }
.s-desc__spacer-1 { align-self: stretch; height: 40px; }
.s-desc__body {
  color: #333333;
  text-align: center;
  font-family: "SCoreDream-5Medium", sans-serif;
  font-size: 40px;
  line-height: 160%;
  letter-spacing: -0.02em;
}
.s-desc__spacer-2 { align-self: stretch; height: 40px; }
.s-desc__tags {
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  width: 799px;
}
.s-desc__tag {
  background: #ffffff;
  border-radius: 50px;
  border: 2px solid #000000;
  padding: 24px;
  color: #111111;
  text-align: center;
  font-family: "SCoreDream-5Medium", sans-serif;
  font-size: 30px;
  line-height: 160%;
  letter-spacing: -0.02em;
}
.s-desc__spacer-3 { align-self: stretch; height: 80px; }
.s-desc__image {
  border-radius: 1000px;
  border: 20px solid {{theme_accent}};
  width: 600px;
  height: 600px;
  object-fit: cover;
}
.s-desc__spacer-bottom { align-self: stretch; height: 0; }',
-- placeholders
'[
  {"id": "desc_title_main", "type": "text", "label": "설명 제목 (메인)", "editable": true, "source": "ai"},
  {"id": "desc_title_accent", "type": "text", "label": "설명 제목 (강조)", "editable": true, "source": "ai"},
  {"id": "desc_body", "type": "text", "label": "설명 본문", "editable": true, "source": "ai"},
  {"id": "hashtags_html", "type": "html", "label": "해시태그", "editable": false, "source": "ai"},
  {"id": "section_image", "type": "image", "label": "섹션 이미지", "editable": false, "source": "product"},
  {"id": "theme_accent", "type": "text", "label": "강조 색상", "editable": false, "source": "theme"}
]');

-- ── feature_point ──
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders) VALUES
('feature_point', '특징 포인트',
-- HTML
'<div class="s-point">
  <div class="s-point__spacer-top"></div>
  <div class="s-point__badge">
    <div class="s-point__badge-text" data-placeholder="point_label" data-editable="true">{{point_label}}</div>
  </div>
  <div class="s-point__spacer-1"></div>
  <div class="s-point__title">
    <span class="s-point__title-main" data-placeholder="point_title_main" data-editable="true">{{point_title_main}}</span>
    <span class="s-point__title-accent" data-placeholder="point_title_accent" data-editable="true">{{point_title_accent}}</span>
  </div>
  <div class="s-point__spacer-2"></div>
  <div class="s-point__body" data-placeholder="point_body" data-editable="true">{{point_body}}</div>
  <div class="s-point__spacer-3"></div>
  <img class="s-point__image" src="{{section_image}}" />
  <div class="s-point__spacer-bottom"></div>
</div>',
-- CSS
'.s-point, .s-point * { box-sizing: border-box; }
.s-point {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 860px;
  position: relative;
}
.s-point__spacer-top { align-self: stretch; height: 151px; }
.s-point__badge {
  background: #000000;
  border-radius: 50px;
  padding: 24px 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 95px;
  overflow: hidden;
}
.s-point__badge-text {
  color: #ffffff;
  text-align: center;
  font-family: "SCoreDream-6Bold", sans-serif;
  font-size: 36px;
  line-height: 140%;
  letter-spacing: -0.02em;
}
.s-point__spacer-1 { align-self: stretch; height: 53px; }
.s-point__title {
  text-align: center;
  font-family: "BmDoHyeonOtf-Regular", sans-serif;
  font-size: 60px;
  line-height: 140%;
  letter-spacing: -0.02em;
}
.s-point__title-main { color: #000000; }
.s-point__title-accent { color: {{theme_accent}}; }
.s-point__spacer-2 { align-self: stretch; height: 43px; }
.s-point__body {
  color: #333333;
  text-align: center;
  font-family: "SCoreDream-5Medium", sans-serif;
  font-size: 40px;
  line-height: 160%;
  letter-spacing: -0.02em;
  width: 646px;
}
.s-point__spacer-3 { align-self: stretch; height: 80px; }
.s-point__image {
  align-self: stretch;
  height: 957px;
  object-fit: cover;
}
.s-point__spacer-bottom { align-self: stretch; height: 0; }',
-- placeholders
'[
  {"id": "point_label", "type": "text", "label": "포인트 라벨", "editable": true, "source": "ai"},
  {"id": "point_title_main", "type": "text", "label": "포인트 제목 (메인)", "editable": true, "source": "ai"},
  {"id": "point_title_accent", "type": "text", "label": "포인트 제목 (강조)", "editable": true, "source": "ai"},
  {"id": "point_body", "type": "text", "label": "포인트 본문", "editable": true, "source": "ai"},
  {"id": "section_image", "type": "image", "label": "섹션 이미지", "editable": false, "source": "product"},
  {"id": "theme_accent", "type": "text", "label": "강조 색상", "editable": false, "source": "theme"}
]');
