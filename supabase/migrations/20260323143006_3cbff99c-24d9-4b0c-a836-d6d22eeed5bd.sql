-- Create students table
CREATE TABLE public.students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  qr_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_logs table
CREATE TABLE public.attendance_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('check-in', 'check-out')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write for this kiosk-style app (no auth)
CREATE POLICY "Allow public read students" ON public.students FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert students" ON public.students FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public read logs" ON public.attendance_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert logs" ON public.attendance_logs FOR INSERT TO anon WITH CHECK (true);

-- Indexes
CREATE INDEX idx_attendance_logs_student ON public.attendance_logs(student_id);
CREATE INDEX idx_attendance_logs_timestamp ON public.attendance_logs(timestamp DESC);