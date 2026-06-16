-- ============================================================
-- V11 — Niveles de avance por (responsable × categoría)
-- ============================================================

CREATE TABLE IF NOT EXISTS member_category_levels (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_member_id uuid NOT NULL REFERENCES project_members(id) ON DELETE CASCADE,
  category          text NOT NULL CHECK (category IN (
    'indicadores', 'riesgos', 'no_conformidades', 'competencias'
  )),
  level             integer NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 4),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_member_id, category)
);

ALTER TABLE member_category_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultant full access on member_category_levels" ON member_category_levels;
DROP POLICY IF EXISTS "member manage own category levels"                ON member_category_levels;

CREATE POLICY "consultant full access on member_category_levels" ON member_category_levels
  FOR ALL USING (is_consultant()) WITH CHECK (is_consultant());

CREATE POLICY "member manage own category levels" ON member_category_levels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.id = member_category_levels.project_member_id
        AND (pm.user_id = auth.uid() OR pm.member_email = auth.email())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.id = member_category_levels.project_member_id
        AND (pm.user_id = auth.uid() OR pm.member_email = auth.email())
    )
  );
