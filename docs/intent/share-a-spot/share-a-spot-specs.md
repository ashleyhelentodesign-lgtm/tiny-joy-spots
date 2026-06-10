# EARS Specs — Share a Spot (SHARE)

Prefix: `SHARE`

Spec status: `[x]` observed working · `[ ]` broken or partial · `[D]` intentional non-feature

---

## Core Submission

- [x] **SHARE-001** — WHEN a user submits the form with a photo, the system SHALL upload the photo to the `joy-spot-photos` Supabase Storage bucket at path `{deviceId}/{timestamp}-{sanitizedFilename}` and store the public URL in `joy_spots.photo_url`.

- [x] **SHARE-002** — WHEN a user submits the form with text only (no photo), the system SHALL create a `joy_spots` row with `photo_url = null` and `text_content` set to the entered text.

- [x] **SHARE-003** — WHEN a submission is missing both a photo and non-empty text, the system SHALL reject it with a 400 error (`"Add a photo or write something for your joy spot."`).

- [x] **SHARE-004** — WHEN a device cookie is absent at submission time, the system SHALL generate a new UUID device ID and set `joy_spots_device_id` cookie on the response (1-year expiry, `sameSite: lax`).

## Media

- [x] **SHARE-005** — WHEN a photo submission includes client-side extracted colors, the system SHALL store up to 3 entries in `joy_spots.extracted_colors` as `[{hex, h, s, l, weight}]` with weights 3, 2, 1 by dominance rank.

- [x] **SHARE-006** — WHEN a photo is submitted, the system SHALL extract up to 3 dominant colors client-side by downsampling the image to 32×32 and bucketing non-transparent, non-near-white, non-near-black pixels into 32-step RGB buckets before sending the form.

## Metadata

- [x] **SHARE-007** — WHEN a user selects tags, the system SHALL resolve each tag name against the `tags` table (insert if new, fetch if existing) and create `joy_spot_tags` junction rows linking the new spot to each resolved tag ID.

- [x] **SHARE-008** — WHEN a device has an existing profile, the system SHALL set `joy_spots.contributor_name` to the profile's `display_name` (not the form-entered name) and set `joy_spots.profile_id` to the profile's ID, unless the user checked "post anonymously".

- [x] **SHARE-009** — AFTER a joy spot is successfully inserted, the system SHALL recompute the `UserColorProfile` for the submitting device; failure of the recompute SHALL NOT fail the submission response.
