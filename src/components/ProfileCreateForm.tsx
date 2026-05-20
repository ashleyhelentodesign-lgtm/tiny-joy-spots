"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { JoyColorAuraPreview } from "@/components/JoyColorAuraPreview";
import {
  PROFILE_BIO_MAX_LENGTH,
  mapProfileRow,
  normalizeProfileBio,
  normalizeProfileDisplayName,
  type Profile,
} from "@/lib/profile";
import { cn } from "@/lib/utils";

const fieldLabel =
  "mb-2 block text-[calc(0.95rem_+_4pt)] font-medium tracking-[0.02em] text-[#3d3530]";

const fieldInput =
  "w-full rounded-2xl border border-[#e3d9ce] bg-[#FFFCF7] px-4 py-3.5 text-[calc(1rem_+_4pt)] text-[#2e2824] shadow-inner shadow-black/[0.02] outline-none transition-[border-color,box-shadow] placeholder:text-[#8C7B6E]/70 focus:border-[#C17B5A] focus:ring-2 focus:ring-[#C17B5A]/20";

export type ProfileCreateFormProps = {
  variant?: "page" | "modal";
  headingId?: string;
  onSubmitted?: (profile: Profile) => void;
  onCancel?: () => void;
};

export function ProfileCreateForm({
  variant = "page",
  headingId: headingIdProp,
  onSubmitted,
  onCancel,
}: ProfileCreateFormProps) {
  const router = useRouter();
  const autoHeadingId = useId();
  const headingId = headingIdProp ?? autoHeadingId;
  const baseId = useId();
  const isModal = variant === "modal";

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bioLength = bio.length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = normalizeProfileDisplayName(displayName);
    if (!name) {
      setError("What should we call you?");
      return;
    }

    const trimmedBio = normalizeProfileBio(bio);
    if (trimmedBio && trimmedBio.length > PROFILE_BIO_MAX_LENGTH) {
      setError(`Bio can be at most ${PROFILE_BIO_MAX_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          display_name: name,
          bio: trimmedBio,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        profile?: Record<string, unknown>;
      };

      if (!res.ok) {
        setError(
          typeof payload.error === "string"
            ? payload.error
            : "Could not save your profile.",
        );
        return;
      }

      const profile = payload.profile
        ? mapProfileRow(payload.profile)
        : null;
      if (!profile) {
        setError("Could not save your profile.");
        return;
      }

      if (onSubmitted) {
        onSubmitted(profile);
      } else {
        router.push("/profile");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNotNow() {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "mx-auto flex w-full flex-col",
        isModal ? "max-w-none" : "max-w-lg",
      )}
      noValidate
    >
      <header
        className={cn(
          "text-center",
          isModal ? "mb-[calc(1.5rem*1.4*1.4)]" : "mb-[calc(2rem*1.4*1.4)]",
        )}
      >
        <h1
          id={headingId}
          className="font-serif text-[clamp(calc(1.75rem_+_4pt),calc(1.75vw_+_4pt),calc(2.75rem_+_4pt))] font-normal italic leading-tight tracking-tight text-[#2e2824]"
        >
          Put your name to your spots
        </h1>
        <p
          className={cn(
            "mx-auto leading-relaxed text-[#8C7B6E]",
            isModal
              ? "mt-[calc(0.75rem*1.3)] max-w-4xl text-[clamp(calc(0.875rem_+_4pt),calc(0.6vw_+_4pt),calc(1rem_+_4pt))]"
              : "mt-3 max-w-md text-[calc(0.95rem_+_4pt)]",
          )}
        >
          Totally optional — only if you&apos;d like your joy spots to carry a
          name. You can still share without one anytime.
        </p>
      </header>

      <div
        className={cn(
          "flex flex-col items-center gap-[calc(0.75rem*1.21)] text-center",
          isModal ? "mb-[calc(1.5rem*1.4)]" : "mb-[calc(2rem*1.4)]",
        )}
      >
        <JoyColorAuraPreview size={isModal ? "sm" : "md"} />
        <p
          className={cn(
            "mx-auto text-[calc(0.85rem_+_4pt)] leading-relaxed text-[#6d625a]",
            isModal
              ? "max-w-[calc(56rem*0.75)]"
              : "max-w-[calc(28rem*0.75)]",
          )}
        >
          We&apos;ll craft your Joy Color based on your uploaded joyspots. The
          color will adjust as you post more spots!
        </p>
      </div>

      <div className={cn("flex flex-col", isModal ? "gap-5" : "gap-6")}>
        <div>
          <label htmlFor={`${baseId}-name`} className={fieldLabel}>
            What should we call you?
          </label>
          <input
            id={`${baseId}-name`}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="A name or nickname"
            autoComplete="nickname"
            required
            className={fieldInput}
          />
        </div>

        <div>
          <label htmlFor={`${baseId}-bio`} className={fieldLabel}>
            A few words about you{" "}
            <span className="font-normal text-[#8C7B6E]/80">(optional)</span>
          </label>
          <textarea
            id={`${baseId}-bio`}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What brings you joy lately?"
            rows={3}
            maxLength={PROFILE_BIO_MAX_LENGTH}
            className={cn(fieldInput, "min-h-[6rem] resize-y")}
          />
          <p
            className={cn(
              "mt-1.5 text-right text-[calc(0.8rem_+_4pt)] tabular-nums",
              bioLength > PROFILE_BIO_MAX_LENGTH
                ? "text-[#a85c4a]"
                : "text-[#8C7B6E]",
            )}
            aria-live="polite"
          >
            {bioLength}/{PROFILE_BIO_MAX_LENGTH}
          </p>
        </div>

        {error ? (
          <p
            className="text-center text-[calc(0.875rem_+_4pt)] text-[#a85c4a]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "w-full rounded-2xl bg-[#C17B5A] font-medium text-white shadow-sm transition-[transform,opacity] hover:bg-[#b06d4e] disabled:pointer-events-none disabled:opacity-50",
            isModal
              ? "py-[clamp(0.875rem,0.75vw,1.125rem)] text-[clamp(calc(1rem_+_4pt),calc(0.7vw_+_4pt),calc(1.25rem_+_4pt))]"
              : "py-4 text-[calc(1.125rem_+_4pt)]",
          )}
        >
          {submitting ? "Saving…" : "That's me"}
        </button>

        <p className="text-center">
          <button
            type="button"
            className="text-[calc(0.875rem_+_4pt)] text-[#8C7B6E] underline-offset-2 hover:text-[#6d625a] hover:underline"
            onClick={handleNotNow}
          >
            Not now
          </button>
        </p>
      </div>
    </form>
  );
}
