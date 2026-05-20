"use client";

import { useState } from "react";

import { GalleryGrid, type GallerySpot } from "@/components/GalleryGrid";
import { ShareJoySpotModal } from "@/components/ShareJoySpotModal";
import { formatJoySpotsNoticedLine } from "@/lib/fetch-device-joy-spots";

type ProfileMySpotsSectionProps = {
  spots: GallerySpot[];
};

export function ProfileMySpotsSection({ spots }: ProfileMySpotsSectionProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const count = spots.length;

  return (
    <>
      <ShareJoySpotModal open={shareOpen} onOpenChange={setShareOpen} />
      <GalleryGrid
        spots={spots}
        showExplorerSearch={false}
        sectionAriaLabel="Your joy spots"
        header={
          count > 0 ? (
            <p className="mb-8 text-center text-[calc(1.125rem_+_4pt)] font-medium leading-relaxed text-[#3d3530]">
              {formatJoySpotsNoticedLine(count)}
            </p>
          ) : null
        }
        emptyState={
          <div className="mx-auto max-w-md py-12 text-center">
            <p className="text-[calc(1rem_+_4pt)] leading-relaxed text-[#5c4f45]">
              You haven&apos;t shared a joy spot from this device yet — when you
              do, they&apos;ll show up here.
            </p>
            <button
              type="button"
              className="mt-8 inline-flex rounded-full bg-[#C17B5A] px-7 py-4 font-medium leading-snug text-white transition-colors hover:bg-[#b06d4e] sm:px-8"
              style={{ fontSize: "14px" }}
              onClick={() => setShareOpen(true)}
            >
              Share a joyspot
            </button>
          </div>
        }
      />
    </>
  );
}
