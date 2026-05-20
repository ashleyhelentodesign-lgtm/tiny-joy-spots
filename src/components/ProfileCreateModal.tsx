"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { ProfileCreateForm } from "@/components/ProfileCreateForm";
import type { Profile } from "@/lib/profile";

type ProfileCreateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a profile is saved (before redirect to /profile). */
  onCreated?: (profile: Profile) => void;
};

export function ProfileCreateModal({
  open,
  onOpenChange,
  onCreated,
}: ProfileCreateModalProps) {
  const router = useRouter();
  const titleId = useId();
  const prevOpenRef = useRef(open);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFormKey((k) => k + 1);
    }
    prevOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-3 sm:p-6">
        <div
          className="pointer-events-auto relative flex max-h-[calc(100dvh-1.5rem)] w-[36vw] min-h-0 min-w-0 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="absolute right-2 top-2 z-20 flex size-24 items-center justify-center rounded-full text-[#6d625a] transition-colors hover:bg-black/5 hover:text-[#2e2824] sm:right-3 sm:top-3"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <span
              className="text-[length:calc(1.5rem*4)] leading-none"
              aria-hidden
            >
              ×
            </span>
          </button>

          <div className="joy-scroll-persistent flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-[clamp(1rem,1.5vw,2.5rem)] pb-8 pt-10 sm:pt-12">
            <ProfileCreateForm
              key={formKey}
              variant="modal"
              headingId={titleId}
              onCancel={() => onOpenChange(false)}
              onSubmitted={(profile) => {
                onCreated?.(profile);
                onOpenChange(false);
                router.push("/profile");
                router.refresh();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
