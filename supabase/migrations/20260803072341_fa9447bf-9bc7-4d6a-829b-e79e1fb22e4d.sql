CREATE TABLE public.academic_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id text NOT NULL,
  student_id text NOT NULL,
  student_name text NOT NULL DEFAULT '',
  avg_grade numeric NOT NULL DEFAULT 0,
  total_grades integer NOT NULL DEFAULT 0,
  points numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_scores TO anon, authenticated;
GRANT ALL ON public.academic_scores TO service_role;

ALTER TABLE public.academic_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read academic scores" ON public.academic_scores FOR SELECT USING (true);
CREATE POLICY "Public insert academic scores" ON public.academic_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update academic scores" ON public.academic_scores FOR UPDATE USING (true);
CREATE POLICY "Public delete academic scores" ON public.academic_scores FOR DELETE USING (true);

CREATE TRIGGER update_academic_scores_updated_at
BEFORE UPDATE ON public.academic_scores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();