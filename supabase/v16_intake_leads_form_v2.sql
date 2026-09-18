-- ============================================================
-- V16 — Ajustes al formulario de intake: sucursales por rango y observaciones
-- Run in Supabase SQL Editor
-- ============================================================

-- cantidad_sucursales pasa de número exacto a rango elegido en un desplegable
-- (ej: "Entre 1 y 10", "Más de 200"), así que deja de ser un int.
ALTER TABLE intake_leads
  ALTER COLUMN cantidad_sucursales TYPE text USING cantidad_sucursales::text;

ALTER TABLE intake_leads
  ADD COLUMN IF NOT EXISTS observaciones text;
