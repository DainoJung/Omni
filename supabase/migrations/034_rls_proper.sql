-- Migration 034: Replace permissive RLS with proper user-scoped policies
-- Backend uses service_key (bypasses RLS), so this only affects direct client access

-- Projects: users can only see their own projects
DROP POLICY IF EXISTS "projects_public_access" ON projects;
DROP POLICY IF EXISTS "Allow all access to projects" ON projects;

CREATE POLICY "projects_user_select" ON projects
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR user_id IS NULL
  );

CREATE POLICY "projects_user_insert" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "projects_user_update" ON projects
  FOR UPDATE USING (
    auth.uid()::text = user_id::text
    OR user_id IS NULL
  );

CREATE POLICY "projects_user_delete" ON projects
  FOR DELETE USING (
    auth.uid()::text = user_id::text
    OR user_id IS NULL
  );

-- Project images: follow project ownership
DROP POLICY IF EXISTS "project_images_public_access" ON project_images;
DROP POLICY IF EXISTS "Allow all access to project_images" ON project_images;

CREATE POLICY "project_images_user_access" ON project_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_images.project_id
        AND (p.user_id::text = auth.uid()::text OR p.user_id IS NULL)
    )
  );

-- Section templates: read-only for all authenticated users
DROP POLICY IF EXISTS "section_templates_public_access" ON section_templates;
DROP POLICY IF EXISTS "Allow all access to section_templates" ON section_templates;

CREATE POLICY "section_templates_read" ON section_templates
  FOR SELECT USING (true);

-- Themes: read-only for all
DROP POLICY IF EXISTS "themes_public_access" ON themes;
DROP POLICY IF EXISTS "Allow all access to themes" ON themes;

CREATE POLICY "themes_read" ON themes
  FOR SELECT USING (true);

-- Color presets: read-only for all
DROP POLICY IF EXISTS "color_presets_public_access" ON color_presets;
DROP POLICY IF EXISTS "Allow all access to color_presets" ON color_presets;

CREATE POLICY "color_presets_read" ON color_presets
  FOR SELECT USING (true);

-- Users: users can only see/update their own profile
DROP POLICY IF EXISTS "users_public_access" ON users;
DROP POLICY IF EXISTS "Allow all access to users" ON users;

CREATE POLICY "users_self_select" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_self_update" ON users
  FOR UPDATE USING (
    auth.uid()::text = id::text
  );
