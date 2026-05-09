function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 6h16v12H4V6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M4 7l8 6 8-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const iconLinkClass =
  "inline-flex size-[72px] shrink-0 items-center justify-center rounded-md text-[#2e2824] transition-colors hover:text-[#C17B5A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C17B5A]";

export function SiteFooter() {
  return (
    <footer
      className="mt-auto w-full shrink-0 border-t border-[#e3d9ce] bg-[#FAF6F0]"
      role="contentinfo"
    >
      <div className="w-full py-2 sm:py-3">
        <div className="flex w-full flex-col gap-2 px-[144px]">
          <p className="m-0 text-[clamp(2.025rem,4.5vw,2.475rem)] font-bold leading-tight text-black">
            tiny joy spots
          </p>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-wrap items-center gap-6">
              <span className="text-[27px] font-normal leading-snug text-black sm:text-[28.8px]">
                Drop me a note, question, or feedback!
              </span>
              <a
                href="https://www.instagram.com/ashs.tiny.corner/"
                target="_blank"
                rel="noopener noreferrer"
                className={iconLinkClass}
                aria-label="Ashley on Instagram (opens in a new tab)"
              >
                <InstagramIcon className="size-[36px]" />
              </a>
              <a
                href="mailto:ashleyhelento.design@gmail.com"
                className={iconLinkClass}
                aria-label="Email Ashley"
              >
                <EmailIcon className="size-[36px]" />
              </a>
            </div>
            <p className="m-0 w-full shrink-0 text-right text-[27px] font-normal leading-snug text-black sm:w-auto sm:text-[28.8px]">
              Made with joy by ashley to ✨
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
