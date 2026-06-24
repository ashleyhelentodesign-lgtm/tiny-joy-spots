"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

import { GalleryProfileHeaderLink } from "@/components/GalleryProfileHeaderLink";
import type { Profile } from "@/lib/profile";

type SiteHeaderProps = {
  onShareClick: () => void;
  profile?: Profile | null;
  onSignInClick?: () => void;
};

export function SiteHeader({ onShareClick, profile, onSignInClick }: SiteHeaderProps) {
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [shareButtonHeight, setShareButtonHeight] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    const el = shareButtonRef.current;
    if (!el) return;
    const update = () => setShareButtonHeight(el.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header className="py-4 sm:py-7 md:py-9">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-4">
        <div className="min-w-0" aria-hidden />

        <h1
          className="text-center font-serif font-normal italic leading-tight tracking-tight text-[#2e2824]"
          style={{ fontSize: "32px" }}
        >
          tiny joy spots
        </h1>

        <div className="flex min-w-0 items-center justify-end">
          {/* Desktop — shown at md and above */}
          <div className="hidden items-center gap-[16px] md:flex">
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
              <GalleryProfileHeaderLink profile={profile} sizePx={shareButtonHeight} />
            ) : !profile && onSignInClick ? (
              <button
                type="button"
                onClick={onSignInClick}
                className="px-3 py-4 font-medium leading-snug text-[#C17B5A] transition-colors hover:text-[#b06d4e]"
                style={{ fontSize: "14px" }}
              >
                Sign in
              </button>
            ) : null}
          </div>

          {/* Mobile hamburger button — hidden at md and above */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex size-10 items-center justify-center rounded-full text-[#5c4f45] transition-colors hover:bg-black/5"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden>
                <rect y="0" width="20" height="2" rx="1" fill="currentColor" />
                <rect y="7" width="20" height="2" rx="1" fill="currentColor" />
                <rect y="14" width="20" height="2" rx="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav overlay — height hugs content, anchored to top of viewport */}
      {menuOpen && (
        <div
          className="fixed inset-x-0 top-0 z-50 bg-white md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Identical grid + padding to the main header so the title doesn't move */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 px-[36px] py-4 sm:gap-x-4 sm:py-7">
            <div className="min-w-0" aria-hidden />
            <span
              className="text-center font-serif font-normal italic leading-tight tracking-tight text-[#2e2824]"
              style={{ fontSize: "32px" }}
            >
              tiny joy spots
            </span>
            <div className="flex min-w-0 items-center justify-end">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="text-[#5c4f45] transition-colors hover:text-[#2e2824]"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M3 3L17 17M17 3L3 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Menu items — divide-y adds separators between items only (no trailing divider) */}
          <nav className="flex flex-col divide-y divide-[#e8e2da] px-[36px] pb-[48px] pt-6">
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onShareClick(); }}
              className="py-5 text-left text-[18px] font-medium text-[#3d3530] transition-colors hover:text-[#C17B5A]"
            >
              Share a joyspot
            </button>
            {profile ? (
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="py-5 text-[18px] font-medium text-[#3d3530] transition-colors hover:text-[#C17B5A]"
              >
                My profile
              </Link>
            ) : onSignInClick ? (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onSignInClick(); }}
                className="py-5 text-left text-[18px] font-medium text-[#C17B5A] transition-colors hover:text-[#b06d4e]"
              >
                Sign in
              </button>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
