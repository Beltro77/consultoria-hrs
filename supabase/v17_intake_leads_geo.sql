-- ============================================================
-- V17 — Ubicación GPS opcional en /intake
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE intake_leads
  ADD COLUMN IF NOT EXISTS latitud  double precision,
  ADD COLUMN IF NOT EXISTS longitud double precision;
