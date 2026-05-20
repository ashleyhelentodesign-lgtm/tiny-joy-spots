"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { GalleryProfileHeaderLink } from "@/components/GalleryProfileHeaderLink";
import type { Profile } from "@/lib/profile";

type SiteHeaderProps = {
  onShareClick: () => void;
  /** When set, a quiet avatar link is shown to the right of Share. */
  profile?: Profile | null;
};

export function SiteHeader({ onShareClick, profile }: SiteHeaderProps) {
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [shareButtonHeight, setShareButtonHeight] = useState<number | null>(
    null,
  );

  useLayoutEffect(() => {
    const el = shareButtonRef.current;
    if (!el) return;

    const update = () => {
      setShareButtonHeight(el.getBoundingClientRect().height);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header className="py-7 sm:py-9">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4">
        <div className="min-w-0" aria-hidden />
        <h1
          className="text-center font-serif font-normal italic leading-tight tracking-tight text-[#2e2824]"
          style={{ fontSize: "32px" }}
        >
          tiny joy spots
        </h1>
        <div className="flex min-w-0 items-center justify-end gap-[16px]">
          <button
            ref={shareButtonRef}
            type="button"
            className="rounded-full bg-[#C17B5A] px-7 py-4 font-medium leading-snug text-white transition-colors hover:bg-[#b06d4e] sm:px-8"
            style={{ fontSize: "14px" }}
            onClick={onShareClick}
          >
            Share a joyspot
          </button>
          {profile && shareButtonHeight != null ? (
            <GalleryProfileHeaderLink
              profile={profile}
              sizePx={shareButtonHeight}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
