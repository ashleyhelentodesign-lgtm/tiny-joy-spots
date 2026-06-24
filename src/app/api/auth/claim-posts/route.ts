import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { parseJoySpotsDeviceCookie } from "@/lib/joy-spots-device";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const deviceId = parseJoySpotsDeviceCookie(cookieHeader);

  if (!deviceId) {
    return NextResponse.json({ claimed: 0 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await admin
    .from("joy_spots")
    .update({ user_id: user.id })
    .eq("device_id", deviceId)
    .is("user_id", null)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ claimed: data?.length ?? 0 });
}
