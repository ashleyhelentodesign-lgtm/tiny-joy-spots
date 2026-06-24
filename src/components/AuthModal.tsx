"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Tab = "password" | "magic";

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const fieldLabel =
  "mb-2 block text-[calc(0.95rem_+_4pt)] font-medium tracking-[0.02em] text-[#3d3530]";

const fieldInput =
  "w-full rounded-2xl border border-[#e3d9ce] bg-[#FFFCF7] px-4 py-3.5 text-[calc(1rem_+_4pt)] text-[#2e2824] shadow-inner shadow-black/[0.02] outline-none transition-[border-color,box-shadow] placeholder:text-[#8C7B6E]/70 focus:border-[#C17B5A] focus:ring-2 focus:ring-[#C17B5A]/20";

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const router = useRouter();
  const titleId = useId();
  const emailId = useId();
  const passwordId = useId();

  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTab("password");
      setEmail("");
      setPassword("");
      setIsSignUp(false);
      setError(null);
      setMagicSent(false);
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

  async function afterSignIn() {
    try {
      await fetch("/api/auth/claim-posts", { method: "POST", credentials: "include" });
    } catch {
      // non-fatal
    }

    const res = await fetch("/api/profile", { credentials: "include" });
    const payload = (await res.json()) as { profile?: { id: string } | null };

    if (!payload.profile) {
      onOpenChange(false);
      router.push("/profile/new");
    } else {
      onOpenChange(false);
      router.refresh();
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) { setError(error.message); return; }
        setMagicSent(true);
        setTab("magic");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); return; }
        await afterSignIn();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMagicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) { setError(error.message); return; }
      setMagicSent(true);
    } finally {
      setSubmitting(false);
    }
  }

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
            <span className="text-[length:calc(1.5rem*4)] leading-none" aria-hidden>×</span>
          </button>

          <div className="joy-scroll-persistent flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-[clamp(1rem,1.5vw,2.5rem)] pb-8 pt-10 sm:pt-12">
            <header className="mb-[calc(1.5rem*1.4*1.4)] text-center">
              <h2
                id={titleId}
                className="font-serif text-[clamp(calc(1.75rem_+_4pt),calc(1.75vw_+_4pt),calc(2.75rem_+_4pt))] font-normal italic leading-tight tracking-tight text-[#2e2824]"
              >
                {isSignUp && tab === "password" ? "Create your account" : "Welcome back"}
              </h2>
              <p className="mx-auto mt-[calc(0.75rem*1.3)] max-w-4xl text-[clamp(calc(0.875rem_+_4pt),calc(0.6vw_+_4pt),calc(1rem_+_4pt))] leading-relaxed text-[#8C7B6E]">
                Sign in to see all your joy spots across devices.
              </p>
            </header>

            {/* Tab switcher */}
            <div className="mb-[calc(1.5rem*1.4)] flex rounded-2xl bg-[#F4EDE5] p-1">
              <button
                type="button"
                onClick={() => { setTab("password"); setError(null); setMagicSent(false); }}
                className={`flex-1 rounded-xl py-3 text-[calc(0.95rem_+_4pt)] font-medium transition-colors ${
                  tab === "password"
                    ? "bg-white text-[#3d3530] shadow-sm"
                    : "text-[#8C7B6E] hover:text-[#5c4f45]"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => { setTab("magic"); setError(null); setMagicSent(false); }}
                className={`flex-1 rounded-xl py-3 text-[calc(0.95rem_+_4pt)] font-medium transition-colors ${
                  tab === "magic"
                    ? "bg-white text-[#3d3530] shadow-sm"
                    : "text-[#8C7B6E] hover:text-[#5c4f45]"
                }`}
              >
                Magic link
              </button>
            </div>

            {tab === "password" && !magicSent && (
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5" noValidate>
                <div>
                  <label htmlFor={emailId} className={fieldLabel}>
                    Email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className={fieldInput}
                  />
                </div>
                <div>
                  <label htmlFor={passwordId} className={fieldLabel}>
                    Password
                  </label>
                  <input
                    id={passwordId}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignUp ? "At least 6 characters" : "Your password"}
                    required
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    className={fieldInput}
                  />
                </div>

                {error && (
                  <p className="text-center text-[calc(0.875rem_+_4pt)] text-[#a85c4a]" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-[#C17B5A] py-4 text-[calc(1.125rem_+_4pt)] font-medium text-white shadow-sm transition-[transform,opacity] hover:bg-[#b06d4e] disabled:pointer-events-none disabled:opacity-50"
                >
                  {submitting ? "…" : isSignUp ? "Create account" : "Sign in"}
                </button>

                <p className="text-center text-[calc(0.875rem_+_4pt)] text-[#8C7B6E]">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button
                    type="button"
                    className="font-medium text-[#C17B5A] hover:text-[#b06d4e]"
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                  >
                    {isSignUp ? "Sign in" : "Sign up"}
                  </button>
                </p>
              </form>
            )}

            {tab === "magic" && !magicSent && (
              <form onSubmit={handleMagicSubmit} className="flex flex-col gap-5" noValidate>
                <div>
                  <label htmlFor={emailId} className={fieldLabel}>
                    Email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className={fieldInput}
                  />
                </div>

                {error && (
                  <p className="text-center text-[calc(0.875rem_+_4pt)] text-[#a85c4a]" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-[#C17B5A] py-4 text-[calc(1.125rem_+_4pt)] font-medium text-white shadow-sm transition-[transform,opacity] hover:bg-[#b06d4e] disabled:pointer-events-none disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send magic link"}
                </button>
              </form>
            )}

            {magicSent && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <p className="text-4xl" aria-hidden>✉️</p>
                <p className="text-[calc(1rem_+_4pt)] font-medium text-[#3d3530]">Check your inbox</p>
                <p className="text-[calc(0.95rem_+_4pt)] leading-relaxed text-[#6d625a]">
                  We sent a link to <strong>{email}</strong>. Click it to sign in.
                </p>
                <button
                  type="button"
                  className="mt-1 text-[calc(0.875rem_+_4pt)] text-[#8C7B6E] underline-offset-2 hover:underline"
                  onClick={() => { setMagicSent(false); setEmail(""); }}
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
