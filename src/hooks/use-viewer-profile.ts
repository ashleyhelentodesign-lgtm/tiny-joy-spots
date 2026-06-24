"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/profile";
import {
  dismissProfilePrompt,
  isProfilePromptDismissed,
} from "@/lib/profile-prompt-dismissal";

async function fetchProfileFromApi(): Promise<Profile | null> {
  try {
    const res = await fetch("/api/profile", { credentials: "include" });
    const payload = (await res.json()) as { profile?: Profile | null };
    return payload.profile ?? null;
  } catch {
    return null;
  }
}

export function useViewerProfile() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(undefined);
  const [promptDismissed, setPromptDismissed] = useState(() =>
    isProfilePromptDismissed(),
  );

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      const authed = !!session;
      setIsAuthenticated(authed);
      if (authed) {
        fetchProfileFromApi().then(setProfile);
      } else {
        setProfile(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authed = !!session;
      setIsAuthenticated(authed);
      if (authed) {
        const p = await fetchProfileFromApi();
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
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
    isAuthenticated,
    promptDismissed,
    dismissPrompt,
    setProfileFromCreate,
  };
}
