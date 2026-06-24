/**
 * Optional per-device profile (no auth). Rows live in `public.profiles`.
 * `avatar_color` is assigned by the database on insert — do not send from clients.
 */

/** Matches `public.profile_avatar_palette()` in the database. */
export const PROFILE_AVATAR_PALETTE = [
  "#C17B5A",
  "#897c70",
  "#8B7E74",
  "#7A9E87",
  "#b06d4e",
  "#a89b8f",
  "#6d625a",
  "#a34a38",
] as const;

export type ProfileAvatarPaletteColor =
  (typeof PROFILE_AVATAR_PALETTE)[number];

export const PROFILE_BIO_MAX_LENGTH = 160;

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export type Profile = {
  id: string;
  user_id: string;
  device_id: string | null;
  display_name: string;
  bio: string | null;
  avatar_color: string;
  created_at: string;
};

/** Fields clients may supply when creating a profile. */
export type ProfileInsert = {
  display_name: string;
  bio?: string | null;
};

/** Fields clients may supply when updating a profile (`avatar_color` is insert-only). */
export type ProfileUpdate = {
  display_name?: string;
  bio?: string | null;
};

export function isProfileHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

export function isProfileAvatarPaletteColor(
  value: string,
): value is ProfileAvatarPaletteColor {
  return (PROFILE_AVATAR_PALETTE as readonly string[]).includes(value);
}

export function normalizeProfileDisplayName(raw: string): string {
  return raw.trim();
}

export function normalizeProfileBio(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function validateProfileInsert(
  input: ProfileInsert,
): { ok: true } | { ok: false; error: string } {
  const displayName = normalizeProfileDisplayName(input.display_name);
  if (!displayName) {
    return { ok: false, error: "Display name is required." };
  }

  const bio = normalizeProfileBio(input.bio);
  if (bio != null && bio.length > PROFILE_BIO_MAX_LENGTH) {
    return {
      ok: false,
      error: `Bio must be at most ${PROFILE_BIO_MAX_LENGTH} characters.`,
    };
  }

  return { ok: true };
}

export function mapProfileRow(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    device_id: row.device_id != null ? String(row.device_id) : null,
    display_name: String(row.display_name ?? ""),
    bio: row.bio != null ? String(row.bio) : null,
    avatar_color: String(row.avatar_color ?? ""),
    created_at: String(row.created_at ?? ""),
  };
}
