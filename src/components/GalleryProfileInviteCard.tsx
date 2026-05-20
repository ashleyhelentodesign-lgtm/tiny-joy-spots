"use client";

import { X } from "lucide-react";

type GalleryProfileInviteCardProps = {
  onOpenCreate: () => void;
  onDismiss: () => void;
};

export function GalleryProfileInviteCard({
  onOpenCreate,
  onDismiss,
}: GalleryProfileInviteCardProps) {
  return (
    <div
      className="mb-8 flex items-start gap-3 rounded-2xl border border-[#e8e2da] bg-[#FFFCF7] px-5 py-4 shadow-sm shadow-black/[0.03]"
      role="region"
      aria-label="Optional profile"
    >
      <button
        type="button"
        onClick={onOpenCreate}
        className="min-w-0 flex-1 text-left transition-opacity hover:opacity-90"
      >
        <p className="m-0 text-[calc(0.95rem_+_4pt)] leading-relaxed text-[#5c4f45]">
          Your spots are building up. Want to claim them?
        </p>
        <span className="mt-2 inline-block text-[calc(0.9rem_+_4pt)] font-medium text-[#C17B5A]">
          Put your name to your spots →
        </span>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[#8C7B6E] transition-colors hover:bg-[#ebe6e0] hover:text-[#5c4f45] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C17B5A]"
        aria-label="Dismiss for now"
      >
        <X className="size-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
