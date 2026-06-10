# Arrow: browse-spots

The main gallery feed — browse all joy spots, open a detail view, delete your own.

## Status

**MAPPED** — last audited 2026-06-01 (git SHA `null`). Initial brownfield mapping; no prior design docs.

## References

### HLD
- docs/high-level-design.md (Browse Spots section)

### LLD
- docs/intent/browse-spots/browse-spots-design.md

### EARS
- docs/intent/browse-spots/browse-spots-specs.md (10 specs)

### Tests
- None found.

### Code
- src/app/page.tsx
- src/app/gallery/page.tsx
- src/app/gallery/gallery-server-body.tsx
- src/app/gallery/gallery-shell.tsx
- src/components/GalleryGrid.tsx
- src/components/JoySpotDetailDialog.tsx
- src/components/GalleryFetchDevAlert.tsx
- src/components/SiteHeader.tsx
- src/components/StickySiteHeaderBar.tsx
- src/components/JoyFloatingNav.tsx
- src/app/api/joy-spots/[id]/route.ts
- src/lib/map-rows-to-gallery-spots.ts
- src/lib/joy-spot.ts
- src/lib/gallery-surface.ts
- src/lib/log-gallery-fetch-error.ts

## Architecture

**Purpose:** Presents the community feed of all joy spots in a responsive masonry grid, served with SSR data for fast initial load. The client shell manages modals (share, profile create), viewer identity display, and the inline explorer search bar. Clicking a card opens a detail dialog; owners can delete their own spot from there.

**Key Components:**

1. `GalleryServerBody` (server component) — SSR: fetches all `joy_spots` rows with tags and profile joins using anon key; maps rows to `GallerySpot[]`; passes to `GalleryShell`.
2. `GalleryShell` (client component) — Manages share modal, profile create modal, viewer profile state; renders `SiteHeader`, `GalleryGrid`, and invite card conditionally.
3. `GalleryGrid` — Masonry column layout (1/2/4/5 columns by breakpoint via `useSyncExternalStore`); hosts `ExplorerSearchBar`, renders cards, and opens `JoySpotDetailDialog`.
4. `JoySpotDetailDialog` — Full-screen overlay for a single spot; shows photo or text, metadata, tags; owners see a delete button that calls `DELETE /api/joy-spots/[id]`.
5. `DELETE /api/joy-spots/[id]` — Ownership-checked delete: reads device cookie, verifies row `device_id`, removes storage object then DB row.
6. `map-rows-to-gallery-spots.ts` — Normalizes raw Supabase rows into `GallerySpot` shape; resolves contributor display name from profile join; marks `viewer_owns_spot`.
7. `StickySiteHeaderBar` — Sticky header that elevates on scroll; used here and in `TagPhotoMap`.
8. `JoyFloatingNav` — Floating side nav (currently fully disabled via two `false` flags).

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|---|---|---|---|---|
| Gallery rendering | BROWSE-001 to BROWSE-004 | 4 | 0 | 0 |
| Detail & delete | BROWSE-005 to BROWSE-007 | 3 | 0 | 0 |
| Header & nav | BROWSE-008 to BROWSE-009 | 2 | 0 | 0 |
| Error states | BROWSE-010 | 1 | 0 | 0 |

**Summary:** 10 of 10 active specs implemented (brownfield bootstrap; specs reflect observed behavior).

## Key Findings

1. **`/gallery` permanently redirects to `/`** — `src/app/gallery/page.tsx` uses `permanentRedirect("/")`. The gallery-server-body and gallery-shell live under `src/app/gallery/` but are imported by the root page (`src/app/page.tsx`). [inferred: route reorganization artifact]
2. **`JoyFloatingNav` renders null** — Both `SHOW_GALLERY_FLOATING_NAV` and `SHOW_EXPLORER_FLOATING_NAV` are hardcoded `false` (`src/components/JoyFloatingNav.tsx:83-84`). The component is still imported and rendered.
3. **Profile invite card** — Shown only when: viewer has no profile, hasn't dismissed the prompt (cookie), and owns at least one spot in the current page load (`GalleryShell.tsx:25-27`).
4. **Viewer ownership marked server-side** — `mapRowsToGallerySpots` compares `row.device_id` with the viewer cookie at SSR time, so `viewer_owns_spot` is baked into the initial payload (`map-rows-to-gallery-spots.ts:62`).
5. **`GalleryFetchDevAlert` suppressed in production** — Checks `NODE_ENV !== 'development'` and returns null (`GalleryFetchDevAlert.tsx:11-13`).

## Work Required

### Must Fix
- None identified.

### Should Fix
1. Remove or enable `JoyFloatingNav` — dead code in every render.

### Nice to Have
1. Pagination or infinite scroll (currently loads all spots in one query).
