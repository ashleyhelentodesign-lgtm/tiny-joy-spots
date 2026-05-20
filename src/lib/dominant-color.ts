import { isProfileHexColor } from "@/lib/profile";

/** Normalize `#RRGGBB` or return null. */
export function normalizeDominantHex(
  color: string | null | undefined,
): string | null {
  if (color == null) return null;
  const trimmed = color.trim();
  if (!isProfileHexColor(trimmed)) return null;
  return trimmed.toLowerCase();
}

/**
 * Most frequent `dominant_color` across spots (ties broken by newest spot).
 * Matches `public.pick_profile_avatar_color()` in the database.
 */
export function pickMostCommonDominantColor(
  spots: Array<{ dominant_color?: string | null; created_at?: string }>,
  fallback: string,
): string {
  const tallies = new Map<string, { count: number; latest: string }>();

  for (const spot of spots) {
    const hex = normalizeDominantHex(spot.dominant_color);
    if (!hex) continue;
    const prev = tallies.get(hex) ?? { count: 0, latest: "" };
    prev.count += 1;
    const created = spot.created_at ?? "";
    if (created > prev.latest) prev.latest = created;
    tallies.set(hex, prev);
  }

  if (tallies.size === 0) {
    return normalizeDominantHex(fallback) ?? "#C17B5A";
  }

  const [winner] = [...tallies.entries()].sort(([, a], [, b]) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.latest.localeCompare(a.latest);
  });

  return winner![0];
}

/** Sample an uploaded image in the browser and return a `#RRGGBB` dominant color. */
export async function extractDominantColorFromImageFile(
  file: File,
): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;

  try {
    const bitmap = await createImageBitmap(file);
    const sampleSize = 32;
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      bitmap.close();
      return null;
    }

    ctx.drawImage(bitmap, 0, 0, sampleSize, sampleSize);
    bitmap.close();

    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const buckets = new Map<
      string,
      { r: number; g: number; b: number; count: number }
    >();

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]!;
      if (alpha < 128) continue;

      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const sum = r + g + b;
      if (sum > 720 || sum < 36) continue;

      const br = Math.min(255, Math.round(r / 32) * 32);
      const bg = Math.min(255, Math.round(g / 32) * 32);
      const bb = Math.min(255, Math.round(b / 32) * 32);
      const key = `${br},${bg},${bb}`;
      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
      buckets.set(key, bucket);
    }

    let best: { r: number; g: number; b: number; count: number } | null = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.count > best.count) best = bucket;
    }
    if (!best) return null;

    const r = Math.round(best.r / best.count);
    const g = Math.round(best.g / best.count);
    const b = Math.round(best.b / best.count);
    const hex = `#${[r, g, b]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")}`;

    return normalizeDominantHex(hex);
  } catch {
    return null;
  }
}
