import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ProfileMySpotsSection } from "@/components/ProfileMySpotsSection";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";
import {
  pickMostCommonDominantColor,
  pickTopDominantColorsWithCounts,
} from "@/lib/dominant-color";
import { fetchJoySpotsForDevice } from "@/lib/fetch-device-joy-spots";
import {
  JOY_SPOTS_DEVICE_COOKIE,
  normalizeJoySpotsDeviceId,
} from "@/lib/joy-spots-device";
import { getProfileForDevice } from "@/lib/profile-server";

export const metadata: Metadata = {
  title: "Your profile · Joy Spots",
};

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const deviceId = normalizeJoySpotsDeviceId(
    cookieStore.get(JOY_SPOTS_DEVICE_COOKIE)?.value,
  );
  const profile = await getProfileForDevice(deviceId);

  if (!profile) {
    redirect("/profile/new");
  }

  const mySpots = await fetchJoySpotsForDevice(deviceId);
  const topColorPalette = pickTopDominantColorsWithCounts(mySpots, 5);
  const avatarColor =
    topColorPalette[0]?.hex ??
    pickMostCommonDominantColor(mySpots, profile.avatar_color);

  return (
    <ProfilePageClient
      profile={profile}
      avatarColor={avatarColor}
      spots={mySpots}
      mySpotsSection={
        <>
          <h2
            id="my-spots-heading"
            className="mb-6 px-4 text-center font-serif text-[clamp(calc(1.5rem_+_4pt),calc(1.25vw_+_4pt),calc(2rem_+_4pt))] font-normal italic leading-tight tracking-tight text-[#2e2824]"
          >
            My spots
          </h2>
          <div className="w-full px-[72px]">
            <ProfileMySpotsSection spots={mySpots} />
          </div>
        </>
      }
    />
  );
}
