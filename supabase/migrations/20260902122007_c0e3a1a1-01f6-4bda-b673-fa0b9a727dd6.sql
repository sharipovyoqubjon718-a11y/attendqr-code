CREATE TABLE public.telegram_sessions (
  chat_id text PRIMARY KEY,
  child_contact_id uuid,
  school_id text,
  student_id text,
  student_name text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.telegram_sessions TO service_role;

ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_telegram_sessions_updated_at
BEFORE UPDATE ON public.telegram_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();