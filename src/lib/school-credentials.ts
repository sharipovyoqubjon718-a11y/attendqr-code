import { supabase } from "@/integrations/supabase/client";

// Securely add or update a school's login credentials in the database via the
// `upsert_school_credentials` RPC. Fields passed as empty/undefined are NOT
// overwritten server-side (COALESCE), so no existing data is lost.
export async function syncSchoolCredentials(input: {
  schoolId: string;
  username: string;
  password: string;
  name?: string;
  logoDataUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  // Cast to any: the RPC is newer than the generated types.
  const { error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  }).rpc("upsert_school_credentials", {
    p_school_id: input.schoolId,
    p_username: input.username,
    p_password: input.password,
    p_name: input.name ?? null,
    p_logo_data_url: input.logoDataUrl ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
