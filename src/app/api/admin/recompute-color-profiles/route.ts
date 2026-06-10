import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { normalizeJoySpotsDeviceId } from "@/lib/joy-spots-device";
import { recomputeUserColorProfile } from "@/lib/user-color-profile";

function isAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_RECOMPUTE_KEY;
  if (!expected) return false;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length) === expected;
  }
  const key = new URL(request.url).searchParams.get("key");
  return key === expected;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function recomputeAllProfiles() {
  const supabase = supabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured for admin recompute." },
      { status: 500 },
    );
  }

  const { data: rows, error } = await supabase
    .from("joy_spots")
    .select("device_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const deviceIds = [
    ...new Set(
      (rows ?? [])
        .map((row) =>
          normalizeJoySpotsDeviceId(
            String((row as { device_id?: string }).device_id ?? ""),
          ),
        )
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let processed = 0;
  const failures: Array<{ device_id: string; error: string }> = [];

  for (const deviceId of deviceIds) {
    try {
      await recomputeUserColorProfile(supabase, deviceId);
      processed += 1;
    } catch (err) {
      failures.push({
        device_id: deviceId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    total_devices: deviceIds.length,
    processed,
    failures,
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return recomputeAllProfiles();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return recomputeAllProfiles();
}
