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

export type ExtractedColor = {
  hex: string;
  h: number;
  s: number;
  l: number;
  /** Dominance rank weight in a single photo: 3, 2, 1. */
  weight: number;
};

export type DominantColorCount = { hex: string; count: number };

type SpotColorInput = {
  dominant_color?: string | null;
  extracted_colors?: ExtractedColor[] | null;
  created_at?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = normalizeDominantHex(hex);
  if (!normalized) return { h: 0, s: 0, l: 0 };
  const raw = normalized.slice(1);
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  if (delta !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / delta + 2) * 60;
        break;
      default:
        h = ((r - g) / delta + 4) * 60;
        break;
    }
  }

  const s =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: Number(clamp(h, 0, 360).toFixed(2)),
    s: Number(clamp(s * 100, 0, 100).toFixed(2)),
    l: Number(clamp(l * 100, 0, 100).toFixed(2)),
  };
}

function normalizeExtractedColorEntry(
  entry: Partial<ExtractedColor> | null | undefined,
): ExtractedColor | null {
  if (!entry) return null;
  const hex = normalizeDominantHex(entry.hex ?? null);
  if (!hex) return null;
  const hsl = hexToHsl(hex);
  return {
    hex,
    h:
      typeof entry.h === "number"
        ? Number(clamp(entry.h, 0, 360).toFixed(2))
        : hsl.h,
    s:
      typeof entry.s === "number"
        ? Number(clamp(entry.s, 0, 100).toFixed(2))
        : hsl.s,
    l:
      typeof entry.l === "number"
        ? Number(clamp(entry.l, 0, 100).toFixed(2))
        : hsl.l,
    weight:
      typeof entry.weight === "number" && entry.weight > 0
        ? Number(entry.weight)
        : 1,
  };
}

export function normalizeExtractedColors(
  colors: unknown,
): ExtractedColor[] {
  if (!Array.isArray(colors)) return [];
  return colors
    .map((entry) =>
      normalizeExtractedColorEntry(
        entry as Partial<ExtractedColor> | null | undefined,
      ),
    )
    .filter((entry): entry is ExtractedColor => entry != null);
}

function spotColors(spot: SpotColorInput): ExtractedColor[] {
  const modern = normalizeExtractedColors(spot.extracted_colors ?? []);
  if (modern.length > 0) return modern;
  const fallbackHex = normalizeDominantHex(spot.dominant_color ?? null);
  if (!fallbackHex) return [];
  const hsl = hexToHsl(fallbackHex);
  return [{ hex: fallbackHex, ...hsl, weight: 3 }];
}

/**
 * Most frequent `dominant_color` across spots (ties broken by newest spot).
 * Matches `public.pick_profile_avatar_color()` in the database.
 */
export function pickMostCommonDominantColor(
  spots: SpotColorInput[],
  fallback: string,
): string {
  const tallies = new Map<string, { count: number; latest: string }>();

  for (const spot of spots) {
    const colors = spotColors(spot);
    for (const color of colors) {
      const prev = tallies.get(color.hex) ?? { count: 0, latest: "" };
      prev.count += color.weight;
      const created = spot.created_at ?? "";
      if (created > prev.latest) prev.latest = created;
      tallies.set(color.hex, prev);
    }
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

/** Up to `limit` most frequent dominant colors (ties broken by newest spot). */
export function pickTopDominantColors(
  spots: SpotColorInput[],
  limit = 5,
): string[] {
  const tallies = new Map<string, { count: number; latest: string }>();

  for (const spot of spots) {
    const colors = spotColors(spot);
    for (const color of colors) {
      const prev = tallies.get(color.hex) ?? { count: 0, latest: "" };
      prev.count += color.weight;
      const created = spot.created_at ?? "";
      if (created > prev.latest) prev.latest = created;
      tallies.set(color.hex, prev);
    }
  }

  return [...tallies.entries()]
    .sort(([, a], [, b]) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.latest.localeCompare(a.latest);
    })
    .slice(0, limit)
    .map(([hex]) => hex);
}

/** Top dominant colors with occurrence counts (ties broken by newest spot). */
export function pickTopDominantColorsWithCounts(
  spots: SpotColorInput[],
  limit = 5,
): DominantColorCount[] {
  const tallies = new Map<string, { count: number; latest: string }>();

  for (const spot of spots) {
    const colors = spotColors(spot);
    for (const color of colors) {
      const prev = tallies.get(color.hex) ?? { count: 0, latest: "" };
      prev.count += color.weight;
      const created = spot.created_at ?? "";
      if (created > prev.latest) prev.latest = created;
      tallies.set(color.hex, prev);
    }
  }

  return [...tallies.entries()]
    .sort(([, a], [, b]) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.latest.localeCompare(a.latest);
    })
    .slice(0, limit)
    .map(([hex, { count }]) => ({ hex, count }));
}

/** Sample an uploaded image in the browser and return top 3 extracted colors. */
export async function extractDominantColorsFromImageFile(
  file: File,
): Promise<ExtractedColor[]> {
  if (!file.type.startsWith("image/")) return [];

  try {
    const bitmap = await createImageBitmap(file);
    const sampleSize = 32;
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      bitmap.close();
      return [];
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

    const sorted = [...buckets.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const weights = [3, 2, 1];
    const extracted: ExtractedColor[] = [];

    sorted.forEach((bucket, idx) => {
      const r = Math.round(bucket.r / bucket.count);
      const g = Math.round(bucket.g / bucket.count);
      const b = Math.round(bucket.b / bucket.count);
      const hex = normalizeDominantHex(
        `#${[r, g, b]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`,
      );
      if (!hex) return;
      const hsl = hexToHsl(hex);
      extracted.push({
        hex,
        h: hsl.h,
        s: hsl.s,
        l: hsl.l,
        weight: weights[idx] ?? 1,
      });
    });

    return extracted;
  } catch {
    return [];
  }
}

/** Backward compatible helper for older callers expecting single color. */
export async function extractDominantColorFromImageFile(
  file: File,
): Promise<string | null> {
  const extracted = await extractDominantColorsFromImageFile(file);
  return extracted[0]?.hex ?? null;
}
