"use client";

import { useEffect, useState } from "react";

import { ProfileCreateModal } from "@/components/ProfileCreateModal";
import type { Profile } from "@/lib/profile";

export function ProfileInvitationCta() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile", { credentials: "include" });
        const payload = (await res.json()) as { profile?: Profile | null };
        if (!cancelled) {
          setProfile(payload.profile ?? null);
        }
      } catch {
        if (!cancelled) setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (profile === undefined || profile !== null) return null;

  return (
    <>
      <p className="m-0 text-[14px] font-normal leading-snug text-[#6d625a] sm:text-[14.4px]">
        Shared a spot?{" "}
        <button
          type="button"
          className="text-[#5c4f45] underline decoration-[#C17B5A]/50 underline-offset-2 transition-colors hover:text-[#C17B5A]"
          onClick={() => setModalOpen(true)}
        >
          Put your name to them
        </button>
        <span className="text-[#8C7B6E]"> — optional, whenever you like.</span>
      </p>
      <ProfileCreateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={(p) => setProfile(p)}
      />
    </>
  );
}
