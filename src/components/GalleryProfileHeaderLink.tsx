"use client";

import Link from "next/link";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import type { Profile } from "@/lib/profile";

type GalleryProfileHeaderLinkProps = {
  profile: Profile;
  /** Match the Share button height (diameter of the avatar circle). */
  sizePx: number;
};

export function GalleryProfileHeaderLink({
  profile,
  sizePx,
}: GalleryProfileHeaderLinkProps) {
  const initialSize =
    sizePx >= 12
      ? Math.max(10, Math.round(sizePx * 0.42))
      : undefined;

  return (
    <Link
      href="/profile"
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C17B5A]"
      style={{ width: sizePx, height: sizePx }}
      aria-label={`Your profile, ${profile.display_name}`}
    >
      <ProfileAvatar
        color={profile.avatar_color}
        displayName={profile.display_name}
        size="sm"
        className="!size-full min-h-0 min-w-0"
        initialFontSizePx={initialSize}
      />
    </Link>
  );
}
