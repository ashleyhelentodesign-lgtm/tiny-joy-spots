"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProfileCreateModal } from "@/components/ProfileCreateModal";
import { createClient } from "@/lib/supabase/client";

export default function ProfileNewPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/gallery");
      } else {
        setOpen(true);
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) return null;

  return (
    <ProfileCreateModal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) router.replace("/gallery");
      }}
    />
  );
}
