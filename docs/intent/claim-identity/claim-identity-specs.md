# EARS Specs — Claim Identity (IDENT)

Prefix: `IDENT`

Spec status: `[x]` observed working · `[ ]` broken or partial · `[D]` intentional non-feature

---

## Device Cookie

- [x] **IDENT-001** — WHEN a request to `GET /api/profile` or `POST /api/submit-joy-spot` arrives without a `joy_spots_device_id` cookie, the system SHALL generate a new UUID (lowercased), use it as the device ID for that request, and set it as a 1-year `joy_spots_device_id` cookie on the response.

- [x] **IDENT-002** — WHEN a `joy_spots_device_id` cookie is present, the system SHALL normalize it (trim + lowercase) and use it as the caller's stable identity for all ownership and profile lookups.

## Profile CRUD

- [x] **IDENT-003** — WHEN `POST /api/profile` is called with a valid `display_name` (non-empty after trim) and optional `bio` (≤ 160 chars), and no profile yet exists for the device, the system SHALL insert a `profiles` row; the DB trigger SHALL assign `avatar_color` from the device's most frequent `dominant_color` or a random palette entry.

- [x] **IDENT-004** — WHEN `POST /api/profile` is called and a profile already exists for the device, the system SHALL return 409 without creating a duplicate.

- [x] **IDENT-005** — WHEN `GET /api/profile` is called, the system SHALL return `{ profile: Profile }` for the requesting device, or `{ profile: null }` if none exists.

## Invite CTAs

- [x] **IDENT-006** — WHEN the gallery loads and the viewer owns at least one spot, has no profile, and has not dismissed the invite prompt, the system SHALL render `GalleryProfileInviteCard` above the gallery grid.

- [x] **IDENT-007** — WHEN the viewer dismisses the invite card, the system SHALL write `joy_spots_profile_prompt_dismissed=1` cookie (1-year expiry) and hide the card for future page loads.

## Profile Display

- [x] **IDENT-008** — WHEN the viewer has a profile, the system SHALL render a `ProfileAvatar` circle (using `avatar_color` and first initial) as a link to `/profile` in the site header.

- [x] **IDENT-009** — WHEN a user visits `/profile/new`, the system SHALL open the `ProfileCreateModal`; WHEN the modal is closed (cancelled or submitted), the system SHALL redirect to `/`.
