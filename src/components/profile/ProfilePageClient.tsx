"use client";

import { useState, type ReactNode } from "react";

import type { GallerySpot } from "@/components/GalleryGrid";
import { ProfileHeaderSection } from "@/components/profile/ProfileHeaderSection";
import { ProfileJoyPortraitView } from "@/components/profile/ProfileJoyPortraitView";
import type { ProfileTab } from "@/components/profile/ProfileNavTabs";
import type { Profile } from "@/lib/profile";
import { buildProfilePortraitData } from "@/lib/profile-portrait-data";

type ProfilePageClientProps = {
  profile: Profile;
  avatarColor: string;
  spots: GallerySpot[];
  mySpotsSection: ReactNode;
};

export function ProfilePageClient({
  profile,
  avatarColor,
  spots,
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
        <div className="flex flex-1 flex-col bg-[#FAF6F0] px-[72px] pb-60 pt-[113px]">
          <ProfileJoyPortraitView data={portraitData} />
        </div>
      ) : (
        <div className="mt-14 flex w-full flex-1 flex-col bg-[#FAF6F0] pb-60">
          {mySpotsSection}
        </div>
      )}
    </div>
  );
}
