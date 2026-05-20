import type { PostgrestError } from "@supabase/supabase-js";

/** Logs gallery joy_spots query failures to the server console in development. */
export function logGalleryFetchError(
  error: PostgrestError | null,
  context?: { configMissing?: boolean },
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (context?.configMissing) {
    console.error(
      "[Gallery] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — gallery query skipped.",
    );
    return;
  }

  if (!error) {
    return;
  }

  console.error("[Gallery] joy_spots fetch failed:", {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

export function formatGalleryFetchDevMessage(
  error: PostgrestError | null,
  context?: { configMissing?: boolean },
): { message: string; details: string | null } {
  if (context?.configMissing) {
    return {
      message:
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      details: null,
    };
  }

  if (!error) {
    return { message: "Unknown fetch error", details: null };
  }

  const parts = [
    error.code ? `code: ${error.code}` : null,
    error.details ? `details: ${error.details}` : null,
    error.hint ? `hint: ${error.hint}` : null,
  ].filter(Boolean);

  return {
    message: error.message,
    details: parts.length > 0 ? parts.join(" · ") : null,
  };
}
