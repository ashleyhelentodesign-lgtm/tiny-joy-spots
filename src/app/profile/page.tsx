import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ProfileMySpotsSection } from "@/components/ProfileMySpotsSection";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";
import {
  pickMostCommonDominantColor,
  pickTopDominantColorsWithCounts,
} from "@/lib/dominant-color";
import { fetchJoySpotsForUser } from "@/lib/fetch-device-joy-spots";
import {
  JOY_SPOTS_DEVICE_COOKIE,
  normalizeJoySpotsDeviceId,
} from "@/lib/joy-spots-device";
import { getUserColorProfileForUser } from "@/lib/profile-color-server";
import { getProfileForUser } from "@/lib/profile-server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your profile · Joy Spots",
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function claimAnonymousPosts(userId: string, deviceId: string) {
  const admin = adminClient();
  if (!admin) return;
  await admin
    .from("joy_spots")
    .update({ user_id: userId })
    .eq("device_id", deviceId)
    .is("user_id", null);
}

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/gallery");
  }

  // Claim anonymous posts from device cookie on profile load.
  const cookieStore = await cookies();
  const deviceId = normalizeJoySpotsDeviceId(
    cookieStore.get(JOY_SPOTS_DEVICE_COOKIE)?.value,
  );
  if (deviceId) {
    await claimAnonymousPosts(user.id, deviceId);
  }

  const profile = await getProfileForUser(user.id);
  if (!profile) {
    redirect("/profile/new");
  }

  const mySpots = await fetchJoySpotsForUser(user.id);
  const topColorPalette = pickTopDominantColorsWithCounts(mySpots, 5);
  const avatarColor =
    topColorPalette[0]?.hex ??
    pickMostCommonDominantColor(mySpots, profile.avatar_color);
  const userColorProfile = await getUserColorProfileForUser(user.id);

  return (
    <ProfilePageClient
      profile={profile}
      avatarColor={avatarColor}
      spots={mySpots}
      userColorProfile={userColorProfile}
      mySpotsSection={
        <>
          <h2
            id="my-spots-heading"
            className="mb-6 px-4 text-center font-serif text-[clamp(calc(1.5rem_+_4pt),calc(1.25vw_+_4pt),calc(2rem_+_4pt))] font-normal italic leading-tight tracking-tight text-[#2e2824]"
          >
            My spots
          </h2>
          <div className="w-full px-[36px] md:px-[72px]">
            <ProfileMySpotsSection spots={mySpots} />
          </div>
        </>
      }
    />
  );
}
