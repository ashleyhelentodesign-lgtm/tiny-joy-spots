/**
 * Joy spot row shape and display helpers (maps to `public.joy_spots`).
 */

export type JoySpotProfileRef = {
  display_name: string;
};

export type JoySpot = {
  id: string;
  photo_url: string | null;
  text_content: string;
  contributor_name: string | null;
  caption: string | null;
  location_text: string;
  date: string;
  created_at: string;
  device_id: string;
  profile_id: string | null;
  mood?: string | null;
  dominant_color?: string | null;
  extracted_colors?: Array<{
    hex: string;
    h: number;
    s: number;
    l: number;
    weight: number;
  }> | null;
};

/**
 * Gallery byline: anonymous posts stay anonymous; named posts with a profile
 * use the profile display name (not a stale manual contributor_name).
 */
export function resolveContributorDisplayName(
  contributorName: string | null | undefined,
  profileId: string | null | undefined,
  profile: JoySpotProfileRef | null | undefined,
): string | null {
  if (!contributorName?.trim()) {
    return null;
  }
  if (profileId && profile?.display_name?.trim()) {
    return profile.display_name.trim();
  }
  return contributorName.trim();
}

export function parseJoySpotProfileRef(
  row: Record<string, unknown>,
): JoySpotProfileRef | null {
  const nested = row.profiles;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const name = (nested as { display_name?: string }).display_name;
    if (typeof name === "string" && name.trim()) {
      return { display_name: name.trim() };
    }
  }
  return null;
}
