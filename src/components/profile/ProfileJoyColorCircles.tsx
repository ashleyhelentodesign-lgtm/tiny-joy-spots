"use client";

import type { DominantColorCount } from "@/lib/dominant-color";
import { cn } from "@/lib/utils";

type ProfileJoyColorCirclesProps = {
  colors: DominantColorCount[];
  className?: string;
};

const MIN_DIAMETER = 56;
const MAX_DIAMETER = 160;

export function ProfileJoyColorCircles({
  colors,
  className,
}: ProfileJoyColorCirclesProps) {
  if (colors.length === 0) {
    return (
      <p className="m-0 font-sans text-[24px] font-normal leading-[1.2] text-[#8C7B6E]">
        Share photo joy spots to see your colors gather here.
      </p>
    );
  }

  const maxCount = Math.max(...colors.map((c) => c.count));

  return (
    <div
      className={cn(
        "relative flex min-h-[280px] w-full max-w-[378px] flex-wrap items-end justify-start gap-4",
        className,
      )}
      role="img"
      aria-label="The colors of your joy"
    >
      {colors.map(({ hex, count }) => {
        const scale = maxCount > 0 ? count / maxCount : 1;
        const size =
          MIN_DIAMETER + scale * (MAX_DIAMETER - MIN_DIAMETER);
        return (
          <span
            key={hex}
            className="shrink-0 rounded-full shadow-sm"
            style={{
              width: size,
              height: size,
              backgroundColor: hex,
            }}
            title={`${hex} · ${count} ${count === 1 ? "spot" : "spots"}`}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
