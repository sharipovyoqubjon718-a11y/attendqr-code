CREATE INDEX IF NOT EXISTS idx_parent_contacts_phone ON public.parent_contacts (phone);
CREATE INDEX IF NOT EXISTS idx_parent_contacts_chat_id ON public.parent_contacts (chat_id);