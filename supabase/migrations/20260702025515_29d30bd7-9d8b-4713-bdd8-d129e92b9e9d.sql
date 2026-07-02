CREATE TABLE IF NOT EXISTS public.school_credentials (
  school_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  logo_data_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_credentials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_credentials TO authenticated;
GRANT ALL ON public.school_credentials TO service_role;

ALTER TABLE public.school_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read school credentials" ON public.school_credentials;
CREATE POLICY "Public read school credentials"
  ON public.school_credentials FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public manage school credentials" ON public.school_credentials;
CREATE POLICY "Public manage school credentials"
  ON public.school_credentials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_school_credentials_updated_at
  BEFORE UPDATE ON public.school_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Safe upsert: inserts a new row or updates ONLY the provided fields,
-- preserving any existing values that are passed as NULL (no data loss).
CREATE OR REPLACE FUNCTION public.upsert_school_credentials(
  p_school_id TEXT,
  p_username TEXT,
  p_password TEXT,
  p_name TEXT DEFAULT NULL,
  p_logo_data_url TEXT DEFAULT NULL
) RETURNS public.school_credentials
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.school_credentials;
BEGIN
  IF p_school_id IS NULL OR btrim(p_school_id) = '' THEN
    RAISE EXCEPTION 'school_id is required';
  END IF;

  INSERT INTO public.school_credentials AS sc (school_id, username, password, name, logo_data_url)
  VALUES (
    p_school_id,
    COALESCE(p_username, ''),
    COALESCE(p_password, ''),
    COALESCE(p_name, ''),
    p_logo_data_url
  )
  ON CONFLICT (school_id) DO UPDATE SET
    username      = COALESCE(NULLIF(p_username, ''), sc.username),
    password      = COALESCE(NULLIF(p_password, ''), sc.password),
    name          = COALESCE(NULLIF(p_name, ''), sc.name),
    logo_data_url = COALESCE(p_logo_data_url, sc.logo_data_url)
  RETURNING sc.* INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_school_credentials(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;