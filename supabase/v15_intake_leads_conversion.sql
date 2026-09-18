-- ============================================================
-- V15 — Conversión de respuestas de /intake a clientes potenciales
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE intake_leads
  ADD COLUMN IF NOT EXISTS converted_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dismissed           boolean NOT NULL DEFAULT false;

-- Las policies de v14 ya cubren estas columnas:
-- el INSERT anónimo nunca las setea (quedan en su default), y el
-- UPDATE de consultor (is_consultant()) ya puede tocar cualquier columna.
