-- ============================================================
-- V10 — Fix RLS policies: auth.users → auth.email()
--
-- El rol `authenticated` no puede leer auth.users directamente.
-- auth.email() lee el email del JWT sin acceso a la tabla.
-- ============================================================

-- ── project_members ──────────────────────────────────────────

DROP POLICY IF EXISTS "member see own record" ON project_members;
CREATE POLICY "member see own record" ON project_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR member_email = auth.email()
  );

-- ── member_log_entries ───────────────────────────────────────

DROP POLICY IF EXISTS "member manage own entries" ON member_log_entries;
CREATE POLICY "member manage own entries" ON member_log_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.id = member_log_entries.project_member_id
        AND (
          pm.user_id = auth.uid()
          OR pm.member_email = auth.email()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.id = member_log_entries.project_member_id
        AND (
          pm.user_id = auth.uid()
          OR pm.member_email = auth.email()
        )
    )
  );

-- ── projects: member access ───────────────────────────────────

DROP POLICY IF EXISTS "member select own project" ON projects;
CREATE POLICY "member select own project" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
        AND (
          pm.user_id = auth.uid()
          OR pm.member_email = auth.email()
        )
    )
  );

-- ── project_topics / topic_subtasks / meetings: member access ─
-- (cascada desde projects — miembro ve todo lo del proyecto al que pertenece)

DROP POLICY IF EXISTS "member select own project_topics" ON project_topics;
CREATE POLICY "member select own project_topics" ON project_topics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_topics.project_id
        AND (
          pm.user_id = auth.uid()
          OR pm.member_email = auth.email()
        )
    )
  );

DROP POLICY IF EXISTS "member select own topic_subtasks" ON topic_subtasks;
CREATE POLICY "member select own topic_subtasks" ON topic_subtasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_topics pt
      JOIN project_members pm ON pm.project_id = pt.project_id
      WHERE pt.id = topic_subtasks.project_topic_id
        AND (
          pm.user_id = auth.uid()
          OR pm.member_email = auth.email()
        )
    )
  );

DROP POLICY IF EXISTS "member select own meetings" ON meetings;
CREATE POLICY "member select own meetings" ON meetings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meetings.project_id
        AND (
          pm.user_id = auth.uid()
          OR pm.member_email = auth.email()
        )
    )
  );

-- ── seed_project_topics: agregar chequeo de autorización ─────
-- Evita que un miembro/cliente llame a esta función SECURITY DEFINER directamente.

CREATE OR REPLACE FUNCTION seed_project_topics(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic_id uuid;
BEGIN
  IF NOT is_consultant() THEN
    RAISE EXCEPTION 'Permission denied: only consultants can seed project topics';
  END IF;

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
