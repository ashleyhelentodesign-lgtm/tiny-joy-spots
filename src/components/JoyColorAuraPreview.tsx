import { cn } from "@/lib/utils";

type JoyColorAuraPreviewProps = {
  size?: "sm" | "md";
  className?: string;
};

const sizeClass = {
  sm: "size-24",
  md: "size-28",
} as const;

/** Soft diffused Joy Color preview before profile save. */
export function JoyColorAuraPreview({
  size = "md",
  className,
}: JoyColorAuraPreviewProps) {
  return (
    <div
      className={cn("joy-color-aura", sizeClass[size], className)}
      role="img"
      aria-label="Preview of your shifting Joy Color"
    >
      <span className="joy-color-aura__ripple joy-color-aura__ripple--3" aria-hidden />
      <span className="joy-color-aura__ripple joy-color-aura__ripple--2" aria-hidden />
      <span className="joy-color-aura__ripple joy-color-aura__ripple--1" aria-hidden />
      <span className="joy-color-aura__bloom joy-color-aura__bloom--sage" aria-hidden />
      <span className="joy-color-aura__bloom joy-color-aura__bloom--rose" aria-hidden />
      <span className="joy-color-aura__bloom joy-color-aura__bloom--warm" aria-hidden />
    </div>
  );
}
