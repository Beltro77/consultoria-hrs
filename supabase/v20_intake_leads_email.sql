-- ============================================================
-- V20 — Campo de email en el formulario de intake
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE intake_leads ADD COLUMN IF NOT EXISTS contacto_email text;
