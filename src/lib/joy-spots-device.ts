/** Cookie set by POST /api/submit-joy-spot; must match DB/RLS normalization. */
export const JOY_SPOTS_DEVICE_COOKIE = "joy_spots_device_id";

export function normalizeJoySpotsDeviceId(
  raw: string | null | undefined,
): string | null {
  const t = raw?.trim().toLowerCase();
  return t || null;
}

export function parseJoySpotsDeviceCookie(
  cookieHeader: string,
): string | null {
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const prefix = `${JOY_SPOTS_DEVICE_COOKIE}=`;
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return normalizeJoySpotsDeviceId(
        decodeURIComponent(part.slice(prefix.length)),
      );
    }
  }
  return null;
}
