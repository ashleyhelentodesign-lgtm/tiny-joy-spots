import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { JOY_SPOTS_DEVICE_COOKIE } from "@/lib/joy-spots-device";
import { JOY_SPOT_PHOTOS_BUCKET } from "@/lib/joy-spot-storage";

function parseCookie(header: string, name: string): string | null {
  const parts = header.split(";").map((p) => p.trim());
  const prefix = `${name}=`;
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseTagNames(formData: FormData): string[] {
  const raw = formData.get("tags");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch {
    /* fall through */
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function dedupeTagNames(names: string[]): string[] {
  const byLower = new Map<string, string>();
  for (const n of names) {
    const t = n.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!byLower.has(k)) byLower.set(k, t);
  }
  return [...byLower.values()];
}

async function resolveOrCreateTagId(
  supabase: SupabaseClient,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: inserted, error: insertErr } = await supabase
    .from("tags")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (!insertErr && inserted?.id) return inserted.id as string;

  const { data: existing } = await supabase
    .from("tags")
    .select("id")
    .eq("name", trimmed)
    .maybeSingle();

  return (existing?.id as string) ?? null;
}

/**
 * POST multipart/form-data (or form fields):
 * - `photo` — optional image file; if omitted or empty, `photo_url` is null
 * - `text_content` — body text (required if no photo)
 * - `date` — optional ISO date (YYYY-MM-DD), defaults to today
 * - `location_text` — optional
 * - `contributor_name` — optional; stored as null if blank
 * - `caption` — optional (if column exists)
 * - `mood` — optional single mood word (stored, not shown in gallery UI yet)
 *
 * Sets `joy_spots_device_id` cookie when missing. Uses service role for DB + storage.
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "Server misconfigured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      },
      { status: 500 },
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const formData = await request.formData();

  const cookieHeader = request.headers.get("cookie") ?? "";
  let deviceId = parseCookie(cookieHeader, JOY_SPOTS_DEVICE_COOKIE);
  let issuedDeviceCookie = false;
  if (!deviceId?.trim()) {
    deviceId = crypto.randomUUID().toLowerCase();
    issuedDeviceCookie = true;
  } else {
    deviceId = deviceId.trim().toLowerCase();
  }

  const file = formData.get("photo");
  const hasPhoto = file instanceof File && file.size > 0;

  const textRaw = formData.get("text_content");
  const text_content =
    typeof textRaw === "string" ? textRaw.trim() : "";

  if (!hasPhoto && !text_content) {
    return NextResponse.json(
      { error: "Add a photo or write something for your joy spot." },
      { status: 400 },
    );
  }

  const dateRaw = formData.get("date");
  const date =
    typeof dateRaw === "string" && dateRaw.trim()
      ? dateRaw.trim()
      : todayISODate();

  const locRaw = formData.get("location_text");
  const location_text =
    typeof locRaw === "string" ? locRaw.trim() : "";

  const nameRaw = formData.get("contributor_name");
  const contributor_name =
    typeof nameRaw === "string" && nameRaw.trim()
      ? nameRaw.trim()
      : null;

  const capRaw = formData.get("caption");
  const caption =
    typeof capRaw === "string" && capRaw.trim() ? capRaw.trim() : null;

  let photo_url: string | null = null;

  if (hasPhoto) {
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
    const path = `${deviceId}/${Date.now()}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(JOY_SPOT_PHOTOS_BUCKET)
      .upload(path, bytes, {
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 400 },
      );
    }

    const { data: pub } = supabase.storage
      .from(JOY_SPOT_PHOTOS_BUCKET)
      .getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const moodRaw = formData.get("mood");
  const mood =
    typeof moodRaw === "string" && moodRaw.trim() ? moodRaw.trim() : null;

  const insertPayload: Record<string, unknown> = {
    photo_url,
    text_content,
    date,
    location_text,
    contributor_name,
    device_id: deviceId,
  };
  if (caption !== null) {
    insertPayload.caption = caption;
  }
  if (mood !== null) {
    insertPayload.mood = mood;
  }

  const { data: spot, error: insertError } = await supabase
    .from("joy_spots")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError || !spot) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create joy spot" },
      { status: 400 },
    );
  }

  const spotId = spot.id as string;
  const tagNames = dedupeTagNames(parseTagNames(formData));

  for (const tagName of tagNames) {
    const tagId = await resolveOrCreateTagId(supabase, tagName);
    if (!tagId) continue;
    await supabase.from("joy_spot_tags").insert({
      joy_spot_id: spotId,
      tag_id: tagId,
    });
  }

  const response = NextResponse.json(spot);

  if (issuedDeviceCookie) {
    response.cookies.set(JOY_SPOTS_DEVICE_COOKIE, deviceId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
    });
  }

  return response;
}
