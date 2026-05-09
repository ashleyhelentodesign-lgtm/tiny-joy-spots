import type { GallerySpot } from "@/components/GalleryGrid";

export function matchesSearch(spot: GallerySpot, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  if (spot.contributor_name?.toLowerCase().includes(s)) return true;
  if (spot.text_content.toLowerCase().includes(s)) return true;
  if (spot.location_text.toLowerCase().includes(s)) return true;
  if (spot.caption?.toLowerCase().includes(s)) return true;
  return spot.tags.some((t) => t.name.toLowerCase().includes(s));
}
