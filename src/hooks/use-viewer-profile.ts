"use client";

import { useCallback, useEffect, useState } from "react";

import type { Profile } from "@/lib/profile";
import {
  dismissProfilePrompt,
  isProfilePromptDismissed,
} from "@/lib/profile-prompt-dismissal";

export function useViewerProfile() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [promptDismissed, setPromptDismissed] = useState(() =>
    isProfilePromptDismissed(),
  );

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

  const dismissPrompt = useCallback(() => {
    dismissProfilePrompt();
    setPromptDismissed(true);
  }, []);

  const setProfileFromCreate = useCallback((next: Profile) => {
    setProfile(next);
  }, []);

  return {
    profile,
    promptDismissed,
    dismissPrompt,
    setProfileFromCreate,
  };
}
