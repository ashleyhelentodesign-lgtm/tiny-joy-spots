import { createClient } from "@supabase/supabase-js";

import {
  mapUserColorProfileRow,
  USER_COLOR_PROFILE_SELECT,
  USER_COLOR_PROFILE_TABLE,
  type UserColorProfile,
} from "@/lib/user-color-profile";
import { normalizeJoySpotsDeviceId } from "@/lib/joy-spots-device";

export async function getUserColorProfileForDevice(
  deviceId: string | null | undefined,
): Promise<UserColorProfile | null> {
  const normalized = normalizeJoySpotsDeviceId(deviceId);
  if (!normalized) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from(USER_COLOR_PROFILE_TABLE)
    .select(USER_COLOR_PROFILE_SELECT)
    .eq("device_id", normalized)
    .maybeSingle();

  if (error || !data) return null;
  return mapUserColorProfileRow(data as Record<string, unknown>);
}
