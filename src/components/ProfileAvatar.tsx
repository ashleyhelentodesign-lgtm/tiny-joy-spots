import { cn } from "@/lib/utils";

type ProfileAvatarProps = {
  color: string;
  displayName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Overrides preset initial size when the avatar is scaled (e.g. header). */
  initialFontSizePx?: number;
};

const sizeClass = {
  sm: "size-12",
  md: "size-20",
  lg: "size-28",
} as const;

export function ProfileAvatar({
  color,
  displayName,
  size = "md",
  className,
  initialFontSizePx,
}: ProfileAvatarProps) {
  const initial = displayName?.trim().charAt(0).toUpperCase() || "";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-serif text-white shadow-inner shadow-black/10",
        sizeClass[size],
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden={!displayName}
    >
      {initial ? (
        <span
          className={cn(
            "font-normal italic leading-none",
            initialFontSizePx == null &&
              (size === "lg"
                ? "text-[2rem]"
                : size === "md"
                  ? "text-[1.35rem]"
                  : "text-[1rem]"),
          )}
          style={
            initialFontSizePx != null
              ? { fontSize: `${initialFontSizePx}px` }
              : undefined
          }
        >
          {initial}
        </span>
      ) : null}
    </span>
  );
}
