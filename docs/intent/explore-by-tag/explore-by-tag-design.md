---
parent: high-level-design
prefix: EXPLORE
---

# Explore by Tag

## Context and Design Philosophy

Explore-by-tag is the discovery layer. Its two surfaces — the tag-photo graph map and the explorer search bar — share a single filter model (`ExplorerChip[]`) and a single match function (`matchesExplorerChips`). The graph map is the more immersive surface: a large infinite canvas where photos orbit their tags visually. The search bar is the practical filter entry point used in both the gallery and the map.

The tag-map route (`/tag-map`) is live and functional but its nav entry is currently disabled. Both surfaces are designed to be independent of any server-side filter state — all filtering is client-side over a preloaded `GallerySpot[]`.

## Filter Model

`ExplorerChip` has four kinds: `tag | author | location | text`. Each chip has a stable `id` (`{kind}:{value.toLowerCase()}`), `value`, and `label`. Multiple chips are ANDed: a spot must satisfy all active chips to appear.

`matchesExplorerChips` evaluates each chip in order:
- `tag` — spot must have a tag with matching name (case-insensitive)
- `author` — `contributor_name` must match exactly (case-insensitive)
- `location` — `location_text` must match exactly (case-insensitive)
- `text` — delegates to `matchesSearch` (substring across all text fields)

`addTagChipIfNew` is the canonical way to add a tag chip from a tag click (gallery card or map node) — it deduplicates by chip ID.

## Explorer Search Bar

`ExplorerSearchBar` builds in-memory indexes from the passed `GallerySpot[]` (`buildIndexes`):
- `tagNames` — unique tag names (case-insensitive key, display-case value)
- `authors` — unique `contributor_name` values
- `locations` — unique `location_text` values

On query input, suggestions are generated: a freetext "Match all text" option is always first (if not already a chip), followed by matching tags, authors, and places. Up to 24 suggestions are shown. Arrow key navigation cycles through the list; Enter selects the highlighted suggestion or commits a freetext chip.

Chips render inline as removable pills. Clicking a chip removes it from the filter.

## Tag-Photo Graph Map

### Layout Algorithm (`computeLayout`)

Pure function called inside `useMemo` on `filteredSpots`. Steps:

1. **Tag grid placement** — Tags are arranged in a square-ish grid with cell size `TAG_CELL = max(720, maxTagHalfW * 2 + 160)`.
2. **Photo initial placement** — Each spot is placed near the centroid of its tags' positions, offset by golden-angle rotation at radius `baseRad + (idx % 4) * 18`. Orphan spots (no tags) are placed below the tag grid in a 9-column grid.
3. **Force relaxation** — 140 iterations of pairwise photo separation: pairs that share a non-crowded tag (≤ `CROWDED_TAG_THRESHOLD=6` photos) push apart to maintain `PHOTO_MIN_SEP = 164px`. Photos also push away from nearby tag label bounding boxes.
4. **Canvas sizing** — Final positions are shifted to include `CONTENT_INSET=80px` padding, then centered on a canvas of at least `MIN_CANVAS_W=16000 × MIN_CANVAS_H=14000` with `SCROLL_PAD=12000` on each side.
5. **Edge generation** — One edge (`x1,y1,x2,y2`) per photo–tag connection, rendered as SVG lines.

### Map Interaction

The scroller div has `overflow: auto` and `cursor: grab`. Mouse drag-to-pan uses pointer capture (`setPointerCapture`); touch scrolling uses native overflow. A "Re-center" button appears when the viewport no longer intersects the graph bounding box (detected via scroll + ResizeObserver).

Clicking a tag pill adds it as a filter chip. Clicking a photo opens `JoySpotDetailDialog`. Clicking a tag within the detail dialog adds the tag as a chip and closes the dialog.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| All filtering client-side | Filter in-memory over full `GallerySpot[]` | Server-side filtered queries | Instant feedback; avoids round-trips for filter changes [inferred] |
| AND semantics for chips | All chips must match | OR chips, NOT chips | Simplest mental model; narrowing is the common use case [inferred] |
| Force relaxation (140 iter) | Custom relaxation loop | D3-force, physics engine | No external graph layout dependency; tuned for this layout [inferred] |
| Golden angle photo placement | `GOLDEN_ANGLE = 2.39996...` | Random offset, grid | Distributes photos evenly around tag centroid without clustering [inferred] |
| `CROWDED_TAG_THRESHOLD = 6` | Skip separation for crowded tags | Always separate | Avoids O(n²) cost blowing up for popular tags [inferred] |

## Open Questions & Future Decisions

### Resolved
*(none yet)*

### Deferred
1. Should the tag-map be re-exposed in navigation? Currently reachable only by direct URL.
2. Layout performance at high spot count (100+): consider Web Worker for `computeLayout`.
3. Should filter chips support OR or NOT logic in the future?
4. Lat/lng on spots (currently not stored) would enable a geographic map view as an alternative to the tag graph.

## References

- Arrow doc: docs/arrows/explore-by-tag.md
- EARS: docs/intent/explore-by-tag/explore-by-tag-specs.md
- Shared with browse-spots: `ExplorerSearchBar`, `explorer-filters.ts`
