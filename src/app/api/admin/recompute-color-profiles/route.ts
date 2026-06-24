import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    .select("user_id")
    .not("user_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userIds = [
    ...new Set(
      (rows ?? [])
        .map((row) => String((row as { user_id?: string }).user_id ?? ""))
        .filter(Boolean),
    ),
  ];

  let processed = 0;
  const failures: Array<{ user_id: string; error: string }> = [];

  for (const userId of userIds) {
    try {
      await recomputeUserColorProfile(supabase, userId);
      processed += 1;
    } catch (err) {
      failures.push({
        user_id: userId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    total_users: userIds.length,
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
