import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  JOY_SPOT_PHOTOS_BUCKET,
  photoPublicUrlToStoragePath,
} from "@/lib/joy-spot-storage";
import {
  JOY_SPOTS_DEVICE_COOKIE,
  normalizeJoySpotsDeviceId,
} from "@/lib/joy-spots-device";

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

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
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

  const viewer = normalizeJoySpotsDeviceId(
    parseCookie(request.headers.get("cookie") ?? "", JOY_SPOTS_DEVICE_COOKIE),
  );
  if (!viewer) {
    return NextResponse.json(
      { error: "Missing device session; cannot verify post ownership." },
      { status: 401 },
    );
  }

  const { id: spotId } = await ctx.params;
  if (!spotId?.trim()) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: fetchErr } = await supabase
    .from("joy_spots")
    .select("id, device_id, photo_url")
    .eq("id", spotId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 400 });
  }
  if (!row) {
    return NextResponse.json({ error: "Joy spot not found." }, { status: 404 });
  }

  const owner = normalizeJoySpotsDeviceId(
    row.device_id != null ? String(row.device_id) : null,
  );
  if (!owner || owner !== viewer) {
    return NextResponse.json({ error: "Not allowed to delete this post." }, { status: 403 });
  }

  const photoPath = photoPublicUrlToStoragePath(
    row.photo_url != null ? String(row.photo_url) : null,
  );
  if (photoPath) {
    const { error: storageErr } = await supabase.storage
      .from(JOY_SPOT_PHOTOS_BUCKET)
      .remove([photoPath]);
    if (storageErr) {
      console.warn("[joy-spots] storage remove:", storageErr.message);
    }
  }

  const { error: delErr } = await supabase
    .from("joy_spots")
    .delete()
    .eq("id", spotId);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  return new NextResponse(null, { status: 204 });
}
