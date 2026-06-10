# EARS Specs — Explore by Tag (EXPLORE)

Prefix: `EXPLORE`

Spec status: `[x]` observed working · `[ ]` broken or partial · `[D]` intentional non-feature

---

## Graph Layout

- [x] **EXPLORE-001** — WHEN the tag-photo map renders, the system SHALL position tag labels in a square-ish grid and place each photo near the centroid of its tags' positions, offset by a golden-angle rotation, then run 140 iterations of force-relaxation to separate overlapping photos and push photos away from tag label bounding boxes.

- [x] **EXPLORE-002** — WHEN a spot has no tags, the system SHALL place it in a 9-column grid below the tag label area, separated from the tagged spots.

- [x] **EXPLORE-003** — WHEN the map canvas is scrolled so that the graph bounding box is no longer visible in the viewport, the system SHALL show a "Re-center" button; clicking it SHALL scroll the map to center the graph bounds in the viewport.

## Filter Chips

- [x] **EXPLORE-004** — WHEN a user types in the explorer search bar, the system SHALL suggest matching tags, authors, locations, and a freetext option (up to 24 results), ordered by type (freetext first, then tags, authors, locations).

- [x] **EXPLORE-005** — WHEN a user selects a suggestion or commits a freetext entry, the system SHALL add an `ExplorerChip` to the active filter list and clear the input.

- [x] **EXPLORE-006** — WHEN one or more filter chips are active, the system SHALL display only spots that satisfy ALL active chips simultaneously (AND semantics); WHEN no chips are active, the system SHALL display all spots.

## Map Interaction

- [x] **EXPLORE-007** — WHEN the user presses the primary mouse button and drags on the map canvas (not on a photo), the system SHALL pan the map by updating `scrollLeft`/`scrollTop` using pointer capture; touch and stylus SHALL use native overflow scrolling.

- [x] **EXPLORE-008** — WHEN a user clicks a tag label on the map, the system SHALL add that tag as a filter chip (if not already active); WHEN a user clicks a photo on the map, the system SHALL open `JoySpotDetailDialog` for that spot.
