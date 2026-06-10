import type { SupabaseClient } from "@supabase/supabase-js";

import {
  hexToHsl,
  normalizeDominantHex,
  normalizeExtractedColors,
  type ExtractedColor,
} from "@/lib/dominant-color";
import { normalizeJoySpotsDeviceId } from "@/lib/joy-spots-device";

export type UserColorTemperature = {
  warm: number;
  cool: number;
  green: number;
  neutral: number;
};

export type TopHueBucket = {
  bucket_start: number;
  weight: number;
  representative_hex: string;
};

/** Supabase table storing rolling color aggregates per device. */
export const USER_COLOR_PROFILE_TABLE = "user_color_profile";

/** Columns on public.user_color_profile (matches live Supabase schema). */
export const USER_COLOR_PROFILE_SELECT =
  "device_id, hue_buckets, avg_saturation, avg_lightness, saturation_variance, color_temperature, top_hue_buckets, updated_at";

export type UserColorProfile = {
  device_id: string;
  hue_buckets: Record<string, number>;
  avg_saturation: number;
  avg_lightness: number;
  saturation_variance: number;
  color_temperature: UserColorTemperature;
  top_hue_buckets: TopHueBucket[];
  updated_at: string;
};

type SpotColorSample = {
  h: number;
  s: number;
  l: number;
  weight: number;
  recencyMultiplier: number;
};

const HUE_BUCKET_STARTS = [
  0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330,
] as const;

function emptyHueBuckets(): Record<string, number> {
  return Object.fromEntries(HUE_BUCKET_STARTS.map((start) => [String(start), 0]));
}

function toHueBucketStart(hue: number): number {
  const normalized = ((hue % 360) + 360) % 360;
  if (normalized === 360) return 330;
  return Math.floor(normalized / 30) * 30;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function parseExtractedColors(
  rawExtracted: unknown,
  rawDominant: unknown,
): ExtractedColor[] {
  const parsed = normalizeExtractedColors(rawExtracted);
  if (parsed.length > 0) return parsed;
  const fallbackHex =
    typeof rawDominant === "string" ? normalizeDominantHex(rawDominant) : null;
  if (!fallbackHex) return [];
  const hsl = hexToHsl(fallbackHex);
  return [{ hex: fallbackHex, h: hsl.h, s: hsl.s, l: hsl.l, weight: 3 }];
}

function recencyMultiplier(createdAt: string | null): number {
  if (!createdAt) return 1;
  const ts = Date.parse(createdAt);
  if (!Number.isFinite(ts)) return 1;
  const ageMs = Date.now() - ts;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays <= 14 ? 2 : 1;
}

function buildSamples(rows: Array<Record<string, unknown>>): SpotColorSample[] {
  const out: SpotColorSample[] = [];
  for (const row of rows) {
    const colors = parseExtractedColors(row.extracted_colors, row.dominant_color);
    const multiplier = recencyMultiplier(
      typeof row.created_at === "string" ? row.created_at : null,
    );
    for (const color of colors) {
      out.push({
        h: clamp(color.h, 0, 360),
        s: clamp(color.s, 0, 100),
        l: clamp(color.l, 0, 100),
        weight: Math.max(0, color.weight),
        recencyMultiplier: multiplier,
      });
    }
  }
  return out;
}

function toFixedNumber(value: number, digits = 4): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

function normalizeTemperature(
  warm: number,
  cool: number,
  green: number,
  neutral: number,
): UserColorTemperature {
  const total = warm + cool + green + neutral;
  if (total <= 0) return { warm: 0, cool: 0, green: 0, neutral: 0 };
  return {
    warm: toFixedNumber(warm / total, 6),
    cool: toFixedNumber(cool / total, 6),
    green: toFixedNumber(green / total, 6),
    neutral: toFixedNumber(neutral / total, 6),
  };
}

function computeProfileMetrics(rows: Array<Record<string, unknown>>) {
  const hueBuckets = emptyHueBuckets();
  const samples = buildSamples(rows);

  let weightedSatTotal = 0;
  let weightedLightTotal = 0;
  let totalWeight = 0;

  let warmWeight = 0;
  let coolWeight = 0;
  let greenWeight = 0;
  let neutralWeight = 0;

  for (const sample of samples) {
    const contribution = sample.weight * sample.recencyMultiplier;
    if (contribution <= 0) continue;
    const bucketStart = toHueBucketStart(sample.h);
    hueBuckets[String(bucketStart)] += contribution;
    weightedSatTotal += sample.s * contribution;
    weightedLightTotal += sample.l * contribution;
    totalWeight += contribution;

    if (sample.s < 15) {
      neutralWeight += contribution;
    } else if (sample.h >= 0 && sample.h < 90) {
      warmWeight += contribution;
    } else if (sample.h >= 90 && sample.h < 150) {
      greenWeight += contribution;
    } else {
      coolWeight += contribution;
    }
  }

  const avgSaturation = totalWeight > 0 ? weightedSatTotal / totalWeight : 0;
  const avgLightness = totalWeight > 0 ? weightedLightTotal / totalWeight : 0;

  let satVarianceTotal = 0;
  for (const sample of samples) {
    const contribution = sample.weight * sample.recencyMultiplier;
    if (contribution <= 0) continue;
    satVarianceTotal += (sample.s - avgSaturation) ** 2 * contribution;
  }
  const saturationVariance =
    totalWeight > 0 ? satVarianceTotal / totalWeight : 0;

  const topHueBuckets = [...HUE_BUCKET_STARTS]
    .map((start) => ({ bucket_start: start, weight: hueBuckets[String(start)] }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((entry) => ({
      ...entry,
      representative_hex: hslToHex(entry.bucket_start + 15, avgSaturation, avgLightness),
    }));

  return {
    hue_buckets: Object.fromEntries(
      Object.entries(hueBuckets).map(([key, value]) => [key, toFixedNumber(value)]),
    ),
    avg_saturation: toFixedNumber(avgSaturation),
    avg_lightness: toFixedNumber(avgLightness),
    saturation_variance: toFixedNumber(saturationVariance),
    color_temperature: normalizeTemperature(
      warmWeight,
      coolWeight,
      greenWeight,
      neutralWeight,
    ),
    top_hue_buckets: topHueBuckets.map((bucket) => ({
      bucket_start: bucket.bucket_start,
      weight: toFixedNumber(bucket.weight),
      representative_hex: bucket.representative_hex,
    })),
  };
}

export async function recomputeUserColorProfile(
  supabase: SupabaseClient,
  deviceId: string,
): Promise<UserColorProfile | null> {
  const normalizedDeviceId = normalizeJoySpotsDeviceId(deviceId);
  if (!normalizedDeviceId) {
    throw new Error("Device id is required");
  }

  const { data: rows, error } = await supabase
    .from("joy_spots")
    .select("id, created_at, extracted_colors, dominant_color")
    .eq("device_id", normalizedDeviceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const metrics = computeProfileMetrics((rows as Record<string, unknown>[]) ?? []);

  const { data: upserted, error: upsertError } = await supabase
    .from(USER_COLOR_PROFILE_TABLE)
    .upsert(
      {
        device_id: normalizedDeviceId,
        ...metrics,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "device_id" },
    )
    .select(USER_COLOR_PROFILE_SELECT)
    .single();

  if (upsertError || !upserted) {
    const detail = upsertError
      ? [upsertError.message, upsertError.code, upsertError.details, upsertError.hint]
          .filter(Boolean)
          .join(" | ")
      : "Failed to save color profile";
    throw new Error(detail);
  }

  return mapUserColorProfileRow(upserted as Record<string, unknown>);
}

export function mapUserColorProfileRow(
  row: Record<string, unknown>,
): UserColorProfile {
  return {
    device_id: String(row.device_id ?? ""),
    hue_buckets:
      row.hue_buckets && typeof row.hue_buckets === "object"
        ? (row.hue_buckets as Record<string, number>)
        : emptyHueBuckets(),
    avg_saturation: Number(row.avg_saturation ?? 0),
    avg_lightness: Number(row.avg_lightness ?? 0),
    saturation_variance: Number(row.saturation_variance ?? 0),
    color_temperature:
      row.color_temperature && typeof row.color_temperature === "object"
        ? (row.color_temperature as UserColorTemperature)
        : { warm: 0, cool: 0, green: 0, neutral: 0 },
    top_hue_buckets: Array.isArray(row.top_hue_buckets)
      ? (row.top_hue_buckets as TopHueBucket[])
      : [],
    updated_at: String(row.updated_at ?? ""),
  };
}
