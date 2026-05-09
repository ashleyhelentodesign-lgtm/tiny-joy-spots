"use client";

type SiteHeaderProps = {
  onShareClick: () => void;
};

export function SiteHeader({ onShareClick }: SiteHeaderProps) {
  return (
    <header className="py-7 sm:py-9">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4">
        <div className="min-w-0" aria-hidden />
        <h1
          className="text-center font-serif font-normal italic leading-tight tracking-tight text-[#2e2824]"
          style={{ fontSize: "64px" }}
        >
          tiny joy spots
        </h1>
        <div className="flex min-w-0 justify-end">
          <button
            type="button"
            className="rounded-full bg-[#C17B5A] px-7 py-4 font-medium leading-snug text-white transition-colors hover:bg-[#b06d4e] sm:px-8"
            style={{ fontSize: "28px" }}
            onClick={onShareClick}
          >
            Share a joyspot
          </button>
        </div>
      </div>
    </header>
  );
}
