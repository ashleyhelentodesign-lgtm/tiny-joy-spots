import { createClient } from "@supabase/supabase-js";

import {
  mapProfileRow,
  type Profile,
} from "@/lib/profile";
import { normalizeJoySpotsDeviceId } from "@/lib/joy-spots-device";

export async function getProfileForDevice(
  deviceId: string | null | undefined,
): Promise<Profile | null> {
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
    .from("profiles")
    .select("id, device_id, display_name, bio, avatar_color, created_at")
    .eq("device_id", normalized)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfileRow(data as Record<string, unknown>);
}
