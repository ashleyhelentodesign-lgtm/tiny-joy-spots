"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProfileCreateModal } from "@/components/ProfileCreateModal";

/** Legacy URL: opens the create-profile modal, then returns home when dismissed. */
export default function ProfileNewPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      router.replace("/");
    }
  }, [open, router]);

  return (
    <ProfileCreateModal
      open={open}
      onOpenChange={setOpen}
    />
  );
}
