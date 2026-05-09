/** Supabase Storage bucket id — must match the bucket name in the Supabase dashboard. */
export const JOY_SPOT_PHOTOS_BUCKET = "joy-spot-photos";

/** Path inside the bucket from a public object URL, or null if not ours. */
export function photoPublicUrlToStoragePath(url: string | null): string | null {
  if (!url?.trim()) return null;
  const marker = `/object/public/${JOY_SPOT_PHOTOS_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length).split("?")[0] ?? "");
  } catch {
    return null;
  }
}
