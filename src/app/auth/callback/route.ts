import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { parseJoySpotsDeviceCookie } from "@/lib/joy-spots-device";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/gallery";

  if (code) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const userId = data.user.id;

      const cookieHeader = request.headers.get("cookie") ?? "";
      const deviceId = parseJoySpotsDeviceCookie(cookieHeader);
      if (deviceId) {
        await claimAnonymousPosts(userId, deviceId);
      }

      const admin = adminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile) {
        return NextResponse.redirect(`${origin}/profile/new`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function claimAnonymousPosts(userId: string, deviceId: string) {
  await adminClient()
    .from("joy_spots")
    .update({ user_id: userId })
    .eq("device_id", deviceId)
    .is("user_id", null);
}
