import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileMySpotsSection } from "@/components/ProfileMySpotsSection";
import { pickMostCommonDominantColor } from "@/lib/dominant-color";
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
  const avatarColor = pickMostCommonDominantColor(
    mySpots,
    profile.avatar_color,
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="px-[72px] pt-[48px]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-medium leading-snug text-[#C17B5A] transition-colors hover:text-[#b06d4e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C17B5A]"
          style={{ fontSize: "14px" }}
        >
          <ArrowLeft className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          Back to the gallery
        </Link>
      </div>

      <div className="px-4 py-14">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
          <ProfileAvatar
            color={avatarColor}
            displayName={profile.display_name}
            size="lg"
          />
          <h1 className="mt-6 font-serif text-[clamp(calc(1.75rem_+_4pt),calc(1.75vw_+_4pt),calc(2.75rem_+_4pt))] font-normal italic leading-tight tracking-tight text-[#2e2824]">
            {profile.display_name}
          </h1>
          {profile.bio ? (
            <p className="mt-4 max-w-md text-[calc(1rem_+_4pt)] leading-relaxed text-[#5c4f45]">
              {profile.bio}
            </p>
          ) : null}
        </div>
      </div>

      <section
        className="mt-14 flex w-full flex-1 flex-col"
        aria-labelledby="my-spots-heading"
      >
        <h2
          id="my-spots-heading"
          className="mb-6 px-4 text-center font-serif text-[clamp(calc(1.5rem_+_4pt),calc(1.25vw_+_4pt),calc(2rem_+_4pt))] font-normal italic leading-tight tracking-tight text-[#2e2824]"
        >
          My spots
        </h2>
        <div className="w-full px-[72px]">
          <ProfileMySpotsSection spots={mySpots} />
        </div>
      </section>
    </div>
  );
}
