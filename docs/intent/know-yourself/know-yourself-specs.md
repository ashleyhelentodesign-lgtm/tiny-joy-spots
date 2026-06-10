# EARS Specs — Know Yourself (PORTRAIT)

Prefix: `PORTRAIT`

Spec status: `[x]` observed working · `[ ]` broken or partial · `[D]` intentional non-feature

---

## Page Routing

- [x] **PORTRAIT-001** — WHEN a user visits `/profile` without a `joy_spots_device_id` cookie, or with a device that has no profile, the system SHALL redirect to `/profile/new`.

- [x] **PORTRAIT-002** — WHEN a user visits `/profile` with a valid device profile, the system SHALL server-render the profile page with the viewer's spots, top color palette, and `UserColorProfile` pre-fetched.

## Portrait Analytics

- [x] **PORTRAIT-003** — WHEN the Joy Portrait tab is active, the system SHALL display a prose aura sentence derived from the viewer's top color, distinct moods, inferred subjects, and recurring descriptor words drawn from their spot content.

- [x] **PORTRAIT-004** — WHEN the viewer's spots include tags, moods, or text matching at least one subject keyword group (people, nature, dogs, cats, food, animals, home, light, art), the system SHALL display the top 1–2 subjects as "What draws you in".

- [x] **PORTRAIT-005** — WHEN the viewer has used tags across their spots, the system SHALL display the top 3 most-used tag names as "Words of joy" pill badges.

## My Spots Tab

- [x] **PORTRAIT-006** — WHEN the "Joy spots" tab is selected, the system SHALL render the viewer's own spots in a masonry grid without the explorer search bar.

- [x] **PORTRAIT-007** — WHEN the viewer has no spots, the system SHALL render an empty state with a "Share a joyspot" button that opens the submission modal.

## Portrait Display

- [x] **PORTRAIT-008** — WHEN the Joy Portrait tab is active, the system SHALL render `JoyAura` — an animated canvas orb driven by the viewer's `UserColorProfile` hue buckets — beside the text portrait sections; WHEN no `UserColorProfile` exists, `JoyAura` SHALL render a single warm-gray fallback blob.
