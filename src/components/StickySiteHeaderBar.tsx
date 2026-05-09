"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

import { cn } from "@/lib/utils";

type StickySiteHeaderBarProps = {
  children: React.ReactNode;
  className?: string;
  /**
   * When set, scroll position is read from this element (e.g. a parent with overflow-auto).
   * Otherwise `window` scroll is used.
   */
  scrollContainerRef?: RefObject<HTMLElement | null>;
};

export function StickySiteHeaderBar({
  children,
  className,
  scrollContainerRef,
}: StickySiteHeaderBarProps) {
  const [elevated, setElevated] = useState(false);

  useLayoutEffect(() => {
    const read = () => {
      const el = scrollContainerRef?.current;
      if (el) {
        setElevated(el.scrollTop > 4 || el.scrollLeft > 4);
        return;
      }
      if (!scrollContainerRef) {
        setElevated(
          window.scrollY > 4 ||
            document.documentElement.scrollTop > 4 ||
            document.body.scrollTop > 4,
        );
      }
    };

    read();

    if (scrollContainerRef) {
      const el = scrollContainerRef.current;
      if (!el) return;
      el.addEventListener("scroll", read, { passive: true });
      return () => el.removeEventListener("scroll", read);
    }

    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, [scrollContainerRef]);

  return (
    <div
      className={cn(
        "sticky top-0 z-40 border-b border-transparent bg-transparent px-[72px] transition-colors duration-200",
        elevated && "bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
