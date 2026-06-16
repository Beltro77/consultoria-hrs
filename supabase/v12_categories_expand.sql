-- ============================================================
-- V12 — Ampliar categorías por proceso + nivel N/A
-- ============================================================

-- Eliminar constraints existentes por inspección dinámica
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN (
        'member_category_levels'::regclass,
        'member_log_entries'::regclass
      )
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- Nuevos constraints para member_category_levels
ALTER TABLE member_category_levels
  ADD CONSTRAINT mcl_category_check CHECK (category IN (
    'indicadores', 'riesgos', 'no_conformidades', 'competencias',
    'tematica', 'procedimientos', 'registros', 'evaluacion_proveedores'
  ));

-- -1 = No aplica; 0-4 = niveles de avance
ALTER TABLE member_category_levels
  ADD CONSTRAINT mcl_level_check CHECK (level BETWEEN -1 AND 4);

-- Nuevos constraints para member_log_entries
ALTER TABLE member_log_entries
  ADD CONSTRAINT mle_category_check CHECK (category IN (
    'indicadores', 'riesgos', 'no_conformidades', 'competencias',
    'tematica', 'procedimientos', 'registros', 'evaluacion_proveedores'
  ));
