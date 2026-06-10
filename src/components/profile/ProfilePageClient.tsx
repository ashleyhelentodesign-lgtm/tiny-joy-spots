"use client";

import { useState, type ReactNode } from "react";

import type { GallerySpot } from "@/components/GalleryGrid";
import { ProfileHeaderSection } from "@/components/profile/ProfileHeaderSection";
import { ProfileJoyPortraitView } from "@/components/profile/ProfileJoyPortraitView";
import type { ProfileTab } from "@/components/profile/ProfileNavTabs";
import type { Profile } from "@/lib/profile";
import { buildProfilePortraitData } from "@/lib/profile-portrait-data";
import type { UserColorProfile } from "@/lib/user-color-profile";

type ProfilePageClientProps = {
  profile: Profile;
  avatarColor: string;
  spots: GallerySpot[];
  userColorProfile: UserColorProfile | null;
  mySpotsSection: ReactNode;
};

export function ProfilePageClient({
  profile,
  avatarColor,
  spots,
  userColorProfile,
  mySpotsSection,
}: ProfilePageClientProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("portrait");
  const portraitData = buildProfilePortraitData(spots);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[#FAF6F0]">
      <div className="px-[72px] pb-0 pt-[48px]">
        <ProfileHeaderSection
          profile={profile}
          avatarColor={avatarColor}
          spotCount={spots.length}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {activeTab === "portrait" ? (
        <div className="flex flex-1 flex-col bg-[#FAF6F0] px-[72px] pb-60 pt-[28px]">
          <h2 className="mb-6 px-4 text-center font-serif text-[clamp(calc(1.5rem_+_4pt),calc(1.25vw_+_4pt),calc(2rem_+_4pt))] font-normal italic leading-tight tracking-tight text-[#2e2824]">
            My Joy Portrait
          </h2>
          <ProfileJoyPortraitView
            data={portraitData}
            colorProfile={userColorProfile}
            submissionCount={spots.length}
          />
        </div>
      ) : (
        <div className="mt-14 flex w-full flex-1 flex-col bg-[#FAF6F0] pb-60">
          {mySpotsSection}
        </div>
      )}
    </div>
  );
}
