import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  mapProfileRow,
  normalizeProfileBio,
  normalizeProfileDisplayName,
  validateProfileInsert,
} from "@/lib/profile";
import {
  JOY_SPOTS_DEVICE_COOKIE,
  parseJoySpotsDeviceCookie,
} from "@/lib/joy-spots-device";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function deviceFromRequest(request: Request): {
  deviceId: string;
  issuedDeviceCookie: boolean;
} {
  const cookieHeader = request.headers.get("cookie") ?? "";
  let deviceId = parseJoySpotsDeviceCookie(cookieHeader);
  let issuedDeviceCookie = false;
  if (!deviceId) {
    deviceId = crypto.randomUUID().toLowerCase();
    issuedDeviceCookie = true;
  }
  return { deviceId, issuedDeviceCookie };
}

function withDeviceCookie(
  response: NextResponse,
  deviceId: string,
  issued: boolean,
) {
  if (issued) {
    response.cookies.set(JOY_SPOTS_DEVICE_COOKIE, deviceId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
    });
  }
  return response;
}

export async function GET(request: Request) {
  const supabase = supabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured." },
      { status: 500 },
    );
  }

  const { deviceId, issuedDeviceCookie } = deviceFromRequest(request);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, device_id, display_name, bio, avatar_color, created_at")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const response = NextResponse.json({
    profile: data ? mapProfileRow(data as Record<string, unknown>) : null,
  });
  return withDeviceCookie(response, deviceId, issuedDeviceCookie);
}

export async function POST(request: Request) {
  const supabase = supabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured." },
      { status: 500 },
    );
  }

  const { deviceId, issuedDeviceCookie } = deviceFromRequest(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const display_name =
    typeof raw.display_name === "string" ? raw.display_name : "";
  const bio =
    raw.bio === null || raw.bio === undefined
      ? null
      : typeof raw.bio === "string"
        ? raw.bio
        : "";

  const validation = validateProfileInsert({
    device_id: deviceId,
    display_name,
    bio,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a profile on this device." },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      device_id: deviceId,
      display_name: normalizeProfileDisplayName(display_name),
      bio: normalizeProfileBio(bio),
    })
    .select("id, device_id, display_name, bio, avatar_color, created_at")
    .single();

  if (error || !data) {
    const message = error?.message ?? "Could not save your profile.";
    const status = error?.code === "23505" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const response = NextResponse.json({
    profile: mapProfileRow(data as Record<string, unknown>),
  });
  return withDeviceCookie(response, deviceId, issuedDeviceCookie);
}
