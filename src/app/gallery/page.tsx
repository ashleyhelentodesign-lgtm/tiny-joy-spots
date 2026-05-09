import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import { GalleryShell } from "./gallery-shell";
import type { GallerySpot } from "@/components/GalleryGrid";
import { mapRowsToGallerySpots } from "@/lib/map-rows-to-gallery-spots";
import { JOY_SPOTS_DEVICE_COOKIE } from "@/lib/joy-spots-device";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery · Joy Spots",
  description: "Browse tiny joy spots shared by the community.",
};

export default async function GalleryPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let spots: GallerySpot[] = [];
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
        joy_spot_tags (
          tags (
            id,
            name
          )
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      spots = mapRowsToGallerySpots(data as unknown[], viewerDeviceId);
    }
  }

  return (
    <div
      className="min-h-full bg-white"
      style={{
        backgroundImage:
          "radial-gradient(circle at center, #ded8d2 1.25px, transparent 1.25px)",
        backgroundSize: "22px 22px",
      }}
    >
      <GalleryShell spots={spots} />
    </div>
  );
}
