import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  mapProfileRow,
  normalizeProfileBio,
  normalizeProfileDisplayName,
  validateProfileInsert,
} from "@/lib/profile";
import { recomputeUserColorProfile } from "@/lib/user-color-profile";
import { createClient as createServerClient } from "@/lib/supabase/server";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const PROFILE_SELECT =
  "id, user_id, device_id, display_name, bio, avatar_color, created_at";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ profile: null });
  }

  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    profile: data ? mapProfileRow(data as Record<string, unknown>) : null,
  });
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

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

  const validation = validateProfileInsert({ display_name, bio });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a profile." },
      { status: 409 },
    );
  }

  const { data, error } = await admin
    .from("profiles")
    .insert({
      user_id: user.id,
      display_name: normalizeProfileDisplayName(display_name),
      bio: normalizeProfileBio(bio),
    })
    .select(PROFILE_SELECT)
    .single();

  if (error || !data) {
    const message = error?.message ?? "Could not save your profile.";
    const status = error?.code === "23505" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  try {
    await recomputeUserColorProfile(admin, user.id);
  } catch (recomputeError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Profile color] initial recompute failed", recomputeError);
    }
  }

  return NextResponse.json({
    profile: mapProfileRow(data as Record<string, unknown>),
  });
}
