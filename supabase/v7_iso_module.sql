-- ============================================================
-- V7 — ISO 9001 Project Management Module
-- Run in Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rol en profiles
--    Default 'consultant' para usuarios existentes.
--    Usuarios cliente se crean en Supabase Auth y se setea 'client'.
-- ------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'consultant';

-- Función helper: devuelve true si el usuario autenticado es consultor.
-- SECURITY DEFINER para poder leer profiles sin restricción de RLS.
CREATE OR REPLACE FUNCTION is_consultant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'consultant'
  )
$$;

-- ------------------------------------------------------------
-- 2. Tabla projects
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  client_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'paused', 'completed')),
  start_date       date,
  estimated_end_date date,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. Tabla project_topics
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_topics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  topic_key     text NOT NULL,
  display_name  text NOT NULL,
  order_index   integer NOT NULL DEFAULT 0,
  is_applicable boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. Tabla topic_subtasks
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS topic_subtasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_topic_id uuid NOT NULL REFERENCES project_topics(id) ON DELETE CASCADE,
  label            text NOT NULL,
  is_completed     boolean NOT NULL DEFAULT false,
  completed_at     timestamptz,
  order_index      integer NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- 5. Tabla meetings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scheduled_at    timestamptz NOT NULL,
  summary         text,
  next_steps      text,
  topics_covered  text[],
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 6. RLS
-- ------------------------------------------------------------
ALTER TABLE projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings       ENABLE ROW LEVEL SECURITY;

-- projects
DROP POLICY IF EXISTS "consultant full access on projects"  ON projects;
DROP POLICY IF EXISTS "client select own project"           ON projects;

CREATE POLICY "consultant full access on projects" ON projects
  FOR ALL
  USING (is_consultant())
  WITH CHECK (is_consultant());

CREATE POLICY "client select own project" ON projects
  FOR SELECT
  USING (client_user_id = auth.uid());

-- project_topics
DROP POLICY IF EXISTS "consultant full access on project_topics" ON project_topics;
DROP POLICY IF EXISTS "client select own project_topics"         ON project_topics;

CREATE POLICY "consultant full access on project_topics" ON project_topics
  FOR ALL
  USING (is_consultant())
  WITH CHECK (is_consultant());

CREATE POLICY "client select own project_topics" ON project_topics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_topics.project_id
        AND projects.client_user_id = auth.uid()
    )
  );

-- topic_subtasks
DROP POLICY IF EXISTS "consultant full access on topic_subtasks" ON topic_subtasks;
DROP POLICY IF EXISTS "client select own topic_subtasks"         ON topic_subtasks;

CREATE POLICY "consultant full access on topic_subtasks" ON topic_subtasks
  FOR ALL
  USING (is_consultant())
  WITH CHECK (is_consultant());

CREATE POLICY "client select own topic_subtasks" ON topic_subtasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_topics pt
      JOIN projects p ON p.id = pt.project_id
      WHERE pt.id = topic_subtasks.project_topic_id
        AND p.client_user_id = auth.uid()
    )
  );

-- meetings
DROP POLICY IF EXISTS "consultant full access on meetings" ON meetings;
DROP POLICY IF EXISTS "client select own meetings"         ON meetings;

CREATE POLICY "consultant full access on meetings" ON meetings
  FOR ALL
  USING (is_consultant())
  WITH CHECK (is_consultant());

CREATE POLICY "client select own meetings" ON meetings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = meetings.project_id
        AND projects.client_user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 7. Función seed: genera todos los temas y subtareas de un proyecto nuevo
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_project_topics(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic_id uuid;
BEGIN

  -- 1. Alcance (obligatorio)
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'alcance', 'Alcance', 1, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2),
    (v_topic_id, 'Aprobado', 3), (v_topic_id, 'Desplegado', 4);

  -- 2. Contexto
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'contexto', 'Contexto', 2, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2), (v_topic_id, 'Aprobado', 3);

  -- 3. Partes interesadas
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'partes_interesadas', 'Partes interesadas', 3, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2), (v_topic_id, 'Aprobado', 3);

  -- 4. Procesos
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'procesos', 'Procesos', 4, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2), (v_topic_id, 'Aprobado', 3);

  -- 5. Política de calidad
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'politica_calidad', 'Política de calidad', 5, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2),
    (v_topic_id, 'Aprobado', 3), (v_topic_id, 'Desplegado', 4);

  -- 6. Indicadores & Objetivos
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'indicadores_objetivos', 'Indicadores & Objetivos', 6, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2),
    (v_topic_id, 'Aprobado', 3), (v_topic_id, 'Desplegado', 4);

  -- 7. Información documentada
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'informacion_documentada', 'Información documentada', 7, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2),
    (v_topic_id, 'Aprobado', 3), (v_topic_id, 'Desplegado', 4);

  -- 8. Procedimientos estándar
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'procedimientos_estandar', 'Procedimientos estándar', 8, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2),
    (v_topic_id, 'Aprobado', 3), (v_topic_id, 'Desplegado', 4);

  -- 9. Competencias
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'competencias', 'Competencias', 9, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2), (v_topic_id, 'Aprobado', 3);

  -- 10. Evaluación de proveedores
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'evaluacion_proveedores', 'Evaluación de proveedores', 10, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2), (v_topic_id, 'Aprobado', 3);

  -- 11. Gestión de riesgos
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'gestion_riesgos', 'Gestión de riesgos', 11, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2),
    (v_topic_id, 'Aprobado', 3), (v_topic_id, 'Desplegado', 4);

  -- 12. Auditorías internas
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'auditorias_internas', 'Auditorías internas', 12, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Coordinadas', 1), (v_topic_id, 'Ejecutadas', 2),
    (v_topic_id, 'Desvíos analizados', 3), (v_topic_id, 'Desvíos implementados', 4);

  -- 13. No conformidades
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'no_conformidades', 'No conformidades', 13, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Implementado', 2);

  -- 14. Revisión por la dirección
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'revision_direccion', 'Revisión por la dirección', 14, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Implementado', 2);

  -- 15. Selección de certificadora
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'seleccion_certificadora', 'Selección de certificadora', 15, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Conexión con certificadora', 1),
    (v_topic_id, 'Aprobación de presupuesto', 2);

  -- 16. Coordinación auditoría externa
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'coordinacion_auditoria_externa', 'Coordinación auditoría externa', 16, true) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Confirmación de fecha de auditoría externa', 1);

  -- 17. Trazabilidad de mediciones (opcional)
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'trazabilidad_mediciones', 'Trazabilidad de mediciones', 17, false) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Borrador 1', 2), (v_topic_id, 'Aprobado', 3),
    (v_topic_id, 'Programa de calibración definido', 4),
    (v_topic_id, 'Instrumentos calibrados/verificados', 5);

  -- 18. Diseño y desarrollo (opcional)
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'diseno_desarrollo', 'Diseño y desarrollo', 18, false) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Proceso definido', 2),
    (v_topic_id, 'Ejemplos y registros realizados', 3);

  -- 19. Matriz legal (opcional)
  INSERT INTO project_topics (project_id, topic_key, display_name, order_index, is_applicable)
    VALUES (p_project_id, 'matriz_legal', 'Matriz legal', 19, false) RETURNING id INTO v_topic_id;
  INSERT INTO topic_subtasks (project_topic_id, label, order_index) VALUES
    (v_topic_id, 'Intro', 1), (v_topic_id, 'Requisitos definidos', 2),
    (v_topic_id, 'Niveles de cumplimiento definidos', 3);

END;
$$;
