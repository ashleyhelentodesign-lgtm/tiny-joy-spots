"use client";

import { useMemo, useState } from "react";

import { GalleryGrid, type GallerySpot } from "@/components/GalleryGrid";
import { GalleryProfileInviteCard } from "@/components/GalleryProfileInviteCard";
import { JoyFloatingNav } from "@/components/JoyFloatingNav";
import { ProfileCreateModal } from "@/components/ProfileCreateModal";
import { ShareJoySpotModal } from "@/components/ShareJoySpotModal";
import { SiteHeader } from "@/components/SiteHeader";
import { StickySiteHeaderBar } from "@/components/StickySiteHeaderBar";
import { useViewerProfile } from "@/hooks/use-viewer-profile";

export function GalleryShell({ spots }: { spots: GallerySpot[] }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [createProfileOpen, setCreateProfileOpen] = useState(false);
  const { profile, promptDismissed, dismissPrompt, setProfileFromCreate } =
    useViewerProfile();

  const ownsAnySpot = useMemo(
    () => spots.some((spot) => spot.viewer_owns_spot),
    [spots],
  );

  const showProfileInvite =
    profile === null && !promptDismissed && ownsAnySpot;

  return (
    <>
      <JoyFloatingNav />
      <div className="w-full">
        <StickySiteHeaderBar>
          <SiteHeader
            onShareClick={() => setShareOpen(true)}
            profile={profile ?? null}
          />
        </StickySiteHeaderBar>
        <div className="px-[72px]">
          <GalleryGrid
            spots={spots}
            header={
              showProfileInvite ? (
                <GalleryProfileInviteCard
                  onOpenCreate={() => setCreateProfileOpen(true)}
                  onDismiss={dismissPrompt}
                />
              ) : null
            }
          />
        </div>
      </div>
      <ShareJoySpotModal open={shareOpen} onOpenChange={setShareOpen} />
      <ProfileCreateModal
        open={createProfileOpen}
        onOpenChange={setCreateProfileOpen}
        onCreated={setProfileFromCreate}
      />
    </>
  );
}
