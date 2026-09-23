-- ============================================================
-- V19 — Suscripciones de Web Push (aviso de nuevo lead en /intake)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultant insert push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "consultant select push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "consultant delete push_subscriptions" ON push_subscriptions;

-- Solo el/la consultor/a autenticado/a puede registrar/leer/borrar su propia suscripción.
-- El envío del push (desde /api/notify-lead) usa la service role key y no pasa por RLS.
CREATE POLICY "consultant insert push_subscriptions" ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (is_consultant() AND user_id = auth.uid());

CREATE POLICY "consultant select push_subscriptions" ON push_subscriptions FOR SELECT
  TO authenticated
  USING (is_consultant() AND user_id = auth.uid());

CREATE POLICY "consultant delete push_subscriptions" ON push_subscriptions FOR DELETE
  TO authenticated
  USING (is_consultant() AND user_id = auth.uid());
