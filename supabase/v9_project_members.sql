-- ============================================================
-- V9 — Responsables de proceso + seguimiento individual
-- ============================================================

-- project_members: responsables de proceso dentro de un proyecto
CREATE TABLE IF NOT EXISTS project_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  process_name     text NOT NULL,
  member_name      text NOT NULL,
  member_email     text NOT NULL,
  member_position  text,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- member_log_entries: seguimiento por categoría ISO
CREATE TABLE IF NOT EXISTS member_log_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_member_id uuid NOT NULL REFERENCES project_members(id) ON DELETE CASCADE,
  category          text NOT NULL CHECK (category IN (
    'indicadores', 'riesgos', 'no_conformidades', 'competencias'
  )),
  title             text NOT NULL,
  description       text,
  entry_date        date NOT NULL DEFAULT CURRENT_DATE,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE project_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_log_entries ENABLE ROW LEVEL SECURITY;

-- ── project_members ──────────────────────────────────────────

DROP POLICY IF EXISTS "consultant full access on project_members" ON project_members;
DROP POLICY IF EXISTS "member see own record"                     ON project_members;

CREATE POLICY "consultant full access on project_members" ON project_members
  FOR ALL USING (is_consultant()) WITH CHECK (is_consultant());

-- Miembro: puede ver su registro por email (antes del primer link) o por user_id
CREATE POLICY "member see own record" ON project_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ── member_log_entries ───────────────────────────────────────

DROP POLICY IF EXISTS "consultant full access on member_log_entries" ON member_log_entries;
DROP POLICY IF EXISTS "member manage own entries"                     ON member_log_entries;

CREATE POLICY "consultant full access on member_log_entries" ON member_log_entries
  FOR ALL USING (is_consultant()) WITH CHECK (is_consultant());

CREATE POLICY "member manage own entries" ON member_log_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.id = member_log_entries.project_member_id
        AND (
          pm.user_id = auth.uid()
          OR pm.member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.id = member_log_entries.project_member_id
        AND (
          pm.user_id = auth.uid()
          OR pm.member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
  );

-- ── Función para vincular member_email → user_id en primer login ──

CREATE OR REPLACE FUNCTION link_member_by_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  UPDATE project_members
    SET user_id = auth.uid()
  WHERE member_email = v_email
    AND user_id IS NULL;
END;
$$;

-- ── projects: también accesibles para miembros del proyecto ──

-- Miembro puede ver el proyecto al que pertenece
DROP POLICY IF EXISTS "member select own project" ON projects;
CREATE POLICY "member select own project" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
        AND (
          pm.user_id = auth.uid()
          OR pm.member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
  );
