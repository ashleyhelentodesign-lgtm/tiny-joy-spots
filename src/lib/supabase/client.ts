import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Matches RLS: same normalization as `request_device_id()` in the database. */
export function createClientWithDevice(deviceId: string) {
  const normalized = deviceId.trim().toLowerCase();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          "x-device-id": normalized,
        },
      },
    },
  );
}
