"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

import { ExplorerSearchBar } from "@/components/ExplorerSearchBar";
import { JoySpotDetailDialog } from "@/components/JoySpotDetailDialog";
import {
  addTagChipIfNew,
  type ExplorerChip,
  matchesExplorerChips,
} from "@/lib/explorer-filters";
import { cn } from "@/lib/utils";

export type GalleryTag = { id: string; name: string };

export type GallerySpot = {
  id: string;
  photo_url: string | null;
  text_content: string;
  contributor_name: string | null;
  caption: string | null;
  location_text: string;
  date: string;
  created_at: string;
  tags: GalleryTag[];
  /** True when this browser’s joy_spots_device_id cookie matches the row’s device_id. */
  viewer_owns_spot: boolean;
};

type GalleryGridProps = {
  spots: GallerySpot[];
  className?: string;
};

/** Matches Tailwind `sm`/`md`/`lg`/`xl` widths for predictable layout + image hints. */
function getGalleryColumnCount(): 1 | 2 | 4 | 5 {
  if (typeof window === "undefined") return 1;
  if (window.matchMedia("(min-width: 1280px)").matches) return 5;
  if (window.matchMedia("(min-width: 1024px)").matches) return 4;
  if (window.matchMedia("(min-width: 768px)").matches) return 2;
  return 1;
}

function subscribeGalleryColumnCount(onStoreChange: () => void) {
  const mqXl = window.matchMedia("(min-width: 1280px)");
  const mqLg = window.matchMedia("(min-width: 1024px)");
  const mqMd = window.matchMedia("(min-width: 768px)");
  const on = () => onStoreChange();
  mqXl.addEventListener("change", on);
  mqLg.addEventListener("change", on);
  mqMd.addEventListener("change", on);
  return () => {
    mqXl.removeEventListener("change", on);
    mqLg.removeEventListener("change", on);
    mqMd.removeEventListener("change", on);
  };
}

function useGalleryColumnCount(): 1 | 2 | 4 | 5 {
  return useSyncExternalStore(
    subscribeGalleryColumnCount,
    getGalleryColumnCount,
    () => 1,
  );
}

function partitionIntoColumns<T>(items: T[], columnCount: number): T[][] {
  const cols: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, i) => {
    cols[i % columnCount]!.push(item);
  });
  return cols;
}

/** copy block (byline + caption) → tags — 6px */
const PREVIEW_META_GAP = "gap-1.5";
/** byline → caption: use mt on caption (matches footer pt-3.5 / photo gap), not flex gap */
const PREVIEW_TITLE_INNER = "flex w-full flex-col gap-0";

type PreviewBottomProps = {
  spot: GallerySpot;
  showCaption: boolean;
  captionText: string;
  onTagClick: (name: string) => void;
};

function GalleryPreviewBottom({
  spot,
  showCaption,
  captionText,
  onTagClick,
}: PreviewBottomProps) {
  return (
    <div
      className={cn("flex flex-col px-4 pb-9 pt-3.5 font-sans", PREVIEW_META_GAP)}
      data-node-id="8141:532"
    >
      <div
        className={cn(PREVIEW_TITLE_INNER)}
        data-node-id="8141:550"
      >
        <div
          className="flex w-full items-start justify-between"
          data-node-id="8141:533"
        >
          <p
            className="m-0 h-fit min-h-0 min-w-0 shrink-0 text-[31px] font-bold leading-none text-black"
            data-node-id="8141:534"
          >
            {spot.contributor_name?.trim()
              ? spot.contributor_name.trim()
              : "Anonymous"}
          </p>
        </div>
        {showCaption && captionText ? (
          <p
            className="m-0 mt-1.5 h-fit min-h-0 w-full min-w-0 shrink-0 text-[31px] font-normal leading-normal text-black"
            data-node-id="8141:535"
          >
            <span className="line-clamp-6">{captionText}</span>
          </p>
        ) : null}
      </div>

      {spot.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2" data-node-id="8141:536">
          {spot.tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              data-name="Tag"
              className="inline-flex max-w-full min-w-0 shrink-0 items-center justify-center gap-1 rounded-[8px] bg-[#897c70] px-2 py-2 text-[21px] font-normal leading-none text-[#f5f5f5] transition-opacity hover:opacity-90"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag.name);
              }}
            >
              <span className="min-w-0 truncate">{tag.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function GalleryGrid({ spots, className }: GalleryGridProps) {
  const router = useRouter();
  const columnCount = useGalleryColumnCount();
  const [explorerChips, setExplorerChips] = useState<ExplorerChip[]>([]);
  const [detailSpot, setDetailSpot] = useState<GallerySpot | null>(null);
  const detailOpen = detailSpot != null;

  const onTagFilter = (name: string) => {
    setExplorerChips((prev) => addTagChipIfNew(prev, name));
  };

  const filtered = useMemo(() => {
    return spots.filter((spot) =>
      matchesExplorerChips(spot, explorerChips),
    );
  }, [spots, explorerChips]);

  const columns = useMemo(
    () => partitionIntoColumns(filtered, columnCount),
    [filtered, columnCount],
  );

  return (
    <div className={cn("w-full pb-20", className)}>
      <JoySpotDetailDialog
        spot={detailSpot}
        open={detailOpen}
        onOpenChange={(next) => {
          if (!next) setDetailSpot(null);
        }}
        onTagClick={(name) => {
          onTagFilter(name);
          setDetailSpot(null);
        }}
        onDeleted={() => {
          setDetailSpot(null);
          router.refresh();
        }}
      />
      <div className="w-full">
        <ExplorerSearchBar
          spots={spots}
          chips={explorerChips}
          onChipsChange={setExplorerChips}
        />

        {filtered.length === 0 ? (
          <p
            className="py-16 text-center leading-relaxed text-[#3d3530]"
            style={{ fontSize: "16px" }}
          >
            No joy spots match your search yet.
          </p>
        ) : (
          <section className="flex w-full gap-6" aria-label="Joy spots">
            {columns.map((colSpots, colIndex) => (
              <div
                key={colIndex}
                className="flex min-w-0 flex-1 flex-col gap-6"
              >
                {colSpots.map((spot) => {
                  const hasPhoto = Boolean(spot.photo_url);
                  const blurb =
                    spot.caption?.trim() || spot.text_content.trim() || "";
                  const textOnlyPrimary =
                    spot.text_content.trim() || spot.caption?.trim() || "";

                  return (
                    <article key={spot.id} className="min-w-0">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailSpot(spot)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDetailSpot(spot);
                          }
                        }}
                        aria-label="Open joy spot details"
                        data-node-id={hasPhoto ? "8141:530" : "8141:551"}
                        data-name="Preview of post"
                        className="group flex w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[19px] bg-white text-left transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C17B5A]"
                      >
                        {hasPhoto ? (
                          <div
                            className="w-full shrink-0 overflow-hidden rounded-[19px] bg-[#d9d9d9]"
                            data-node-id="8141:531"
                          >
                            <Image
                              src={spot.photo_url!}
                              alt={blurb || "Joy spot"}
                              width={0}
                              height={0}
                              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 25vw, 20vw"
                              unoptimized
                              className="block h-auto w-full rounded-[19px]"
                              style={{ width: "100%", height: "auto" }}
                            />
                          </div>
                        ) : (
                          /* Text-only preview — Figma 8141:551 (aligns w/ detail 8141:528 / 8141:524) */
                          <div
                            className="flex w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-t-[19px] bg-[#FAF6F1] p-4 font-sans"
                            data-node-id="8141:551"
                          >
                            {textOnlyPrimary ? (
                              <p
                                className="h-fit min-h-0 w-full min-w-0 shrink-0 text-left text-[clamp(1.375rem,4.5vw,3.125rem)] font-normal leading-normal text-black"
                                data-node-id="8141:524"
                              >
                                <span className="line-clamp-[10]">
                                  {textOnlyPrimary}
                                </span>
                              </p>
                            ) : (
                              <p className="text-sm text-black/50">—</p>
                            )}
                          </div>
                        )}

                        <GalleryPreviewBottom
                          spot={spot}
                          showCaption={hasPhoto && Boolean(blurb)}
                          captionText={blurb}
                          onTagClick={onTagFilter}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
