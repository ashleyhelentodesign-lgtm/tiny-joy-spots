import { createClient } from "@supabase/supabase-js";

import { mapProfileRow, type Profile } from "@/lib/profile";

const PROFILE_SELECT = "id, user_id, device_id, display_name, bio, avatar_color, created_at";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getProfileForUser(
  userId: string | null | undefined,
): Promise<Profile | null> {
  if (!userId) return null;

  const supabase = adminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfileRow(data as Record<string, unknown>);
}
