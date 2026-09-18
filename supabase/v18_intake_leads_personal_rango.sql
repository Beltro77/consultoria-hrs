-- ============================================================
-- V18 — "Personal" pasa a rango (mismo desplegable que Sucursales)
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE intake_leads
  ALTER COLUMN cantidad_personal TYPE text USING cantidad_personal::text;
