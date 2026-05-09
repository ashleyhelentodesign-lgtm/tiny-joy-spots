"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { GallerySpot } from "@/components/GalleryGrid";

/**
 * Figma MCP — with photo: 8130:628; text-only: 8141:504
 * https://www.figma.com/design/5Lq5hS01irojXLMd7utVHX/Ashley-s-Personal-Documents?node-id=8130-628
 * https://www.figma.com/design/5Lq5hS01irojXLMd7utVHX/Ashley-s-Personal-Documents?node-id=8141-504
 */
const FIGMA_CARD_BG = "#ffffff";
/** Text-only: main body behind large copy (preview + dialog) */
const FIGMA_TEXT_ONLY_MAIN_BG = "#FAF6F1";
const FIGMA_TAG_BG = "#897c70";
const FIGMA_TAG_TEXT = "#f5f5f5";
const FIGMA_RADIUS = 19;

/** Divider — Figma MCP (8141:514 / 8126:571) */
const figmaDividerSrc =
  "https://www.figma.com/api/mcp/asset/974d93c4-eb35-4dc5-89cd-f3e2ee2c76b0";

function formatDetailTimestamp(iso: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function captionBody(spot: GallerySpot) {
  const cap = spot.caption?.trim();
  if (cap) return cap;
  return spot.text_content.trim();
}

type DetailTagPillProps = {
  name: string;
  interactive: boolean;
  onSelect?: () => void;
};

function DetailTagPill({ name, interactive, onSelect }: DetailTagPillProps) {
  const className = cn(
    "inline-flex shrink-0 items-center justify-center gap-1 rounded-[8px] p-2 font-sans text-[21px] leading-none",
    interactive &&
      "cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline focus-visible:ring-2 focus-visible:ring-black/20",
  );

  const style = {
    backgroundColor: FIGMA_TAG_BG,
    color: FIGMA_TAG_TEXT,
  };

  if (interactive && onSelect) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={onSelect}
      >
        {name}
      </button>
    );
  }

  return (
    <span className={className} style={style}>
      {name}
    </span>
  );
}

export function JoySpotDetailDialog({
  spot,
  open,
  onOpenChange,
  onTagClick,
  onDeleted,
}: {
  spot: GallerySpot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagClick?: (tagName: string) => void;
  onDeleted?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDeleteError(null);
    setDeleting(false);
  }, [open, spot?.id]);

  if (!open || !spot) return null;

  const hasPhoto = Boolean(spot.photo_url);
  const caption = captionBody(spot);
  /** Text-only pop-up: large 50px block (8141:524) */
  const textOnlyPrimary =
    spot.text_content.trim() || spot.caption?.trim() || "";
  const locationLine = spot.location_text.trim();
  const contributorLine = spot.contributor_name?.trim();
  const timestampLine = spot.created_at
    ? formatDetailTimestamp(spot.created_at)
    : "";

  async function handleDeletePost() {
    if (!spot?.viewer_owns_spot) return;
    if (
      !window.confirm(
        "Delete this joy spot? This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/joy-spots/${spot.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? res.statusText);
      }
      onOpenChange(false);
      onDeleted?.();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Joy spot details"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-3 sm:p-6">
        <div
          className={cn(
            "pointer-events-auto relative flex w-[35vw] max-w-[calc(100vw-2rem)] min-w-0 flex-col shadow-xl ring-1 ring-black/5",
            hasPhoto
              ? "h-[calc(75dvh*1.1)] max-h-[calc(100dvh-2rem)] min-h-0 overflow-hidden"
              : "max-h-[calc(100dvh-2rem)] overflow-hidden",
          )}
          style={{
            borderRadius: FIGMA_RADIUS,
            backgroundColor: FIGMA_CARD_BG,
          }}
          data-node-id={hasPhoto ? "8130:628" : "8141:504"}
          data-name="Post details in pop-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close — matches ShareJoySpotModal (not in Figma frame) */}
          <button
            type="button"
            className="absolute right-2 top-2 z-20 flex size-24 items-center justify-center rounded-full text-[#6d625a] transition-colors hover:bg-black/5 hover:text-[#2e2824] sm:right-3 sm:top-3"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <span
              className="text-[length:calc(1.5rem*4)] leading-none"
              aria-hidden
            >
              ×
            </span>
          </button>

          <div
            className={cn(
              "flex w-full flex-col",
              hasPhoto
                ? "min-h-0 flex-1 overflow-hidden"
                : "max-h-[calc(100dvh-6rem)] shrink-0 overflow-y-auto overscroll-contain",
            )}
          >
            {hasPhoto ? (
              <div
                className="flex min-h-0 w-full flex-1 basis-0 flex-col overflow-hidden"
                style={{
                  backgroundColor: FIGMA_CARD_BG,
                  borderTopLeftRadius: FIGMA_RADIUS,
                  borderTopRightRadius: FIGMA_RADIUS,
                }}
                data-node-id="8126:551"
              >
                <div className="box-border flex h-full min-h-0 w-full flex-1 items-center justify-center">
                  <div
                    className="relative mx-12 mb-12 mt-24 min-h-32 w-[calc(100%-96px)] max-w-[calc(100%-96px)] shrink-0 overflow-hidden h-[calc(100%-9rem)] max-h-[calc(100%-9rem)]"
                    style={{ borderRadius: FIGMA_RADIUS }}
                  >
                    <Image
                      src={spot.photo_url!}
                      alt={caption ? caption : "Joy spot photo"}
                      fill
                      className="object-contain"
                      sizes="calc(35vw - 96px)"
                      priority
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="flex w-full shrink-0 flex-col rounded-t-[19px] p-9"
                style={{ backgroundColor: FIGMA_TEXT_ONLY_MAIN_BG }}
                data-node-id="8141:528"
              >
                {textOnlyPrimary ? (
                  <p
                    className="w-full min-w-0 whitespace-pre-wrap break-words text-[50px] font-normal leading-normal text-black"
                    data-node-id="8141:524"
                  >
                    {textOnlyPrimary}
                  </p>
                ) : null}
              </div>
            )}

            <div
              className={cn(
                "flex w-full shrink-0 flex-col overscroll-contain px-9 pb-9 pt-3.5",
                hasPhoto
                  ? "max-h-[min(42dvh,48%)] min-h-0 overflow-y-auto"
                  : "min-h-0",
              )}
              data-node-id={hasPhoto ? "8130:642" : "8141:506"}
            >
            {(contributorLine ||
              spot.viewer_owns_spot ||
              (hasPhoto && caption)) ? (
              <div className="mb-1.5 flex shrink-0 flex-col gap-0">
                {contributorLine || spot.viewer_owns_spot ? (
                  <div
                    className="flex w-full shrink-0 items-start justify-between gap-3"
                    data-node-id={hasPhoto ? "8130:615" : "8141:507"}
                  >
                    <div className="min-h-0 min-w-0 flex-1">
                      {contributorLine ? (
                        <p
                          className="m-0 h-fit min-h-0 text-[31px] font-bold leading-none text-black"
                          data-node-id={hasPhoto ? "8126:553" : "8141:508"}
                        >
                          {contributorLine}
                        </p>
                      ) : null}
                    </div>
                    {spot.viewer_owns_spot ? (
                      <div className="flex shrink-0 flex-col items-end gap-1 self-center">
                        {deleteError ? (
                          <p className="max-w-[min(100%,16rem)] text-right text-[19px] leading-snug text-red-700">
                            {deleteError}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-transparent px-3 py-2 text-[22px] font-medium text-red-800 transition-colors hover:bg-red-50 disabled:opacity-50"
                          disabled={deleting}
                          onClick={() => void handleDeletePost()}
                        >
                          <Trash2
                            className="size-[26px] shrink-0"
                            strokeWidth={2}
                            aria-hidden
                          />
                          {deleting ? "Deleting…" : "Delete my post"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {hasPhoto && caption ? (
                  <p
                    className="m-0 mt-1.5 h-fit min-h-0 w-full min-w-0 text-[31px] font-normal leading-normal text-black"
                    data-node-id="8126:555"
                  >
                    {caption}
                  </p>
                ) : null}
              </div>
            ) : null}

            {spot.tags.length > 0 ? (
              <div
                className="mb-[1.2rem] flex shrink-0 flex-wrap items-center gap-2"
                data-node-id={hasPhoto ? "8130:641" : "8141:510"}
              >
                {spot.tags.map((t) => (
                  <DetailTagPill
                    key={t.id}
                    name={t.name}
                    interactive={Boolean(onTagClick)}
                    onSelect={
                      onTagClick ? () => onTagClick(t.name) : undefined
                    }
                  />
                ))}
              </div>
            ) : null}

            {/* 8126:571 — divider */}
            <div
              className="relative h-0 w-full shrink-0"
              data-node-id={hasPhoto ? "8126:571" : "8141:514"}
            >
              <div className="absolute inset-[-1px_0_0_0]">
                {/* Figma-exported divider; keep <img> for MCP asset URL */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="block size-full max-w-none"
                  src={figmaDividerSrc}
                />
              </div>
            </div>

            {/* 8140:502 — location left, timestamp right, 24px */}
            {locationLine || timestampLine ? (
              <div
                className="mt-4 flex w-full shrink-0 items-start justify-between gap-4 text-[24px] font-normal leading-normal text-black"
                data-node-id={hasPhoto ? "8140:502" : "8141:515"}
              >
                <div className="min-w-0 flex-1">
                  {locationLine ? (
                    <p
                      className="lowercase"
                      data-node-id={hasPhoto ? "8140:500" : "8141:516"}
                    >
                      {locationLine.toLowerCase()}
                    </p>
                  ) : null}
                </div>
                {timestampLine ? (
                  <p
                    className="relative shrink-0 whitespace-nowrap text-right"
                    data-node-id={hasPhoto ? "8126:552" : "8141:517"}
                  >
                    {timestampLine}
                  </p>
                ) : null}
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
