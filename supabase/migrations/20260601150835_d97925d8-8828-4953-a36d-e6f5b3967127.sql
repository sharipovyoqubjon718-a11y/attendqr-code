CREATE TABLE public.parent_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  chat_id TEXT,
  phone TEXT,
  last_start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_contacts TO authenticated;
GRANT ALL ON public.parent_contacts TO service_role;

ALTER TABLE public.parent_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read parent contacts"
ON public.parent_contacts FOR SELECT USING (true);

CREATE POLICY "Public insert parent contacts"
ON public.parent_contacts FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update parent contacts"
ON public.parent_contacts FOR UPDATE USING (true);

CREATE POLICY "Public delete parent contacts"
ON public.parent_contacts FOR DELETE USING (true);

CREATE INDEX idx_parent_contacts_chat_id ON public.parent_contacts (chat_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_parent_contacts_updated_at
BEFORE UPDATE ON public.parent_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();