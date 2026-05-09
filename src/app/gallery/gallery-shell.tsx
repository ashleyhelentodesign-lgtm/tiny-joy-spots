"use client";

import { useState } from "react";

import { GalleryGrid, type GallerySpot } from "@/components/GalleryGrid";
import { JoyFloatingNav } from "@/components/JoyFloatingNav";
import { ShareJoySpotModal } from "@/components/ShareJoySpotModal";
import { SiteHeader } from "@/components/SiteHeader";
import { StickySiteHeaderBar } from "@/components/StickySiteHeaderBar";

export function GalleryShell({ spots }: { spots: GallerySpot[] }) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <JoyFloatingNav />
      <div className="w-full">
        <StickySiteHeaderBar>
          <SiteHeader onShareClick={() => setShareOpen(true)} />
        </StickySiteHeaderBar>
        <div className="px-[72px]">
          <GalleryGrid spots={spots} />
        </div>
      </div>
      <ShareJoySpotModal open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
}
