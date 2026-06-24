import { createClient } from "@supabase/supabase-js";

import {
  mapUserColorProfileRow,
  USER_COLOR_PROFILE_SELECT,
  USER_COLOR_PROFILE_TABLE,
  type UserColorProfile,
} from "@/lib/user-color-profile";

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

export async function getUserColorProfileForUser(
  userId: string | null | undefined,
): Promise<UserColorProfile | null> {
  if (!userId) return null;

  const supabase = adminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(USER_COLOR_PROFILE_TABLE)
    .select(USER_COLOR_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapUserColorProfileRow(data as Record<string, unknown>);
}
