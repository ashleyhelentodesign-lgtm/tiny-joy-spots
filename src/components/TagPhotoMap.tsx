"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { JoySpotDetailDialog } from "@/components/JoySpotDetailDialog";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { GallerySpot } from "@/components/GalleryGrid";
import { ExplorerSearchBar } from "@/components/ExplorerSearchBar";
import { JoyFloatingNav } from "@/components/JoyFloatingNav";
import { ShareJoySpotModal } from "@/components/ShareJoySpotModal";
import { SiteHeader } from "@/components/SiteHeader";
import { StickySiteHeaderBar } from "@/components/StickySiteHeaderBar";
import {
  addTagChipIfNew,
  type ExplorerChip,
  matchesExplorerChips,
} from "@/lib/explorer-filters";
import { cn } from "@/lib/utils";

const PHOTO_SIZE = 150;
const PHOTO_HALF = PHOTO_SIZE / 2;
const PADDING = 100;
/** Small inset so graph content starts near the visible top-left (not thousands of px away). */
const CONTENT_INSET = 80;
/** Extra space beyond the graph bbox so the map feels like an infinite canvas. */
const SCROLL_PAD = 12000;
/** Minimum canvas size (px) — large floor so panning always has vast empty space. */
const MIN_CANVAS_W = 16000;
const MIN_CANVAS_H = 14000;
const GOLDEN_ANGLE = 2.39996322972865332;
/** Photos must stay at least this far apart when separation applies. */
const PHOTO_GAP = 14;
const PHOTO_MIN_SEP = PHOTO_SIZE + PHOTO_GAP;
const PHOTO_TAG_MARGIN = 10;
const CROWDED_TAG_THRESHOLD = 6;

/** ~24px label: approximate pill size for layout & collision. */
function tagPillMetrics(name: string) {
  const w = Math.min(360, Math.max(70, name.length * 17 + 48));
  const h = 44;
  return { w, h, hw: w / 2, hh: h / 2 };
}

type Point = { x: number; y: number };

type LayoutEdge = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type LayoutResult = {
  width: number;
  height: number;
  /** Axis-aligned bounds of all nodes (shifted coordinates), for scrolling / re-center. */
  contentBounds: { minX: number; minY: number; maxX: number; maxY: number };
  edges: LayoutEdge[];
  tags: { id: string; name: string; x: number; y: number }[];
  photos: {
    id: string;
    x: number;
    y: number;
    spot: GallerySpot;
  }[];
};

function pairNeedsPhotoSeparation(
  a: GallerySpot,
  b: GallerySpot,
  tagPhotoCount: Map<string, number>,
): boolean {
  const idsA = new Set(a.tags.map((t) => t.id));
  let shared = false;
  for (const t of b.tags) {
    if (!idsA.has(t.id)) continue;
    shared = true;
    const c = tagPhotoCount.get(t.id) ?? 0;
    if (c <= CROWDED_TAG_THRESHOLD) return true;
  }
  if (!shared) return true;
  return false;
}

function relaxPhotoAndTagPositions(
  photoPos: Map<string, Point>,
  spotIds: string[],
  spotById: Map<string, GallerySpot>,
  tagPos: Map<string, Point>,
  tagPhotoCount: Map<string, number>,
  tagMetrics: Map<string, ReturnType<typeof tagPillMetrics>>,
  iterations: number,
) {
  for (let iter = 0; iter < iterations; iter++) {
    const deltas = new Map<string, Point>();
    for (const id of spotIds) {
      deltas.set(id, { x: 0, y: 0 });
    }

    for (let i = 0; i < spotIds.length; i++) {
      for (let j = i + 1; j < spotIds.length; j++) {
        const idA = spotIds[i];
        const idB = spotIds[j];
        const spotA = spotById.get(idA)!;
        const spotB = spotById.get(idB)!;
        if (!pairNeedsPhotoSeparation(spotA, spotB, tagPhotoCount)) continue;

        const a = photoPos.get(idA)!;
        const b = photoPos.get(idB)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const overlap = Math.max(0, PHOTO_MIN_SEP - dist);
        if (overlap <= 0) continue;
        const ux = dx / dist;
        const uy = dy / dist;
        const push = overlap * 0.42;
        const da = deltas.get(idA)!;
        const db = deltas.get(idB)!;
        da.x -= ux * push;
        da.y -= uy * push;
        db.x += ux * push;
        db.y += uy * push;
      }
    }

    for (const id of spotIds) {
      const spot = spotById.get(id)!;
      const p = photoPos.get(id)!;
      const d = deltas.get(id)!;
      let x = p.x + d.x;
      let y = p.y + d.y;

      for (const t of spot.tags) {
        const n = tagPhotoCount.get(t.id) ?? 0;
        if (n > CROWDED_TAG_THRESHOLD) continue;
        const tc = tagPos.get(t.id)!;
        const m = tagMetrics.get(t.id)!;
        const clearance = Math.hypot(m.hw, m.hh) + PHOTO_HALF + PHOTO_TAG_MARGIN;
        const dx = x - tc.x;
        const dy = y - tc.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= clearance) continue;
        const push = clearance - dist;
        const ux = dx / dist;
        const uy = dy / dist;
        x += ux * push;
        y += uy * push;
      }

      photoPos.set(id, { x, y });
    }
  }
}

function computeLayout(spots: GallerySpot[]): LayoutResult {
  const sortedSpots = [...spots].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const tagById = new Map<string, { id: string; name: string }>();
  for (const s of sortedSpots) {
    for (const t of s.tags) {
      if (!tagById.has(t.id)) tagById.set(t.id, t);
    }
  }
  const sortedTags = [...tagById.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const tagMetrics = new Map(
    sortedTags.map((t) => [t.id, tagPillMetrics(t.name)] as const),
  );
  const maxTagHalfW = Math.max(
    72,
    ...sortedTags.map((t) => tagMetrics.get(t.id)!.hw),
  );
  const maxTagHalfH = Math.max(
    44,
    ...sortedTags.map((t) => tagMetrics.get(t.id)!.hh),
  );
  const TAG_CELL = Math.max(720, maxTagHalfW * 2 + 160);

  const tagPhotoCount = new Map<string, number>();
  for (const s of sortedSpots) {
    for (const t of s.tags) {
      tagPhotoCount.set(t.id, (tagPhotoCount.get(t.id) ?? 0) + 1);
    }
  }

  const tagPos = new Map<string, Point>();
  const cols = Math.max(1, Math.ceil(Math.sqrt(sortedTags.length * 1.35)));
  sortedTags.forEach((t, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    tagPos.set(t.id, {
      x: PADDING + maxTagHalfW + c * TAG_CELL,
      y: PADDING + maxTagHalfH + r * TAG_CELL,
    });
  });

  const tagGridBottom =
    sortedTags.length === 0
      ? PADDING
      : PADDING + (Math.floor((sortedTags.length - 1) / cols) + 1) * TAG_CELL;

  const photoPos = new Map<string, Point>();
  let orphanIdx = 0;

  sortedSpots.forEach((s, globalIdx) => {
    if (s.tags.length === 0) {
      const col = orphanIdx % 9;
      const row = Math.floor(orphanIdx / 9);
      photoPos.set(s.id, {
        x: PADDING + PHOTO_HALF + col * (PHOTO_SIZE + 56),
        y: tagGridBottom + TAG_CELL * 0.35 + row * (PHOTO_SIZE + 56),
      });
      orphanIdx += 1;
      return;
    }
    let cx = 0;
    let cy = 0;
    for (const t of s.tags) {
      const p = tagPos.get(t.id)!;
      cx += p.x;
      cy += p.y;
    }
    cx /= s.tags.length;
    cy /= s.tags.length;
    const angle = (globalIdx * GOLDEN_ANGLE) % (Math.PI * 2);
    const crowdedOnly =
      s.tags.length > 0 &&
      s.tags.every(
        (t) => (tagPhotoCount.get(t.id) ?? 0) > CROWDED_TAG_THRESHOLD,
      );
    const baseRad = crowdedOnly
      ? 90 + (globalIdx % 5) * 24
      : PHOTO_HALF + maxTagHalfW + 80 + (globalIdx % 6) * 22;
    const rad = baseRad + (globalIdx % 4) * 18;
    photoPos.set(s.id, {
      x: cx + Math.cos(angle) * rad,
      y: cy + Math.sin(angle) * rad,
    });
  });

  const spotById = new Map(sortedSpots.map((s) => [s.id, s] as const));
  const taggedSpotIds = sortedSpots
    .filter((s) => s.tags.length > 0)
    .map((s) => s.id);
  relaxPhotoAndTagPositions(
    photoPos,
    taggedSpotIds,
    spotById,
    tagPos,
    tagPhotoCount,
    tagMetrics,
    140,
  );

  const allPoints: { x: number; y: number; hw: number; hh: number }[] = [];
  for (const t of sortedTags) {
    const m = tagMetrics.get(t.id)!;
    const p = tagPos.get(t.id)!;
    allPoints.push({ x: p.x, y: p.y, hw: m.hw, hh: m.hh });
  }
  for (const p of photoPos.values()) {
    allPoints.push({ x: p.x, y: p.y, hw: PHOTO_HALF, hh: PHOTO_HALF });
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const q of allPoints) {
    minX = Math.min(minX, q.x - q.hw);
    minY = Math.min(minY, q.y - q.hh);
    maxX = Math.max(maxX, q.x + q.hw);
    maxY = Math.max(maxY, q.y + q.hh);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  const shiftX = PADDING - minX + CONTENT_INSET;
  const shiftY = PADDING - minY + CONTENT_INSET;

  let contentMinX = minX + shiftX;
  let contentMinY = minY + shiftY;
  let contentMaxX = maxX + shiftX;
  let contentMaxY = maxY + shiftY;

  const width = Math.max(MIN_CANVAS_W, contentMaxX + SCROLL_PAD);
  const height = Math.max(MIN_CANVAS_H, contentMaxY + SCROLL_PAD);

  /** Center the graph bbox in the middle of the canvas. */
  const bboxCx = (contentMinX + contentMaxX) / 2;
  const bboxCy = (contentMinY + contentMaxY) / 2;
  const deltaX = width / 2 - bboxCx;
  const deltaY = height / 2 - bboxCy;

  contentMinX += deltaX;
  contentMinY += deltaY;
  contentMaxX += deltaX;
  contentMaxY += deltaY;

  const shiftCentered = (p: Point): Point => ({
    x: p.x + shiftX + deltaX,
    y: p.y + shiftY + deltaY,
  });

  const tags = sortedTags.map((t) => {
    const p = shiftCentered(tagPos.get(t.id)!);
    return { id: t.id, name: t.name, x: p.x, y: p.y };
  });

  const photos = sortedSpots.map((s) => {
    const p = shiftCentered(photoPos.get(s.id)!);
    return { id: s.id, x: p.x, y: p.y, spot: s };
  });

  const edges: LayoutEdge[] = [];
  for (const s of sortedSpots) {
    const pc = shiftCentered(photoPos.get(s.id)!);
    for (const t of s.tags) {
      const tc = shiftCentered(tagPos.get(t.id)!);
      edges.push({
        id: `${s.id}-${t.id}`,
        x1: pc.x,
        y1: pc.y,
        x2: tc.x,
        y2: tc.y,
      });
    }
  }

  return {
    width,
    height,
    contentBounds: {
      minX: contentMinX,
      minY: contentMinY,
      maxX: contentMaxX,
      maxY: contentMaxY,
    },
    edges,
    tags,
    photos,
  };
}

export function TagPhotoMap({ spots }: { spots: GallerySpot[] }) {
  const router = useRouter();
  const tagMapEmptyScrollRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [explorerChips, setExplorerChips] = useState<ExplorerChip[]>([]);

  const filteredSpots = useMemo(() => {
    return spots.filter((spot) =>
      matchesExplorerChips(spot, explorerChips),
    );
  }, [spots, explorerChips]);

  const layout = useMemo(
    () => computeLayout(filteredSpots),
    [filteredSpots],
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const [detailSpot, setDetailSpot] = useState<GallerySpot | null>(null);
  const detailOpen = detailSpot != null;

  const onMapPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    /** Touch/stylus use native scrolling on the overflow container; mouse uses drag-to-pan. */
    if (e.pointerType !== "mouse") return;
    const t = e.target as HTMLElement;
    if (t.closest("[data-joy-photo]")) return;
    const el = scrollerRef.current;
    if (!el) return;
    panRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    el.setPointerCapture(e.pointerId);
    el.classList.add("cursor-grabbing");
  }, []);

  const onMapPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = panRef.current;
    const el = scrollerRef.current;
    if (!state || !el || state.pointerId !== e.pointerId) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    el.scrollLeft = state.scrollLeft - dx;
    el.scrollTop = state.scrollTop - dy;
  }, []);

  const endPan = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (panRef.current?.pointerId !== e.pointerId) return;
    panRef.current = null;
    el?.releasePointerCapture(e.pointerId);
    el?.classList.remove("cursor-grabbing");
  }, []);

  const b = layout.contentBounds;
  const scrollMapToContentCenter = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    el.scrollLeft = Math.max(
      0,
      Math.min(cx - vw / 2, Math.max(0, el.scrollWidth - vw)),
    );
    el.scrollTop = Math.max(
      0,
      Math.min(cy - vh / 2, Math.max(0, el.scrollHeight - vh)),
    );
  }, [b.minX, b.minY, b.maxX, b.maxY]);

  useLayoutEffect(() => {
    if (filteredSpots.length === 0) return;
    queueMicrotask(() => {
      scrollMapToContentCenter();
    });
  }, [
    filteredSpots.length,
    layout.width,
    layout.height,
    b.minX,
    b.minY,
    b.maxX,
    b.maxY,
    scrollMapToContentCenter,
  ]);

  const [showRecenter, setShowRecenter] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || filteredSpots.length === 0) {
      const t = requestAnimationFrame(() => setShowRecenter(false));
      return () => cancelAnimationFrame(t);
    }

    const update = () => {
      const sl = el.scrollLeft;
      const st = el.scrollTop;
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      if (vw < 1 || vh < 1) return;
      /** True when viewport rect intersects graph bounds (same scroll coordinates). */
      const intersects =
        sl < b.maxX &&
        sl + vw > b.minX &&
        st < b.maxY &&
        st + vh > b.minY;
      setShowRecenter(!intersects);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [b.minX, b.minY, b.maxX, b.maxY, filteredSpots.length]);

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <JoyFloatingNav />

      <JoySpotDetailDialog
        spot={detailSpot}
        open={detailOpen}
        onOpenChange={(next) => {
          if (!next) setDetailSpot(null);
        }}
        onTagClick={(name) => {
          setExplorerChips((prev) => addTagChipIfNew(prev, name));
          setDetailSpot(null);
        }}
        onDeleted={() => {
          setDetailSpot(null);
          router.refresh();
        }}
      />

      <ShareJoySpotModal open={shareOpen} onOpenChange={setShareOpen} />

      {spots.length === 0 ? (
        <div
          ref={tagMapEmptyScrollRef}
          className="flex min-h-0 flex-1 flex-col overflow-auto"
        >
          <StickySiteHeaderBar scrollContainerRef={tagMapEmptyScrollRef}>
            <SiteHeader onShareClick={() => setShareOpen(true)} />
          </StickySiteHeaderBar>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-[#8C7B6E]">
            <p>No joy spots yet. Share one from the gallery.</p>
            <Link
              href="/"
              className="rounded-full bg-[#C17B5A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#b06d4e]"
            >
              Go to gallery
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="w-full shrink-0">
            <StickySiteHeaderBar>
              <SiteHeader onShareClick={() => setShareOpen(true)} />
            </StickySiteHeaderBar>
            <div className="px-[72px]">
              <ExplorerSearchBar
                spots={spots}
                chips={explorerChips}
                onChipsChange={setExplorerChips}
              />
            </div>
          </div>

          {filteredSpots.length === 0 ? (
            <p
              className="px-[72px] py-16 text-center leading-relaxed text-[#3d3530]"
              style={{ fontSize: "8px" }}
            >
              No joy spots match your filters yet.
            </p>
          ) : (
            <div className="relative min-h-0 flex-1">
              {showRecenter ? (
                <div className="pointer-events-none absolute inset-x-0 top-4 z-40 flex justify-center">
                  <button
                    type="button"
                    className="pointer-events-auto rounded-full border border-[#C17B5A]/50 bg-[#FFFCF7]/95 px-7 py-3.5 text-[12px] font-semibold leading-none text-[#6b4a3a] shadow-lg backdrop-blur-sm transition-colors hover:bg-[#faf6f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C17B5A]"
                    onClick={() => scrollMapToContentCenter()}
                  >
                    Re-center
                  </button>
                </div>
              ) : null}
              <div
                ref={scrollerRef}
                className="map-explore-scroller h-full min-h-0 cursor-grab overflow-auto overscroll-contain select-none active:cursor-grabbing"
                tabIndex={0}
                role="region"
                aria-label="Map: drag or scroll to explore. Click a photo for details."
                onPointerDown={onMapPointerDown}
                onPointerMove={onMapPointerMove}
                onPointerUp={endPan}
                onPointerCancel={endPan}
              >
                <div
                  className="relative"
                  style={{
                    width: layout.width,
                    height: layout.height,
                    minWidth: "100%",
                    minHeight: "100%",
                    touchAction: "pan-x pan-y",
                  }}
                >
                <svg
                  className="pointer-events-none absolute left-0 top-0"
                  width={layout.width}
                  height={layout.height}
                  aria-hidden
                >
                  {layout.edges.map((e) => (
                    <line
                      key={e.id}
                      x1={e.x1}
                      y1={e.y1}
                      x2={e.x2}
                      y2={e.y2}
                      stroke="#C17B5A"
                      strokeOpacity={0.38}
                      strokeWidth={1.25}
                      strokeLinecap="round"
                    />
                  ))}
                </svg>

                {layout.tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="absolute z-10 flex max-w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#8B7E74] px-8 py-3 text-center transition-colors hover:bg-[#7a6e66] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C17B5A]"
                    style={{ left: t.x, top: t.y }}
                    aria-label={`Filter by tag ${t.name}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExplorerChips((prev) =>
                        addTagChipIfNew(prev, t.name),
                      );
                    }}
                  >
                    <span
                      className="truncate font-normal lowercase leading-snug text-white"
                      style={{ fontSize: "24px" }}
                    >
                      {t.name}
                    </span>
                  </button>
                ))}

                {layout.photos.map(({ id, x, y, spot }) => (
                  <div
                    key={id}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: x, top: y }}
                  >
                    <button
                      type="button"
                      data-joy-photo
                      className="group block cursor-pointer rounded-2xl border-0 bg-transparent p-0 text-left shadow-none ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C17B5A]"
                      onClick={() => setDetailSpot(spot)}
                      aria-label="Open joy spot details"
                    >
                      <div
                        className={cn(
                          "overflow-hidden rounded-2xl bg-[#ede8e0] transition-transform group-hover:scale-[1.02] group-active:scale-[0.99]",
                          spot.photo_url
                            ? "size-[150px]"
                            : "flex min-h-[150px] w-[150px] flex-col",
                        )}
                      >
                        {spot.photo_url ? (
                          <Image
                            src={spot.photo_url}
                            alt={
                              spot.caption?.trim()
                                ? spot.caption
                                : spot.text_content.trim()
                                  ? "Joy spot photo"
                                  : "Joy spot"
                            }
                            width={150}
                            height={150}
                            className="size-[150px] object-cover"
                            sizes="150px"
                          />
                        ) : (
                          <div className="flex size-[150px] flex-col justify-center gap-2 p-4 text-center">
                            <span className="text-xs font-medium uppercase tracking-wider text-[#a8988e]">
                              Text
                            </span>
                            <p className="line-clamp-[10] text-sm leading-snug text-[#5c4f45]">
                              {spot.text_content.trim() || "—"}
                            </p>
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
