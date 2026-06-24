import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign-in error · Joy Spots",
};

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FAF6F0] px-6 text-center">
      <p className="mb-2 font-serif text-2xl italic text-[#2e2824]">
        Something went wrong
      </p>
      <p className="mb-8 text-[#6d625a]">
        Your sign-in link may have expired or already been used.
      </p>
      <Link
        href="/gallery"
        className="rounded-full bg-[#C17B5A] px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-[#b06d4e]"
      >
        Back to Joy Spots
      </Link>
    </div>
  );
}
