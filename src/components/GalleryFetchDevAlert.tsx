type GalleryFetchDevAlertProps = {
  message: string;
  details?: string | null;
};

/** Visible in development when the gallery Supabase query fails. */
export function GalleryFetchDevAlert({
  message,
  details,
}: GalleryFetchDevAlertProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div
      role="alert"
      className="mx-[72px] mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-950"
    >
      <p className="text-sm font-semibold">Gallery fetch failed (development)</p>
      <p className="mt-1 font-mono text-xs leading-relaxed">{message}</p>
      {details ? (
        <p className="mt-2 font-mono text-xs leading-relaxed text-red-800">
          {details}
        </p>
      ) : null}
    </div>
  );
}
