-- ============================================================
-- V14 — Formulario público de intake (leads)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS intake_leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  empresa             text NOT NULL,
  contacto_nombre     text NOT NULL,
  contacto_posicion   text,
  sitio_web           text,
  direccion           text,
  cantidad_sucursales int,
  cantidad_personal   int,
  plazo_proyecto      text,
  necesidad           text NOT NULL,
  lead_ref            text
);

ALTER TABLE intake_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert intake_leads"       ON intake_leads;
DROP POLICY IF EXISTS "consultant select intake_leads" ON intake_leads;
DROP POLICY IF EXISTS "consultant update intake_leads" ON intake_leads;
DROP POLICY IF EXISTS "consultant delete intake_leads" ON intake_leads;

-- Cualquiera con el link puede enviar el formulario, sin login.
-- Sin política de SELECT para anon => no hay lectura anónima posible.
CREATE POLICY "anon insert intake_leads" ON intake_leads FOR INSERT
  TO anon
  WITH CHECK (true);

-- Solo el/la consultor/a autenticado/a (no "client" ni "member") puede leer/editar/borrar.
CREATE POLICY "consultant select intake_leads" ON intake_leads FOR SELECT
  TO authenticated
  USING (is_consultant());

CREATE POLICY "consultant update intake_leads" ON intake_leads FOR UPDATE
  TO authenticated
  USING (is_consultant())
  WITH CHECK (is_consultant());

CREATE POLICY "consultant delete intake_leads" ON intake_leads FOR DELETE
  TO authenticated
  USING (is_consultant());
