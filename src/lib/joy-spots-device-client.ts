import {
  JOY_SPOTS_DEVICE_COOKIE,
  normalizeJoySpotsDeviceId,
  parseJoySpotsDeviceCookie,
} from "@/lib/joy-spots-device";

export function getJoySpotsDeviceIdClient(): string | null {
  if (typeof document === "undefined") return null;
  return parseJoySpotsDeviceCookie(document.cookie);
}

export { JOY_SPOTS_DEVICE_COOKIE, normalizeJoySpotsDeviceId };
