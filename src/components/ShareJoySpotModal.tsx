"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { SubmissionForm } from "@/components/SubmissionForm";

type ShareJoySpotModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShareJoySpotModal({
  open,
  onOpenChange,
}: ShareJoySpotModalProps) {
  const [phase, setPhase] = useState<"form" | "thanks">("form");
  const [formResetKey, setFormResetKey] = useState(0);
  const formTitleId = useId();
  const thanksTitleId = useId();
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      queueMicrotask(() => {
        setPhase("form");
        setFormResetKey((k) => k + 1);
      });
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

  const shareAnother = useCallback(() => {
    setFormResetKey((k) => k + 1);
    setPhase("form");
  }, []);

  if (!open) return null;

  const labelId = phase === "form" ? formTitleId : thanksTitleId;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-3 sm:p-6">
        <div
          className="pointer-events-auto relative flex max-h-[calc(100dvh-1.5rem)] w-[45vw] min-h-0 min-w-0 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
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

          {phase === "form" ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <SubmissionForm
                key={formResetKey}
                variant="modal"
                headingId={formTitleId}
                subtitle=""
                onSubmitted={() => setPhase("thanks")}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-center px-6 pb-10 pt-12 text-center sm:pt-14">
              <h2
                id={thanksTitleId}
                className="font-serif text-[1.75rem] font-normal italic leading-tight tracking-tight text-[#2e2824] sm:text-[2rem]"
              >
                Thank you for sharing a joy
              </h2>
              <p className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
                <button
                  type="button"
                  onClick={shareAnother}
                  className="rounded-full border border-[#C17B5A] bg-transparent px-6 py-3 text-[8px] font-medium text-[#C17B5A] transition-colors hover:bg-[#C17B5A]/10"
                >
                  Share another joy
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-[#C17B5A] px-6 py-3 text-[8px] font-medium text-white transition-colors hover:bg-[#b06d4e]"
                  onClick={() => onOpenChange(false)}
                >
                  Explore joy spots
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
