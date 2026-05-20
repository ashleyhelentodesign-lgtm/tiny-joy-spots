/** When set, the gallery profile invite card stays hidden across sessions. */
export const PROFILE_PROMPT_DISMISSED_COOKIE =
  "joy_spots_profile_prompt_dismissed";

const DISMISS_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export function isProfilePromptDismissed(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((part) =>
      part.trim().startsWith(`${PROFILE_PROMPT_DISMISSED_COOKIE}=1`),
    );
}

export function dismissProfilePrompt(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PROFILE_PROMPT_DISMISSED_COOKIE}=1; path=/; max-age=${DISMISS_MAX_AGE_SEC}; samesite=lax`;
}
