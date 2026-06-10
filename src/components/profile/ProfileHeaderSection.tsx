import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileNavTabs, type ProfileTab } from "@/components/profile/ProfileNavTabs";
import type { Profile } from "@/lib/profile";
type ProfileHeaderSectionProps = {
  profile: Profile;
  avatarColor: string;
  spotCount: number;
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
};

export function ProfileHeaderSection({
  profile,
  avatarColor,
  spotCount,
  activeTab,
  onTabChange,
}: ProfileHeaderSectionProps) {
  return (
    <div className="w-full">
      <Link
        href="/"
        className="inline-flex items-center gap-2 font-sans text-[18px] font-medium leading-[1.2] text-[#b77e60] transition-colors hover:text-[#b06d4e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C17B5A]"
      >
        <ArrowLeft className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        Back to the gallery
      </Link>

      <div className="mx-auto mt-[48px] flex w-full max-w-[1116px] flex-col items-center gap-[36px] text-center">
        <div className="flex items-center justify-center gap-[24px]">
          <ProfileAvatar
            color={avatarColor}
            displayName={profile.display_name}
            size="sm"
            className="!size-[69px] min-h-[69px] min-w-[69px] shrink-0"
            initialFontSizePx={29}
          />
          <h1 className="m-0 font-sans text-[36px] font-medium leading-[1.2] text-black">
            {profile.display_name}
          </h1>
        </div>

        {profile.bio ? (
          <p className="m-0 max-w-full font-sans text-[24px] font-light leading-[1.2] text-black">
            {profile.bio}
          </p>
        ) : null}
      </div>

      <div className="mt-[57px] flex justify-center">
        <ProfileNavTabs
          active={activeTab}
          spotCount={spotCount}
          onChange={onTabChange}
        />
      </div>
    </div>
  );
}
