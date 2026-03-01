-- Migration 035: Global section templates for SaaS PDP generator
-- Deactivates SSG-specific templates and inserts universal global templates
-- Global templates use CSS Custom Properties for style variation

-- 1. Deactivate SSG-specific section templates
UPDATE section_templates SET is_active = false
WHERE section_type IN (
  'vip_special_hero', 'vip_private_hero',
  'gourmet_hero', 'gourmet_restaurant', 'gourmet_wine_intro', 'gourmet_wine',
  'shinsegae_hero',
  'fit_hero', 'fit_event_info', 'fit_product_trio', 'fit_brand_special'
);

-- 2. Insert global section templates
-- These use CSS Custom Properties (--accent-color, --bg-color, --font-heading, --font-body, --text-color, etc.)
-- The backend injects actual values per template style

-- 2a. Global Hero Section
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders, is_active)
VALUES (
  'global_hero', 'Global Hero',
  '<div class="s-hero">
    <div class="s-hero__bg" style="background-image: url(''{{hero_image}}'')"></div>
    <div class="s-hero__overlay"></div>
    <div class="s-hero__content">
      <p class="s-hero__category">{{category}}</p>
      <h1 class="s-hero__title">{{title}}</h1>
      <p class="s-hero__subtitle">{{subtitle}}</p>
    </div>
  </div>',
  '.s-hero { position: relative; width: 860px; min-height: 600px; overflow: hidden; font-family: var(--font-body, "Noto Sans KR", sans-serif); }
.s-hero__bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
.s-hero__overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent); }
.s-hero__content { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: flex-end; min-height: 600px; padding: 60px 50px; box-sizing: border-box; color: #fff; }
.s-hero__category { font-family: var(--font-heading, "Montserrat", sans-serif); font-size: 14px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px; opacity: 0.85; }
.s-hero__title { font-family: var(--font-heading, "Montserrat", sans-serif); font-size: 42px; font-weight: 700; line-height: 1.2; margin-bottom: 16px; }
.s-hero__subtitle { font-size: 18px; line-height: 1.6; opacity: 0.9; max-width: 500px; }',
  '[
    {"id": "hero_image", "type": "image", "source": "ai", "editable": true},
    {"id": "category", "type": "text", "source": "ai", "editable": true},
    {"id": "title", "type": "text", "source": "ai", "editable": true},
    {"id": "subtitle", "type": "text", "source": "ai", "editable": true}
  ]'::jsonb,
  true
);

-- 2b. Global Feature Grid Section
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders, is_active)
VALUES (
  'global_feature_grid', 'Global Feature Grid',
  '<div class="s-feat" style="background-color: var(--bg-color-alt, #FAFAFA);">
    <div class="s-feat__item">
      <div class="s-feat__icon" style="background-color: var(--accent-color, #111);">
        <span class="s-feat__emoji">{{badge_1_icon}}</span>
      </div>
      <p class="s-feat__label" style="color: var(--text-color, #111);">{{badge_1}}</p>
    </div>
    <div class="s-feat__item">
      <div class="s-feat__icon" style="background-color: var(--accent-color, #111);">
        <span class="s-feat__emoji">{{badge_2_icon}}</span>
      </div>
      <p class="s-feat__label" style="color: var(--text-color, #111);">{{badge_2}}</p>
    </div>
    <div class="s-feat__item">
      <div class="s-feat__icon" style="background-color: var(--accent-color, #111);">
        <span class="s-feat__emoji">{{badge_3_icon}}</span>
      </div>
      <p class="s-feat__label" style="color: var(--text-color, #111);">{{badge_3}}</p>
    </div>
  </div>',
  '.s-feat { width: 860px; display: flex; justify-content: center; gap: 40px; padding: 50px 40px; box-sizing: border-box; font-family: var(--font-body, "Noto Sans KR", sans-serif); }
.s-feat__item { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.s-feat__icon { width: 64px; height: 64px; border-radius: var(--border-radius, 8px); display: flex; align-items: center; justify-content: center; }
.s-feat__emoji { font-size: 28px; filter: grayscale(0); }
.s-feat__label { font-size: 14px; font-weight: 600; text-align: center; line-height: 1.4; white-space: pre-line; }',
  '[
    {"id": "badge_1_icon", "type": "text", "source": "ai", "editable": true},
    {"id": "badge_1", "type": "text", "source": "ai", "editable": true},
    {"id": "badge_2_icon", "type": "text", "source": "ai", "editable": true},
    {"id": "badge_2", "type": "text", "source": "ai", "editable": true},
    {"id": "badge_3_icon", "type": "text", "source": "ai", "editable": true},
    {"id": "badge_3", "type": "text", "source": "ai", "editable": true}
  ]'::jsonb,
  true
);

-- 2c. Global Description Section
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders, is_active)
VALUES (
  'global_description', 'Global Description',
  '<div class="s-desc" style="background-color: var(--bg-color, #FFF);">
    <div class="s-desc__image">
      <img src="{{desc_image}}" alt="" />
    </div>
    <div class="s-desc__text">
      <h2 class="s-desc__title" style="color: var(--text-color, #111); font-family: var(--font-heading);">
        <span class="s-desc__title-main">{{desc_title_main}}</span>
        <span class="s-desc__title-accent" style="color: var(--accent-color, #111);">{{desc_title_accent}}</span>
      </h2>
      <p class="s-desc__body" style="color: var(--text-color-sub, rgba(0,0,0,0.6));">{{desc_body}}</p>
    </div>
  </div>',
  '.s-desc { width: 860px; display: flex; flex-direction: column; font-family: var(--font-body, "Noto Sans KR", sans-serif); }
.s-desc__image { width: 100%; }
.s-desc__image img { width: 100%; height: auto; display: block; object-fit: cover; }
.s-desc__text { padding: 48px 50px; }
.s-desc__title { font-size: 28px; font-weight: 700; line-height: 1.3; margin-bottom: 20px; }
.s-desc__title-main { display: block; }
.s-desc__title-accent { display: block; }
.s-desc__body { font-size: 16px; line-height: 1.8; white-space: pre-line; }',
  '[
    {"id": "desc_image", "type": "image", "source": "ai", "editable": true},
    {"id": "desc_title_main", "type": "text", "source": "ai", "editable": true},
    {"id": "desc_title_accent", "type": "text", "source": "ai", "editable": true},
    {"id": "desc_body", "type": "text", "source": "ai", "editable": true}
  ]'::jsonb,
  true
);

-- 2d. Global Product Showcase Section
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders, is_active)
VALUES (
  'global_product_showcase', 'Global Product Showcase',
  '<div class="s-show" style="background-color: var(--bg-color-alt, #FAFAFA);">
    <div class="s-show__inner">
      <div class="s-show__image">
        <img src="{{product_image_0}}" alt="" />
      </div>
      <div class="s-show__info">
        <p class="s-show__brand" style="color: var(--accent-color, #111);">{{brand_name}}</p>
        <h3 class="s-show__name" style="color: var(--text-color, #111); font-family: var(--font-heading);">{{product_name_0}}</h3>
        <p class="s-show__desc" style="color: var(--text-color-sub);">{{point_body}}</p>
        <p class="s-show__price" style="color: var(--text-color, #111);">{{product_price_0}}</p>
      </div>
    </div>
  </div>',
  '.s-show { width: 860px; padding: 40px 50px; box-sizing: border-box; font-family: var(--font-body, "Noto Sans KR", sans-serif); }
.s-show__inner { display: flex; align-items: center; gap: 40px; }
.s-show__image { flex: 0 0 360px; }
.s-show__image img { width: 100%; height: auto; display: block; border-radius: var(--border-radius, 8px); }
.s-show__info { flex: 1; }
.s-show__brand { font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
.s-show__name { font-size: 24px; font-weight: 700; margin-bottom: 12px; line-height: 1.3; }
.s-show__desc { font-size: 15px; line-height: 1.7; margin-bottom: 16px; white-space: pre-line; }
.s-show__price { font-size: 20px; font-weight: 700; }',
  '[
    {"id": "product_image_0", "type": "image", "source": "product", "editable": true},
    {"id": "brand_name", "type": "text", "source": "product", "editable": true},
    {"id": "product_name_0", "type": "text", "source": "product", "editable": true},
    {"id": "point_body", "type": "text", "source": "ai", "editable": true},
    {"id": "product_price_0", "type": "text", "source": "product", "editable": true}
  ]'::jsonb,
  true
);

-- 2e. Global Gallery Section
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders, is_active)
VALUES (
  'global_gallery', 'Global Gallery',
  '<div class="s-gal" style="background-color: var(--bg-color, #FFF);">
    <h2 class="s-gal__heading" style="color: var(--text-color, #111); font-family: var(--font-heading);">{{gallery_heading}}</h2>
    <div class="s-gal__grid">
      <div class="s-gal__card" style="border-radius: var(--border-radius, 8px);">
        <img src="{{product_image_0}}" alt="" />
        <div class="s-gal__card-info">
          <p class="s-gal__card-name" style="color: var(--text-color, #111);">{{product_name_0}}</p>
          <p class="s-gal__card-price" style="color: var(--accent-color, #111);">{{product_price_0}}</p>
        </div>
      </div>
      <div class="s-gal__card" style="border-radius: var(--border-radius, 8px);">
        <img src="{{product_image_1}}" alt="" />
        <div class="s-gal__card-info">
          <p class="s-gal__card-name" style="color: var(--text-color, #111);">{{product_name_1}}</p>
          <p class="s-gal__card-price" style="color: var(--accent-color, #111);">{{product_price_1}}</p>
        </div>
      </div>
    </div>
  </div>',
  '.s-gal { width: 860px; padding: 48px 50px; box-sizing: border-box; font-family: var(--font-body, "Noto Sans KR", sans-serif); }
.s-gal__heading { font-size: 28px; font-weight: 700; text-align: center; margin-bottom: 32px; }
.s-gal__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.s-gal__card { overflow: hidden; background: var(--bg-color-alt, #FAFAFA); }
.s-gal__card img { width: 100%; height: 280px; object-fit: cover; display: block; }
.s-gal__card-info { padding: 16px; }
.s-gal__card-name { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
.s-gal__card-price { font-size: 16px; font-weight: 700; }',
  '[
    {"id": "gallery_heading", "type": "text", "source": "ai", "editable": true},
    {"id": "product_image_0", "type": "image", "source": "product", "editable": true},
    {"id": "product_name_0", "type": "text", "source": "product", "editable": true},
    {"id": "product_price_0", "type": "text", "source": "product", "editable": true},
    {"id": "product_image_1", "type": "image", "source": "product", "editable": true},
    {"id": "product_name_1", "type": "text", "source": "product", "editable": true},
    {"id": "product_price_1", "type": "text", "source": "product", "editable": true}
  ]'::jsonb,
  true
);

-- 2f. Global CTA Section
INSERT INTO section_templates (section_type, name, html_template, css_template, placeholders, is_active)
VALUES (
  'global_cta', 'Global CTA',
  '<div class="s-cta" style="background-color: var(--accent-color, #111);">
    <div class="s-cta__content">
      <h2 class="s-cta__title">{{cta_title}}</h2>
      <p class="s-cta__desc">{{cta_desc}}</p>
      <div class="s-cta__button" style="background-color: #fff; color: var(--accent-color, #111); border-radius: var(--border-radius, 8px);">
        {{cta_button}}
      </div>
    </div>
  </div>',
  '.s-cta { width: 860px; padding: 60px 50px; box-sizing: border-box; font-family: var(--font-body, "Noto Sans KR", sans-serif); text-align: center; }
.s-cta__content { max-width: 500px; margin: 0 auto; }
.s-cta__title { font-family: var(--font-heading, "Montserrat", sans-serif); font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 16px; line-height: 1.3; }
.s-cta__desc { font-size: 16px; color: rgba(255,255,255,0.8); margin-bottom: 32px; line-height: 1.6; }
.s-cta__button { display: inline-block; padding: 14px 40px; font-size: 16px; font-weight: 700; cursor: pointer; }',
  '[
    {"id": "cta_title", "type": "text", "source": "ai", "editable": true},
    {"id": "cta_desc", "type": "text", "source": "ai", "editable": true},
    {"id": "cta_button", "type": "text", "source": "ai", "editable": true}
  ]'::jsonb,
  true
);
