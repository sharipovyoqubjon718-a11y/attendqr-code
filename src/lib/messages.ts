import { supabase } from "@/integrations/supabase/client";
import { getActiveSchoolId, getSelectedSchoolId } from "./schools";

export interface Message {
  id: string;
  sender_name: string;
  message_content: string;
  status: string;
  timestamp: string;
}

function schoolId(): string {
  return getActiveSchoolId() || getSelectedSchoolId() || "gdbh";
}

export async function fetchMessages(): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_name, message_content, status, timestamp")
    .eq("school_id", schoolId())
    .order("timestamp", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function markMessageRead(id: string): Promise<void> {
  await supabase.from("messages").update({ status: "read" }).eq("id", id);
}

export async function markAllMessagesRead(): Promise<void> {
  await supabase
    .from("messages")
    .update({ status: "read" })
    .eq("school_id", schoolId())
    .eq("status", "unread");
}
