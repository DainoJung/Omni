-- 027: Make all visible text editable in gourmet templates
-- Add data-placeholder + data-editable="true" to all text elements
-- Convert hardcoded labels ("RESTAURANT", "레스토랑", "WINE", "와인", "SPECIAL EVENT") to static placeholders

-- 1. gourmet_hero: 4 existing text + 2 new static placeholders
UPDATE section_templates
SET
  html_template = $html$<div class="s-gh">
  <div class="s-gh__inner">
    <h1 class="s-gh__title" data-placeholder="hero_title" data-editable="true">{{hero_title}}</h1>
    <p class="s-gh__subtitle" data-placeholder="hero_subtitle" data-editable="true">{{hero_subtitle}}</p>
    <div class="s-gh__divider"></div>
    <div class="s-gh__tag" data-placeholder="tag_label" data-editable="true">{{tag_label}}</div>
    <h2 class="s-gh__heading" data-placeholder="restaurant_heading" data-editable="true">{{restaurant_heading}}</h2>
    <div class="s-gh__deco" data-placeholder="deco_label" data-editable="true">{{deco_label}}</div>
    <p class="s-gh__desc" data-placeholder="hero_desc" data-editable="true">{{hero_desc}}</p>
  </div>
</div>$html$,
  placeholders = '[
    {"id":"hero_title","type":"text","source":"ai"},
    {"id":"hero_subtitle","type":"text","source":"ai"},
    {"id":"restaurant_heading","type":"text","source":"ai"},
    {"id":"hero_desc","type":"text","source":"ai"},
    {"id":"tag_label","type":"text","source":"static","default":"RESTAURANT"},
    {"id":"deco_label","type":"text","source":"static","default":"레스토랑"}
  ]'::jsonb
WHERE section_type = 'gourmet_hero';

-- 2. gourmet_restaurant: 11 existing text + 1 new static placeholder (event_title)
UPDATE section_templates
SET
  html_template = $html$<div class="s-gr">
  <div class="s-gr__card">
    <div class="s-gr__travel">
      <span class="s-gr__travel-tag" data-placeholder="travel_tag" data-editable="true">{{travel_tag}}</span>
    </div>
    <p class="s-gr__travel-desc" data-placeholder="travel_desc" data-editable="true">{{travel_desc}}</p>
    <div class="s-gr__scene">
      <img class="s-gr__scene-img" src="{{restaurant_image}}" alt="" />
      <div class="s-gr__scene-overlay">
        <span class="s-gr__name" data-placeholder="product_name" data-editable="true">{{product_name}}</span>
        <span class="s-gr__floor" data-placeholder="restaurant_floor" data-editable="true">{{restaurant_floor}}</span>
      </div>
    </div>
    <p class="s-gr__desc" data-placeholder="restaurant_desc" data-editable="true">{{restaurant_desc}}</p>
    <div class="s-gr__menus">
      <div class="s-gr__menu-item">
        <div class="s-gr__menu-img-wrap">
          <img class="s-gr__menu-img" src="{{food1_image}}" alt="" />
        </div>
        <h3 class="s-gr__menu-name" data-placeholder="food1_name" data-editable="true">{{food1_name}}</h3>
        <p class="s-gr__menu-desc" data-placeholder="food1_desc" data-editable="true">{{food1_desc}}</p>
      </div>
      <div class="s-gr__menu-divider"></div>
      <div class="s-gr__menu-item">
        <div class="s-gr__menu-img-wrap">
          <img class="s-gr__menu-img" src="{{food2_image}}" alt="" />
        </div>
        <h3 class="s-gr__menu-name" data-placeholder="food2_name" data-editable="true">{{food2_name}}</h3>
        <p class="s-gr__menu-desc" data-placeholder="food2_desc" data-editable="true">{{food2_desc}}</p>
      </div>
    </div>
    <div class="s-gr__event">
      <div class="s-gr__event-line"></div>
      <span class="s-gr__event-title" data-placeholder="event_title" data-editable="true">{{event_title}}</span>
      <div class="s-gr__event-line"></div>
    </div>
    <div class="s-gr__event-list">
      <p class="s-gr__event-item" data-placeholder="event1" data-editable="true">{{event1}}</p>
      <p class="s-gr__event-item" data-placeholder="event2" data-editable="true">{{event2}}</p>
    </div>
  </div>
</div>$html$,
  placeholders = '[
    {"id":"travel_tag","type":"text","source":"ai"},
    {"id":"travel_desc","type":"text","source":"ai"},
    {"id":"restaurant_image","type":"image","source":"ai"},
    {"id":"product_name","type":"text","source":"restaurant_food"},
    {"id":"restaurant_floor","type":"text","source":"ai"},
    {"id":"restaurant_desc","type":"text","source":"ai"},
    {"id":"food1_image","type":"image","source":"restaurant_food"},
    {"id":"food1_name","type":"text","source":"restaurant_food"},
    {"id":"food1_desc","type":"text","source":"ai"},
    {"id":"food2_image","type":"image","source":"restaurant_food"},
    {"id":"food2_name","type":"text","source":"restaurant_food"},
    {"id":"food2_desc","type":"text","source":"ai"},
    {"id":"event1","type":"text","source":"ai"},
    {"id":"event2","type":"text","source":"ai"},
    {"id":"event_title","type":"text","source":"static","default":"SPECIAL EVENT"}
  ]'::jsonb
WHERE section_type = 'gourmet_restaurant';

-- 3. gourmet_wine_intro: 2 existing text + 2 new static placeholders
UPDATE section_templates
SET
  html_template = $html$<div class="s-gwi">
  <div class="s-gwi__inner">
    <div class="s-gwi__divider"></div>
    <div class="s-gwi__tag" data-placeholder="tag_label" data-editable="true">{{tag_label}}</div>
    <h2 class="s-gwi__heading" data-placeholder="wine_heading" data-editable="true">{{wine_heading}}</h2>
    <div class="s-gwi__deco" data-placeholder="deco_label" data-editable="true">{{deco_label}}</div>
    <p class="s-gwi__desc" data-placeholder="wine_desc" data-editable="true">{{wine_desc}}</p>
  </div>
</div>$html$,
  placeholders = '[
    {"id":"wine_desc","type":"text","source":"ai"},
    {"id":"wine_heading","type":"text","source":"ai"},
    {"id":"tag_label","type":"text","source":"static","default":"WINE"},
    {"id":"deco_label","type":"text","source":"static","default":"와인"}
  ]'::jsonb
WHERE section_type = 'gourmet_wine_intro';

-- 4. gourmet_wine: 2 existing text with editable attributes added
UPDATE section_templates
SET
  html_template = $html$<div class="s-gw">
  <div class="s-gw__inner">
    <div class="s-gw__bottle-wrap">
      <img class="s-gw__bottle" src="{{wine_image}}" alt="" />
    </div>
    <div class="s-gw__info">
      <h3 class="s-gw__name" data-placeholder="wine_name" data-editable="true">{{wine_name}}</h3>
      <p class="s-gw__note" data-placeholder="wine_note" data-editable="true">{{wine_note}}</p>
    </div>
  </div>
</div>$html$
WHERE section_type = 'gourmet_wine';
