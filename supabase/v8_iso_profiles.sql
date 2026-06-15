-- ============================================================
-- V8 — ISO module: email en profiles, client_email en projects,
--       unique constraint, RLS ajustada, trigger de auto-perfil
-- ============================================================

-- Unique constraint en profiles.user_id (necesario para ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_user_id_key'
      AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Email en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- client_email en projects (para mostrar sin necesitar unir auth.users)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email text;

-- Actualizar RLS de profiles: consultor puede leer todos
DROP POLICY IF EXISTS "consultant read all profiles" ON profiles;
CREATE POLICY "consultant read all profiles" ON profiles
  FOR SELECT
  USING (is_consultant() OR user_id = auth.uid());

-- Trigger: crea perfil automáticamente cuando se registra un usuario.
-- El rol se toma de user_metadata.role si existe, si no 'consultant'.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'consultant')
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
