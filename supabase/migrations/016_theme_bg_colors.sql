-- 테마에 catalog_bg_color 컬럼 추가
ALTER TABLE themes ADD COLUMN IF NOT EXISTS catalog_bg_color TEXT;

-- 각 테마별 배경색 설정
UPDATE themes SET catalog_bg_color = '#1a472a' WHERE id = 'holiday';        -- 크리스마스 그린
UPDATE themes SET catalog_bg_color = '#9d174d' WHERE id = 'spring_sale';    -- 진한 로즈
UPDATE themes SET catalog_bg_color = '#0c4a6e' WHERE id = 'summer_special'; -- 시원한 블루
UPDATE themes SET catalog_bg_color = '#78350f' WHERE id = 'autumn_new';     -- 가을 브라운
UPDATE themes SET catalog_bg_color = '#1e3a5f' WHERE id = 'winter_promo';   -- 겨울 네이비
