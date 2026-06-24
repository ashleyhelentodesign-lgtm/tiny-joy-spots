import { createClient } from "@supabase/supabase-js";

import type { GallerySpot } from "@/components/GalleryGrid";
import {
  GALLERY_SPOT_PROFILE_SELECT,
  mapRowsToGallerySpots,
} from "@/lib/map-rows-to-gallery-spots";

const JOY_SPOTS_SELECT = `
  id,
  photo_url,
  text_content,
  contributor_name,
  caption,
  location_text,
  date,
  created_at,
  device_id,
  user_id,
  dominant_color,
  extracted_colors,
  mood,
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

export async function fetchJoySpotsForUser(
  userId: string | null | undefined,
): Promise<GallerySpot[]> {
  if (!userId) return [];

  const supabase = adminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("joy_spots")
    .select(JOY_SPOTS_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (process.env.NODE_ENV === "development" && error) {
      console.error("[Profile] user joy_spots fetch failed:", error.message);
    }
    return [];
  }

  return mapRowsToGallerySpots(data as unknown[], null, userId);
}
