"use client";

import { cn } from "@/lib/utils";

export type ProfileTab = "portrait" | "spots";

type ProfileNavTabsProps = {
  active: ProfileTab;
  spotCount: number;
  onChange: (tab: ProfileTab) => void;
};

const tabBaseClass =
  "font-sans text-[16px] leading-[1.2] tracking-normal transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C17B5A]";

export function ProfileNavTabs({
  active,
  spotCount,
  onChange,
}: ProfileNavTabsProps) {
  return (
    <nav
      className="inline-flex items-center gap-[24px]"
      aria-label="Profile sections"
    >
      <button
        type="button"
        className={cn(
          tabBaseClass,
          "pb-1",
          active === "spots"
            ? "border-b border-black font-medium text-black"
            : "border-b border-transparent font-light text-black hover:text-[#5c4f45]",
        )}
        aria-current={active === "spots" ? "page" : undefined}
        onClick={() => onChange("spots")}
      >
        Joy spots ({spotCount})
      </button>
      <button
        type="button"
        className={cn(
          tabBaseClass,
          "pb-1",
          active === "portrait"
            ? "border-b border-black font-medium text-black"
            : "border-b border-transparent font-light text-black hover:text-[#5c4f45]",
        )}
        aria-current={active === "portrait" ? "page" : undefined}
        onClick={() => onChange("portrait")}
      >
        Joy portrait
      </button>
    </nav>
  );
}
