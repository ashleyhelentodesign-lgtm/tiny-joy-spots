"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

function GalleryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function NodeLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.2 8.5 10.5 14M15.8 8.5 13.5 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Expands on hover to reveal label; icon column stays fixed width. */
const navRowClass =
  "group inline-flex h-[35px] max-w-[35px] cursor-pointer items-center overflow-hidden rounded-full transition-[max-width,box-shadow,color,background-color] duration-200 ease-out hover:max-w-[min(320px,calc(100vw-2rem))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C17B5A] active:scale-[0.98]";

const SHOW_GALLERY_FLOATING_NAV = false;
const SHOW_EXPLORER_FLOATING_NAV = false;

export function JoyFloatingNav() {
  const pathname = usePathname() ?? "";

  if (!SHOW_GALLERY_FLOATING_NAV && !SHOW_EXPLORER_FLOATING_NAV) {
    return null;
  }

  const isGallery = SHOW_GALLERY_FLOATING_NAV
    ? pathname === "/" ||
      pathname === "/gallery" ||
      pathname.startsWith("/gallery/")
    : false;
  const isTagMap = SHOW_EXPLORER_FLOATING_NAV
    ? pathname === "/tag-map" || pathname.startsWith("/tag-map/")
    : false;

  return (
    <nav
      className="pointer-events-none fixed left-4 top-1/2 z-[85] -translate-y-1/2 sm:left-6"
      aria-label="Primary views"
    >
      <div className="pointer-events-auto flex flex-col gap-3">
        {SHOW_GALLERY_FLOATING_NAV ? (
          <Link
            href="/"
            className={cn(
              navRowClass,
              isGallery
                ? "bg-[#C17B5A] text-white shadow-inner ring-1 ring-[#a8664d]/80"
                : "text-[#5c4f45] hover:bg-white",
            )}
            aria-current={isGallery ? "page" : undefined}
            title="Gallery mode"
          >
            <span className="flex h-[35px] w-[35px] shrink-0 items-center justify-center">
              <GalleryIcon className="size-[18px] transition-transform duration-200 ease-out group-hover:scale-110" />
            </span>
            <span
              aria-hidden
              className="shrink-0 whitespace-nowrap pr-3 pl-0.5 font-semibold leading-none opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{ fontSize: "12px" }}
            >
              Gallery mode
            </span>
            <span className="sr-only">Gallery mode</span>
          </Link>
        ) : null}
        {SHOW_EXPLORER_FLOATING_NAV ? (
          <Link
            href="/tag-map"
            className={cn(
              navRowClass,
              isTagMap
                ? "bg-[#C17B5A] text-white shadow-inner ring-1 ring-[#a8664d]/80"
                : "text-[#5c4f45] hover:bg-white",
            )}
            aria-current={isTagMap ? "page" : undefined}
            title="Explorer mode"
          >
            <span className="flex h-[35px] w-[35px] shrink-0 items-center justify-center">
              <NodeLinkIcon className="size-[18px] transition-transform duration-200 ease-out group-hover:scale-110" />
            </span>
            <span
              aria-hidden
              className="shrink-0 whitespace-nowrap pr-3 pl-0.5 font-semibold leading-none opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{ fontSize: "12px" }}
            >
              Explorer mode
            </span>
            <span className="sr-only">Explorer mode</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
