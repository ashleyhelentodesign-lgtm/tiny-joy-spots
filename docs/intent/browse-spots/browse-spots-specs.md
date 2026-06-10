# EARS Specs — Browse Spots (BROWSE)

Prefix: `BROWSE`

Spec status: `[x]` observed working · `[ ]` broken or partial · `[D]` intentional non-feature

---

## Gallery Rendering

- [x] **BROWSE-001** — WHEN the home page loads, the system SHALL server-render all `joy_spots` rows ordered by `created_at DESC`, joined with their tags and profile display names, and display them in a masonry grid.

- [x] **BROWSE-002** — WHEN the viewport width changes across breakpoints, the system SHALL reflow the gallery into 1 column (< 768px), 2 columns (768–1023px), 4 columns (1024–1279px), or 5 columns (≥ 1280px) using `useSyncExternalStore` with `matchMedia` listeners.

- [x] **BROWSE-003** — WHEN a spot has a photo, the system SHALL render it as a `next/image` element with responsive `sizes` and rounded corners; WHEN a spot has no photo, the system SHALL render the text content in a large font within a warm-tinted text block.

- [x] **BROWSE-004** — WHEN the gallery Supabase query fails in development, the system SHALL render a `GalleryFetchDevAlert` banner with the error message; in production, the system SHALL render nothing additional.

## Detail & Delete

- [x] **BROWSE-005** — WHEN a user clicks a gallery card, the system SHALL open `JoySpotDetailDialog` showing the full photo or text, contributor name, caption, tags, location, and timestamp.

- [x] **BROWSE-006** — WHEN the viewer owns the open spot (`viewer_owns_spot === true`), the system SHALL show a "Delete my post" button in the detail dialog.

- [x] **BROWSE-007** — WHEN the viewer confirms deletion, the system SHALL call `DELETE /api/joy-spots/{id}`, verify device cookie ownership server-side, remove the photo from storage (if any), delete the DB row, close the dialog, and refresh the page via `router.refresh()`.

## Header & Nav

- [x] **BROWSE-008** — WHEN the user scrolls the page more than 4px, the system SHALL apply a white background to the sticky site header bar; WHEN at the top, the header SHALL be transparent.

- [x] **BROWSE-009** — WHEN the viewer has a profile, the system SHALL render a `ProfileAvatar` link to `/profile` in the site header, sized to match the "Share a joyspot" button height.

## Error States

- [x] **BROWSE-010** — WHEN Supabase environment variables are missing, the system SHALL skip the gallery query and display a configuration error alert in development; the gallery SHALL render with zero spots.
