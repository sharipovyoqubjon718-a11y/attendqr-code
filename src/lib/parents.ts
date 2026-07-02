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

function cacheKey(): string {
  return `parent_contacts_cache_${schoolId()}`;
}

// Read the last successfully fetched contacts from localStorage (offline fallback).
export function getCachedParentContacts(): Record<string, ParentContact> | null {
  try {
    const raw = localStorage.getItem(cacheKey());
    return raw ? (JSON.parse(raw) as Record<string, ParentContact>) : null;
  } catch {
    return null;
  }
}

// Fetch all parent contacts for the active school, keyed by student_id.
// Throws on network/database error so the UI can show a connection message.
export async function fetchParentContacts(): Promise<Record<string, ParentContact>> {
  const { data, error } = await supabase
    .from("parent_contacts")
    .select("student_id, student_name, chat_id, phone")
    .eq("school_id", schoolId());
  if (error) throw error;
  const map: Record<string, ParentContact> = {};
  for (const row of data ?? []) {
    map[row.student_id] = {
      student_id: row.student_id,
      student_name: row.student_name ?? "",
      chat_id: row.chat_id,
      phone: row.phone,
    };
  }
  try {
    localStorage.setItem(cacheKey(), JSON.stringify(map));
  } catch {
    // ignore cache write failures
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

// Normalise a name for tolerant matching (lowercase, collapse spaces).
function normName(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Find the parent chat_id for a student. Matches by exact student_id first,
// then falls back to a name match — this covers parents who self-registered
// through the Telegram bot (their row has a generated TG-* student_id).
export async function findChatIdForStudent(
  studentId: string,
  studentName: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("parent_contacts")
    .select("student_id, student_name, chat_id")
    .eq("school_id", schoolId());
  if (error || !data) return null;

  const byId = data.find((r) => r.student_id === studentId && r.chat_id);
  if (byId?.chat_id) return byId.chat_id;

  const target = normName(studentName);
  const byName = data.find((r) => r.chat_id && normName(r.student_name) === target);
  return byName?.chat_id ?? null;
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
