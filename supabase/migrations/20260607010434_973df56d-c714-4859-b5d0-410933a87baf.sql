CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id text NOT NULL DEFAULT 'gdbh',
  chat_id text,
  sender_name text NOT NULL DEFAULT '',
  message_content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'unread',
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Public insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update messages" ON public.messages FOR UPDATE USING (true);
CREATE POLICY "Public delete messages" ON public.messages FOR DELETE USING (true);

CREATE INDEX idx_messages_school_status ON public.messages (school_id, status);
CREATE INDEX idx_messages_timestamp ON public.messages (timestamp DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;