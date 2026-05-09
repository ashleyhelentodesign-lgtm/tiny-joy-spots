"use client";

import { cn } from "@/lib/utils";

export type PhotoCaptionInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/**
 * Optional caption below a selected photo. Styled for the Joy Spots journal form.
 */
export function PhotoCaptionInput({
  id,
  value,
  onChange,
  className,
}: PhotoCaptionInputProps) {
  return (
    <div className={cn("w-full max-w-xs", className)}>
      <label
        htmlFor={id}
        className="mb-2 block text-[calc(0.875rem_+_8pt)] font-normal tracking-wide text-[#8C7B6E]"
      >
        Add a caption (optional)
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="A few words beside the image…"
        autoComplete="off"
        className={cn(
          "w-full rounded-xl border border-[#c9bfb3] bg-[#FAF6F0] px-3.5 py-2.5 text-[calc(0.875rem_+_8pt)] text-[#5c4f45]",
          "placeholder:text-[#8C7B6E]",
          "outline-none transition-[border-color,box-shadow] focus:border-[#8C7B6E] focus:ring-2 focus:ring-[#C17B5A]/15",
        )}
      />
    </div>
  );
}
