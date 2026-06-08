-- ============================================================
-- V2 MIGRATION — Safe incremental evolution
-- Run in Supabase SQL Editor
-- All changes are additive. No existing data is modified.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend clients (optional columns, backward compatible)
-- ------------------------------------------------------------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS status           text DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS notes            text,
  ADD COLUMN IF NOT EXISTS since_date       date,
  ADD COLUMN IF NOT EXISTS next_action_date date;

-- Validate: all existing clients get status = 'activo'
-- SELECT count(*) FROM clients WHERE status IS NULL; --> should be 0

-- ------------------------------------------------------------
-- 2. Extend hour_entries (one optional column)
-- ------------------------------------------------------------
ALTER TABLE hour_entries
  ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'operativo';

-- values: 'operativo' | 'comercial'
-- NULL historical entries are treated as 'operativo' in the app

-- ------------------------------------------------------------
-- 3. New table: client_interactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_interactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid REFERENCES profiles(id)  NOT NULL,
  client_id        uuid REFERENCES clients(id)   NOT NULL,
  date             date                           NOT NULL,
  type             text                           NOT NULL,
  -- 'reunion' | 'revision_servicio' | 'presupuesto' | 'aumento'
  -- 'propuesta_mejora' | 'reclamo' | 'actualizacion_comercial' | 'definicion_pendiente'
  summary          text,
  next_steps       text,
  status           text DEFAULT 'abierto',
  -- 'abierto' | 'cerrado'
  priority         text DEFAULT 'normal',
  -- 'baja' | 'normal' | 'alta' | 'critica'
  next_action_date date,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. New table: ideas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ideas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid REFERENCES profiles(id) NOT NULL,
  client_id        uuid REFERENCES clients(id),   -- nullable
  title            text                           NOT NULL,
  description      text,
  category         text,
  -- 'app_nueva' | 'mejora_app' | 'automatizacion' | 'ia'
  -- 'proceso_interno' | 'servicio_nuevo' | 'contenido' | 'tecnico'
  impact_estimated text,   -- 'bajo' | 'medio' | 'alto'
  effort_estimated text,   -- 'bajo' | 'medio' | 'alto'
  priority         text DEFAULT 'normal',
  -- 'baja' | 'normal' | 'alta' | 'critica'
  status           text DEFAULT 'nueva',
  -- 'nueva' | 'en_revision' | 'aprobada' | 'en_progreso' | 'pausada' | 'descartada' | 'implementada'
  next_step        text,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ------------------------------------------------------------
-- 5. RLS — client_interactions
-- ------------------------------------------------------------
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own interactions"  ON client_interactions;
DROP POLICY IF EXISTS "insert own interactions"  ON client_interactions;
DROP POLICY IF EXISTS "update own interactions"  ON client_interactions;
DROP POLICY IF EXISTS "delete own interactions"  ON client_interactions;

CREATE POLICY "select own interactions" ON client_interactions FOR SELECT
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "insert own interactions" ON client_interactions FOR INSERT
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "update own interactions" ON client_interactions FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "delete own interactions" ON client_interactions FOR DELETE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ------------------------------------------------------------
-- 6. RLS — ideas
-- ------------------------------------------------------------
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own ideas"  ON ideas;
DROP POLICY IF EXISTS "insert own ideas"  ON ideas;
DROP POLICY IF EXISTS "update own ideas"  ON ideas;
DROP POLICY IF EXISTS "delete own ideas"  ON ideas;

CREATE POLICY "select own ideas" ON ideas FOR SELECT
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "insert own ideas" ON ideas FOR INSERT
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "update own ideas" ON ideas FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "delete own ideas" ON ideas FOR DELETE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ------------------------------------------------------------
-- 7. Add subtopic_id to ideas (run after v2 migration)
-- ------------------------------------------------------------
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS subtopic_id uuid REFERENCES client_subtopics(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 8. Add item_type to ideas (idea vs backlog)
-- ------------------------------------------------------------
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'idea';

-- values: 'idea' | 'backlog'

-- ------------------------------------------------------------
-- 9. Add source_type to clients
-- ------------------------------------------------------------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS source_type text;

-- values: 'recomendacion' | 'contacto_propio' | 'web' | 'marketing_web'
--         'linkedin' | 'via_cliente' | 'otro'

-- ------------------------------------------------------------
-- 10. Add due_date to ideas
-- ------------------------------------------------------------
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS due_date date;

-- ------------------------------------------------------------
-- 11. Add description to tasks (desc is a reserved word in PostgreSQL)
-- ------------------------------------------------------------
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description text;

-- ------------------------------------------------------------
-- 12. Add contact fields to clients
-- ------------------------------------------------------------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS contact_name     text,
  ADD COLUMN IF NOT EXISTS contact_position text,
  ADD COLUMN IF NOT EXISTS contact_email    text,
  ADD COLUMN IF NOT EXISTS contact_phone    text;
