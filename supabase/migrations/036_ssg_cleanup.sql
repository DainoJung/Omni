-- Migration 036: SSG Cleanup
-- Archives/removes SSG-specific data that is no longer used after global SaaS transition.

-- 1. Remove inactive SSG section templates (already deactivated in migration 035)
DELETE FROM section_templates
WHERE is_active = false
  AND section_type IN (
    'vip_special_hero', 'vip_private_hero',
    'gourmet_hero', 'gourmet_restaurant', 'gourmet_wine_intro', 'gourmet_wine',
    'shinsegae_hero',
    'fit_hero', 'fit_event_info', 'fit_product_trio', 'fit_brand_special'
  );

-- 2. Deactivate SSG themes (keep data for historical projects)
UPDATE themes SET is_active = false WHERE is_active = true;

-- 3. Add index for template_style on projects (used in v2 queries)
CREATE INDEX IF NOT EXISTS idx_projects_template_style ON projects(template_style) WHERE template_style IS NOT NULL;

-- 4. Add index for language on projects
CREATE INDEX IF NOT EXISTS idx_projects_language ON projects(language) WHERE language IS NOT NULL;
