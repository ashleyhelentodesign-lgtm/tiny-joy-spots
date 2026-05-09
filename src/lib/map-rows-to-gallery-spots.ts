import type { GallerySpot } from "@/components/GalleryGrid";
import { normalizeJoySpotsDeviceId } from "@/lib/joy-spots-device";

export function mapRowsToGallerySpots(
  rows: unknown[],
  viewerDeviceId: string | null = null,
): GallerySpot[] {
  const viewer = normalizeJoySpotsDeviceId(viewerDeviceId);
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const rowDevice = normalizeJoySpotsDeviceId(
      r.device_id != null ? String(r.device_id) : null,
    );
    const junction = r.joy_spot_tags;
    const tagRows = Array.isArray(junction) ? junction : [];
    const tags = tagRows
      .map((j) => {
        const t = (j as Record<string, unknown>).tags;
        if (t && typeof t === "object" && !Array.isArray(t)) {
          const o = t as { id?: string; name?: string };
          if (o.id && o.name) return { id: o.id, name: o.name };
        }
        return null;
      })
      .filter((t): t is { id: string; name: string } => t != null);
    return {
      id: String(r.id ?? ""),
      photo_url: (r.photo_url as string | null) ?? null,
      text_content: String(r.text_content ?? ""),
      contributor_name: (r.contributor_name as string | null) ?? null,
      caption: (r.caption as string | null) ?? null,
      location_text: String(r.location_text ?? ""),
      date: String(r.date ?? ""),
      created_at: String(r.created_at ?? ""),
      tags,
      viewer_owns_spot: Boolean(viewer && rowDevice && viewer === rowDevice),
    };
  });
}
