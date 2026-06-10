# Arrow: explore-by-tag

The tag-photo graph map and the filter chip system used across views.

## Status

**MAPPED** — last audited 2026-06-01 (git SHA `null`). Initial brownfield mapping; no prior design docs.

## References

### HLD
- docs/high-level-design.md (Explore by Tag section)

### LLD
- docs/intent/explore-by-tag/explore-by-tag-design.md

### EARS
- docs/intent/explore-by-tag/explore-by-tag-specs.md (8 specs)

### Tests
- None found.

### Code
- src/app/tag-map/page.tsx
- src/components/TagPhotoMap.tsx
- src/components/ExplorerSearchBar.tsx
- src/lib/explorer-filters.ts
- src/lib/gallery-filters.ts

## Architecture

**Purpose:** Lets users discover how joy spots connect through shared tags. The tag-photo map renders a panning canvas where tag labels orbit their associated photos; the explorer search bar provides a combobox for adding filter chips (tag, author, location, text). Both surfaces share the same chip model and filter logic.

**Key Components:**

1. `TagPhotoMap` — Client component rendering a large (`MIN_CANVAS_W=16000 × MIN_CANVAS_H=14000`) scrollable div with: SVG edges (photo–tag lines), tag pill buttons, and photo thumbnails. Handles mouse drag-to-pan, pointer capture, re-center button, and spot detail dialog integration.
2. `computeLayout` — Pure function (inside `TagPhotoMap.tsx`) that positions tags in a grid, places photos near their tag centroids using golden angle distribution, then runs 140 iterations of force-relaxation to separate overlapping photos and push them away from tag labels.
3. `ExplorerSearchBar` — Combobox that builds indexes of all tags, authors, and locations from the current `GallerySpot[]`, suggests matches as the user types, and manages the active filter chip list. Shared between `GalleryGrid` and `TagPhotoMap`.
4. `explorer-filters.ts` — `ExplorerChip` type, `chipId`, `addTagChipIfNew`, `matchesExplorerChips` (AND semantics across all active chips).
5. `gallery-filters.ts` — `matchesSearch` (text substring search across all text fields of a spot).

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|---|---|---|---|---|
| Graph layout | EXPLORE-001 to EXPLORE-003 | 3 | 0 | 0 |
| Filter chips | EXPLORE-004 to EXPLORE-006 | 3 | 0 | 0 |
| Map interaction | EXPLORE-007 to EXPLORE-008 | 2 | 0 | 0 |

**Summary:** 8 of 8 active specs implemented (brownfield bootstrap; specs reflect observed behavior).

## Key Findings

1. **Graph layout is fully client-side** — `computeLayout` runs on every render when `filteredSpots` changes. With large spot counts the 140-iteration relaxation loop could be slow; no memoization beyond `useMemo` on `filteredSpots`. [inferred: acceptable at current community scale]
2. **`ExplorerSearchBar` is consumed by two segments** — Used in both `GalleryGrid` (browse-spots) and `TagPhotoMap` (explore-by-tag). This component + `explorer-filters.ts` are the shared boundary between the two segments.
3. **Filter semantics are AND across chips** — All active chips must match simultaneously (`matchesExplorerChips`). No OR / NOT support (`explorer-filters.ts:36-60`).
4. **Tag-photo map nav is hidden** — `JoyFloatingNav` which linked to `/tag-map` is disabled. The route and page are still live and reachable by direct URL.
5. **`CROWDED_TAG_THRESHOLD = 6`** — Tags with more than 6 photos use a tighter orbit radius; photos on crowded tags skip mutual separation (`TagPhotoMap.tsx:46`). [inferred: performance + readability trade-off]
6. **Touch/stylus use native scroll** — `onPointerDown` guard `e.pointerType !== 'mouse'` returns early, delegating touch scrolling to native overflow handling (`TagPhotoMap.tsx:396-399`).

## Work Required

### Must Fix
- None identified.

### Should Fix
1. Consider virtualization or layout caching for the graph at high spot counts.
2. Re-expose the tag-map route in nav (or intentionally remove the page).

### Nice to Have
1. OR-mode filter chips for more flexible exploration.
