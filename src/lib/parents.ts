import { supabase } from "@/integrations/supabase/client";
import { getActiveSchoolId, getSelectedSchoolId } from "./schools";

export interface ParentContact {
  student_id: string;
  student_name: string;
  chat_id: string | null;
  phone: string | null;
}

function schoolId(): string {
  return getActiveSchoolId() || getSelectedSchoolId() || "gdbh";
}

// Fetch all parent contacts for the active school, keyed by student_id.
export async function fetchParentContacts(): Promise<Record<string, ParentContact>> {
  const { data, error } = await supabase
    .from("parent_contacts")
    .select("student_id, student_name, chat_id, phone")
    .eq("school_id", schoolId());
  if (error || !data) return {};
  const map: Record<string, ParentContact> = {};
  for (const row of data) {
    map[row.student_id] = {
      student_id: row.student_id,
      student_name: row.student_name ?? "",
      chat_id: row.chat_id,
      phone: row.phone,
    };
  }
  return map;
}

// Save (upsert) a student's phone number. The chat_id is linked automatically
// by the Telegram bot when the parent self-activates, so we never overwrite it here.
export async function saveParentContact(input: {
  student_id: string;
  student_name: string;
  phone: string;
}): Promise<boolean> {
  const phone = input.phone.trim();
  const { error } = await supabase
    .from("parent_contacts")
    .upsert(
      {
        school_id: schoolId(),
        student_id: input.student_id,
        student_name: input.student_name,
        phone: phone || null,
      },
      { onConflict: "school_id,student_id" }
    );
  return !error;
}

// Reset (disconnect) a student's Telegram chat_id by setting it to NULL.
export async function resetChatId(studentId: string): Promise<boolean> {
  const { error } = await supabase
    .from("parent_contacts")
    .update({ chat_id: null })
    .eq("school_id", schoolId())
    .eq("student_id", studentId);
  return !error;
}

// Send a Telegram message to a student's parent via edge function.
export async function sendParentMessage(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-telegram", {
    body: { chat_id: chatId, text },
  });
  if (error) return { ok: false, error: error.message };
  if (data && (data as { error?: string }).error) return { ok: false, error: (data as { error: string }).error };
  return { ok: true };
}
