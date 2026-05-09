"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Type, X } from "lucide-react";

import { PhotoCaptionInput } from "@/components/PhotoUpload";
import { cn } from "@/lib/utils";

export type PhotoUploadDropzoneProps = {
  className?: string;
  /** Tighter layout for dialogs / side columns */
  compact?: boolean;
  /** Parent renders caption field; hide inline caption under the preview. */
  suppressInlineCaption?: boolean;
  onFileChange?: (file: File | null) => void;
  onTextChange?: (text: string) => void;
  onCaptionChange?: (caption: string) => void;
  onModeChange?: (textOnly: boolean) => void;
};

export function PhotoUploadDropzone({
  className,
  compact = false,
  suppressInlineCaption = false,
  onFileChange,
  onTextChange,
  onCaptionChange,
  onModeChange,
}: PhotoUploadDropzoneProps) {
  const captionFieldId = useId();
  const [textOnly, setTextOnly] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");

  const syncCaption = useCallback(
    (next: string) => {
      setCaption(next);
      onCaptionChange?.(next);
    },
    [onCaptionChange],
  );

  const syncFile = useCallback(
    (next: File | null) => {
      setFile(next);
      onFileChange?.(next);
      if (!next) {
        setCaption("");
        onCaptionChange?.("");
      }
    },
    [onFileChange, onCaptionChange],
  );

  const syncText = useCallback(
    (next: string) => {
      setText(next);
      onTextChange?.(next);
    },
    [onTextChange],
  );

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const next = accepted[0];
      if (next) syncFile(next);
    },
    [syncFile],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: textOnly,
    noClick: !!file,
    noKeyboard: !!file,
  });

  const setPhotoMode = () => {
    setTextOnly(false);
    onModeChange?.(false);
  };

  const setTextOnlyMode = () => {
    setTextOnly(true);
    syncFile(null);
    onModeChange?.(true);
  };

  return (
    <div
      className={cn(
        "flex w-full max-w-lg flex-col rounded-2xl border border-[#e8d4c4] bg-[#fff9f2] shadow-sm",
        compact ? "h-full min-h-0 max-w-none p-3" : "p-5",
        "text-[#3d2b26]",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 rounded-xl bg-[#faf3e8] p-1 ring-1 ring-[#e8d4c4]/80",
          compact ? "mb-2" : "mb-4",
        )}
      >
        <button
          type="button"
          aria-pressed={!textOnly}
          onClick={setPhotoMode}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[calc(0.875rem_+_4pt)] font-medium transition-colors",
            !textOnly
              ? "bg-[#C17B5A] text-[#fff9f2] shadow-sm"
              : "text-[#6b4f45] hover:bg-[#f0e4d4]",
          )}
        >
          <ImagePlus className="size-[1.875rem] shrink-0 opacity-90" aria-hidden />
          Photo
        </button>
        <button
          type="button"
          aria-pressed={textOnly}
          onClick={setTextOnlyMode}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[calc(0.875rem_+_4pt)] font-medium transition-colors",
            textOnly
              ? "bg-[#C17B5A] text-[#fff9f2] shadow-sm"
              : "text-[#6b4f45] hover:bg-[#f0e4d4]",
          )}
        >
          <Type className="size-[1.875rem] shrink-0 opacity-90" aria-hidden />
          Text only
        </button>
      </div>

      <div
        className={cn(
          "flex min-h-0 w-full flex-col",
          compact ? "min-h-0 flex-1" : "min-h-[140px]",
        )}
      >
      {!textOnly ? (
        <div
          className={cn(
            compact ? "flex min-h-0 flex-1 flex-col space-y-2" : "space-y-4",
          )}
        >
          <div
            {...getRootProps({
              className: cn(
                "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 transition-colors",
                compact
                  ? "min-h-[50px] flex-1 py-4 sm:min-h-[60px] sm:py-5"
                  : "min-h-[140px] px-4 py-8",
                isDragActive
                  ? "border-[#C17B5A] bg-[#f5ebe4]"
                  : "border-[#d4b8a5] bg-[#faf5eb] hover:border-[#C17B5A]/70 hover:bg-[#fff5ef]",
              ),
            })}
          >
            <input {...getInputProps()} />
            {!file && (
              <>
                <div
                  className={cn(
                    "mb-2 flex items-center justify-center rounded-full bg-[#f0dcc8] text-[#b54a32]",
                    compact ? "size-10" : "mb-3 size-14",
                  )}
                >
                  <ImagePlus
                    className={compact ? "size-5" : "size-7"}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </div>
                <p
                  className={cn(
                    "text-center font-medium text-[#5c4033]",
                    compact
                      ? "text-[calc(0.75rem_+_4pt)]"
                      : "text-[calc(0.875rem_+_4pt)]",
                  )}
                >
                  {isDragActive
                    ? "Drop your photo here"
                    : "Drag & drop a photo, or click to browse"}
                </p>
                <p
                  className={cn(
                    "text-center text-[#8b7268]",
                    compact
                      ? "mt-0.5 text-[calc(0.65rem_+_4pt)]"
                      : "mt-1 text-[calc(0.75rem_+_4pt)]",
                  )}
                >
                  PNG, JPG, WebP — one image
                </p>
              </>
            )}
            {file && previewUrl && (
              <div
                className={cn(
                  "flex w-full flex-col items-center",
                  compact ? "gap-2" : "gap-4",
                )}
              >
                <Image
                  src={previewUrl}
                  alt={file.name ? `Preview: ${file.name}` : "Selected photo preview"}
                  width={320}
                  height={224}
                  unoptimized
                  className={cn(
                    "w-full max-w-xs rounded-lg border border-[#e8d4c4] object-contain shadow-sm",
                    compact
                      ? "max-h-[min(22vh,9rem)]"
                      : "max-h-56",
                  )}
                />
                <p className="truncate text-center text-[calc(0.75rem_+_4pt)] text-[#8b7268]">
                  {file.name}
                </p>
                <p className="text-center text-[calc(0.75rem_+_4pt)] text-[#8b7268]">
                  Drop another image to replace
                </p>
              </div>
            )}
          </div>

          {file && previewUrl && !suppressInlineCaption && (
            <PhotoCaptionInput
              id={captionFieldId}
              value={caption}
              onChange={syncCaption}
              className="mx-auto"
            />
          )}

          {file && (
            <div
              className={cn(
                "flex flex-wrap justify-center",
                compact ? "gap-1.5" : "gap-2",
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                className={cn(
                  "rounded-lg border border-[#d4b8a5] bg-[#faf5eb] font-medium text-[#5c4033] transition-colors hover:border-[#C17B5A]/50 hover:bg-[#fff9f2]",
                  compact
                    ? "px-2.5 py-1.5 text-[calc(0.75rem_+_4pt)]"
                    : "px-4 py-2 text-[calc(0.875rem_+_4pt)]",
                )}
              >
                Choose different photo
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  syncFile(null);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-[#fdeee8] font-medium text-[#a34a38] transition-colors hover:bg-[#f8ddd4]",
                  compact
                    ? "px-2.5 py-1.5 text-[calc(0.75rem_+_4pt)]"
                    : "px-4 py-2 text-[calc(0.875rem_+_4pt)]",
                )}
              >
                <X className="size-4" aria-hidden />
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            compact && "flex min-h-0 flex-1 flex-col",
          )}
        >
          <label htmlFor="joy-spot-text-only" className="sr-only">
            Your joy spot (text only)
          </label>
          <textarea
            id="joy-spot-text-only"
            value={text}
            onChange={(e) => syncText(e.target.value)}
            rows={compact ? 4 : 1}
            placeholder="Describe your joy spot in words…"
            className={cn(
              "w-full resize-y rounded-xl border border-[#e8d4c4] bg-[#faf5eb] px-4 text-[calc(0.875rem_+_4pt)] leading-relaxed text-[#3d2b26]",
              "placeholder:text-[#a8988e]",
              "outline-none ring-[#C17B5A]/40 focus:border-[#C17B5A] focus:ring-2",
              compact
                ? "min-h-[50px] flex-1 py-4 sm:min-h-[60px] sm:py-5"
                : "min-h-[140px] py-8",
            )}
          />
        </div>
      )}
      </div>
    </div>
  );
}
