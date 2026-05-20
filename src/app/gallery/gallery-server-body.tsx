import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import { GalleryFetchDevAlert } from "@/components/GalleryFetchDevAlert";
import { GalleryShell } from "./gallery-shell";
import type { GallerySpot } from "@/components/GalleryGrid";
import {
  GALLERY_SPOT_PROFILE_SELECT,
  mapRowsToGallerySpots,
} from "@/lib/map-rows-to-gallery-spots";
import { JOY_SPOTS_DEVICE_COOKIE } from "@/lib/joy-spots-device";
import { cn } from "@/lib/utils";
import {
  GALLERY_SURFACE_CLASS,
  GALLERY_SURFACE_STYLE,
} from "@/lib/gallery-surface";
import {
  formatGalleryFetchDevMessage,
  logGalleryFetchError,
} from "@/lib/log-gallery-fetch-error";

export async function GalleryServerBody() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let spots: GallerySpot[] = [];
  let devFetchAlert: { message: string; details: string | null } | null =
    null;
  const cookieStore = await cookies();
  const viewerDeviceId =
    cookieStore.get(JOY_SPOTS_DEVICE_COOKIE)?.value ?? null;

  if (url && key) {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("joy_spots")
      .select(
        `
        id,
        photo_url,
        text_content,
        contributor_name,
        caption,
        location_text,
        date,
        created_at,
        device_id,
        ${GALLERY_SPOT_PROFILE_SELECT},
        joy_spot_tags (
          tags (
            id,
            name
          )
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      logGalleryFetchError(error);
      devFetchAlert = formatGalleryFetchDevMessage(error);
    } else if (data) {
      spots = mapRowsToGallerySpots(data as unknown[], viewerDeviceId);
    }
  } else {
    logGalleryFetchError(null, { configMissing: true });
    devFetchAlert = formatGalleryFetchDevMessage(null, {
      configMissing: true,
    });
  }

  return (
    <div className={cn("min-h-full", GALLERY_SURFACE_CLASS)} style={GALLERY_SURFACE_STYLE}>
      {devFetchAlert ? (
        <GalleryFetchDevAlert
          message={devFetchAlert.message}
          details={devFetchAlert.details}
        />
      ) : null}
      <GalleryShell spots={spots} />
    </div>
  );
}
