---
parent: high-level-design
prefix: BROWSE
---

# Browse Spots

## Context and Design Philosophy

Browse-spots is the home surface of Joy Spots — the community feed. It prioritizes fast initial load (SSR) and a warm, tactile feel (masonry grid, rounded cards, soft palette). It doubles as the primary discovery surface: the explorer search bar sits at the top of the grid, and clicking any tag in a card or detail view adds a filter chip.

The gallery shell is deliberately thin on state: it holds modal open/close and viewer profile, delegating layout to `GalleryGrid` and data fetching to the server component.

## Page Structure

```
src/app/page.tsx  (force-dynamic, SSR)
  └── GalleryServerBody  (server component — fetches data)
        └── GalleryShell  (client boundary — modals, header, grid)
              ├── StickySiteHeaderBar + SiteHeader
              ├── GalleryGrid
              │     ├── ExplorerSearchBar  (shared with explore-by-tag)
              │     ├── GalleryProfileInviteCard (conditional)
              │     └── [spot cards] → JoySpotDetailDialog
              ├── ShareJoySpotModal
              └── ProfileCreateModal
```

`/gallery` permanently redirects to `/` — the route exists for legacy URL support only.

## Data Flow

`GalleryServerBody` fetches all `joy_spots` with a single Supabase query (anon key, public read):

```sql
SELECT id, photo_url, text_content, contributor_name, caption,
       location_text, date, created_at, device_id,
       profile_id, profiles(display_name),
       joy_spot_tags(tags(id, name))
FROM joy_spots
ORDER BY created_at DESC
```

`mapRowsToGallerySpots` normalizes rows into `GallerySpot[]` and marks `viewer_owns_spot` by comparing each row's `device_id` against the viewer's cookie (read server-side from `cookies()`).

## Masonry Grid

`GalleryGrid` partitions spots into N columns via `partitionIntoColumns` (round-robin assignment). Column count (`1 | 2 | 4 | 5`) is derived from media query breakpoints via `useSyncExternalStore` with three `matchMedia` listeners (`md`, `lg`, `xl`). Server snapshot returns `1`.

Cards render as `<article>` elements with a `role="button"` div for click-to-open. Photo cards show the image via `next/image` (unoptimized, responsive `sizes`). Text-only cards show the text in a large font with a `line-clamp-[10]`.

## Detail Dialog

`JoySpotDetailDialog` is a full-viewport overlay (fixed z-100). Layout branches on `hasPhoto`:

- **Photo** — tall card with scrollable metadata section below a fixed-height image area.
- **Text-only** — card with large text block above scrollable metadata.

Owners see a "Delete my post" button. Delete flow:

1. `window.confirm` (synchronous guard).
2. `DELETE /api/joy-spots/[id]`.
3. Server verifies device cookie matches row `device_id`, removes storage object, deletes row.
4. On success: close dialog, call `router.refresh()` to re-fetch SSR data.

Escape key and backdrop click both close the dialog. Body scroll is locked while open.

## Invite Card & Profile CTA

`GalleryProfileInviteCard` appears above the grid when:
- `profile === null` (confirmed, not loading)
- `!promptDismissed` (no dismiss cookie)
- `ownsAnySpot` (at least one spot in the current page load is owned by the viewer)

Dismissal writes `joy_spots_profile_prompt_dismissed=1` cookie client-side for 1 year.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| SSR gallery fetch | Server component, anon key | Client-side fetch on mount | Fast initial paint; gallery is fully public [inferred] |
| Masonry via round-robin column partition | CSS columns or JS partition | CSS `columns` property | Predictable order, no CSS column quirks with dynamic content [inferred] |
| `useSyncExternalStore` for column count | External store with MQ listeners | `useEffect` + state | Avoids hydration mismatch; server snapshot returns 1 [inferred] |
| `router.refresh()` after delete | Next.js router refresh | Optimistic removal from local state | Simplest correct approach; re-runs SSR fetch [inferred] |
| `JoyFloatingNav` disabled | Both flags hardcoded `false` | Active nav | Nav was removed from UX; component kept but inert [inferred] |

## Open Questions & Future Decisions

### Resolved
*(none yet)*

### Deferred
1. Pagination or infinite scroll — currently loads all spots in one query.
2. Should `JoyFloatingNav` be deleted entirely, or is there a plan to re-enable it?
3. Sorting options (by date, by mood, etc.) are not currently exposed.

## References

- Arrow doc: docs/arrows/browse-spots.md
- EARS: docs/intent/browse-spots/browse-spots-specs.md
- Shared with explore-by-tag: `ExplorerSearchBar`, `explorer-filters.ts`
