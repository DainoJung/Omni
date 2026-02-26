-- 031: 고메트립 레스토랑 음식 이미지 크기 확대 (260→320px)

UPDATE section_templates
SET
  css_template = $css$@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
.s-gr{width:860px;background:#fff;padding:40px 0}
.s-gr__card{background:#f5f6f8;border-radius:20px;margin:0 30px;padding:40px 0 32px;box-shadow:0 2px 16px rgba(0,0,0,.07)}
.s-gr__travel{text-align:center;margin-bottom:6px}
.s-gr__travel-tag{font-family:'Pretendard',sans-serif;font-weight:500;font-size:16px;letter-spacing:.1em;color:#873a30;text-transform:uppercase}
.s-gr__travel-desc{font-family:'Pretendard',sans-serif;font-weight:400;font-size:28px;line-height:1.5;color:#222;text-align:center;margin:0 0 20px;padding:0 60px}
.s-gr__scene{position:relative;width:calc(100% - 40px);height:480px;overflow:hidden;margin:0 auto 24px;border-radius:14px}
.s-gr__scene-img{width:100%;height:100%;object-fit:cover}
.s-gr__scene-overlay{position:absolute;bottom:0;left:0;right:0;padding:24px 32px;background:linear-gradient(transparent,rgba(0,0,0,.65));border-radius:0 0 14px 14px;display:flex;align-items:baseline;gap:8px}
.s-gr__name{font-family:'Pretendard',sans-serif;font-weight:700;font-size:34px;color:#fff}
.s-gr__floor{font-family:'Pretendard',sans-serif;font-weight:400;font-size:20px;color:rgba(255,255,255,.8)}
.s-gr__desc{font-family:'Pretendard',sans-serif;font-weight:400;font-size:26px;line-height:1.6;color:#444;text-align:center;padding:0 60px;margin:0 0 28px;white-space:pre-line}
.s-gr__menus{display:flex;gap:20px;padding:0 40px;margin-bottom:28px}
.s-gr__menu-item{flex:1;text-align:center}
.s-gr__menu-img-wrap{width:320px;height:320px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center}
.s-gr__menu-img{max-width:100%;max-height:100%;object-fit:contain}
.s-gr__menu-name{font-family:'Pretendard',sans-serif;font-weight:600;font-size:26px;color:#222;margin:0 0 8px}
.s-gr__menu-desc{font-family:'Pretendard',sans-serif;font-weight:200;font-size:22px;line-height:1.5;color:#444;margin:0;white-space:pre-line}
.s-gr__menu-divider{width:1px;background:#ddd}
.s-gr__event{display:flex;align-items:center;gap:12px;padding:0 60px;margin-bottom:14px}
.s-gr__event-line{flex:1;height:1px;background:#873a30}
.s-gr__event-title{font-family:'Pretendard',sans-serif;font-weight:600;font-size:13px;letter-spacing:.12em;color:#873a30;white-space:nowrap}
.s-gr__event-list{padding:0 80px;margin-bottom:8px}
.s-gr__event-item{font-family:'Pretendard',sans-serif;font-weight:400;font-size:20px;line-height:1.6;color:#444;margin:0 0 4px;text-align:center}$css$
WHERE section_type = 'gourmet_restaurant';
