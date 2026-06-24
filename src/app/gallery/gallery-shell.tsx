"use client";

import { useMemo, useState } from "react";

import { AuthModal } from "@/components/AuthModal";
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
  const [authOpen, setAuthOpen] = useState(false);
  const [createProfileOpen, setCreateProfileOpen] = useState(false);
  const {
    profile,
    isAuthenticated,
    promptDismissed,
    dismissPrompt,
    setProfileFromCreate,
  } = useViewerProfile();

  const ownsAnySpot = useMemo(
    () => spots.some((spot) => spot.viewer_owns_spot),
    [spots],
  );

  const showProfileInvite =
    profile === null && !promptDismissed && ownsAnySpot;

  function handleOpenCreate() {
    if (!isAuthenticated) {
      setAuthOpen(true);
    } else {
      setCreateProfileOpen(true);
    }
  }

  return (
    <>
      <JoyFloatingNav />
      <div className="w-full">
        <StickySiteHeaderBar>
          <SiteHeader
            onShareClick={() => setShareOpen(true)}
            profile={profile ?? null}
            onSignInClick={() => setAuthOpen(true)}
          />
        </StickySiteHeaderBar>
        <div className="px-[36px] md:px-[72px]">
          <GalleryGrid
            spots={spots}
            header={
              showProfileInvite ? (
                <GalleryProfileInviteCard
                  onOpenCreate={handleOpenCreate}
                  onDismiss={dismissPrompt}
                />
              ) : null
            }
          />
        </div>
      </div>
      <ShareJoySpotModal open={shareOpen} onOpenChange={setShareOpen} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <ProfileCreateModal
        open={createProfileOpen}
        onOpenChange={setCreateProfileOpen}
        onCreated={setProfileFromCreate}
      />
    </>
  );
}
