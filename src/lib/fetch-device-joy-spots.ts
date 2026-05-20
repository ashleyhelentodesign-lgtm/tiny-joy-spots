import { createClient } from "@supabase/supabase-js";

import type { GallerySpot } from "@/components/GalleryGrid";
import {
  GALLERY_SPOT_PROFILE_SELECT,
  mapRowsToGallerySpots,
} from "@/lib/map-rows-to-gallery-spots";
import { normalizeJoySpotsDeviceId } from "@/lib/joy-spots-device";

const JOY_SPOTS_BY_DEVICE_SELECT = `
  id,
  photo_url,
  text_content,
  contributor_name,
  caption,
  location_text,
  date,
  created_at,
  device_id,
  dominant_color,
  ${GALLERY_SPOT_PROFILE_SELECT.trim()},
  joy_spot_tags (
    tags (
      id,
      name
    )
  )
`;

export function formatJoySpotsNoticedLine(count: number): string {
  if (count === 1) {
    return "You've noticed 1 joy spot.";
  }
  return `You've noticed ${count} joy spots.`;
}

export async function fetchJoySpotsForDevice(
  deviceId: string | null | undefined,
): Promise<GallerySpot[]> {
  const normalized = normalizeJoySpotsDeviceId(deviceId);
  if (!normalized) return [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("joy_spots")
    .select(JOY_SPOTS_BY_DEVICE_SELECT)
    .eq("device_id", normalized)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (process.env.NODE_ENV === "development" && error) {
      console.error("[Profile] device joy_spots fetch failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }
    return [];
  }

  return mapRowsToGallerySpots(data as unknown[], normalized);
}
