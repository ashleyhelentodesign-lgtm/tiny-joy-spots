---
parent: high-level-design
prefix: SHARE
---

# Share a Spot

## Context and Design Philosophy

Share-a-spot is the entry point for all content in Joy Spots. A user with no account can post a joyful moment — photo or text — in a single form interaction. The segment covers the full submission path: client-side media capture and color sampling, geocoding, tag resolution, server-side upload, DB insert, and the post-submit color profile refresh.

The guiding principle is low friction: no login, no required fields beyond "photo or text", everything optional from there. The form must work on first visit with no prior state.

## Submission Form

`SubmissionForm` orchestrates the entire client-side experience. It manages:

- **Photo/text mode toggle** — `PhotoUploadDropzone` handles both modes via an internal `textOnly` state and an `onModeChange` callback. The parent form mirrors this via `setTextOnly`.
- **Color extraction** — On submit, if a file is present, `extractDominantColorsFromImageFile` is called before the fetch. The result is appended to the form data as `extracted_colors` JSON.
- **Tag combobox** — Live-filtered against `allTags` fetched from Supabase on mount. New tags are accepted by typing and pressing Enter. Selected tags are serialized as a JSON array in `tags`.
- **Mood combobox** — Same pattern as tags but single-select; options seeded from `DEFAULT_MOOD_SUGGESTIONS` plus any distinct moods already in the DB (fetched on mount via anon client).
- **Location** — `LocationPicker` calls Photon/Komoot geocoding API; selected `location_text` is the display string only (lat/lng not stored).
- **Contributor identity** — If the viewer has a profile (fetched on mount), the post is attributed to `profile.display_name` unless "post anonymously" is checked. If no profile, an optional free-text name field is shown.

## Photo Upload

`PhotoUploadDropzone` uses `react-dropzone` (`useDropzone`) for drag-and-drop and file input. Image preview is a local object URL, revoked on unmount. When a file is selected the parent form calls `extractDominantColorsFromImageFile`:

- Creates a 32×32 `OffscreenCanvas` (via `createImageBitmap`)
- Buckets each non-transparent, non-white, non-black pixel into 32-step RGB buckets
- Returns the top 3 buckets by pixel count as `[{hex, h, s, l, weight: 3|2|1}]`

The extracted colors are sent with the form POST and stored on `joy_spots.extracted_colors` (JSONB).

## Server Handler — POST /api/submit-joy-spot

Sequence:

1. Read/issue device cookie (`joy_spots_device_id`).
2. Parse `multipart/form-data`: photo file, text, date, location, contributor name, caption, mood, tags, extracted_colors.
3. If photo present: upload to `joy-spot-photos` bucket at path `{deviceId}/{timestamp}-{filename}`. Get public URL.
4. Look up device profile; resolve `profile_id` and `contributor_name`.
5. Insert `joy_spots` row (including `extracted_colors` if valid).
6. Resolve/create each tag in `tags` table; insert `joy_spot_tags` junction rows.
7. Call `recomputeUserColorProfile(supabase, deviceId)` — awaited, failure is swallowed.
8. Return the inserted row. Set device cookie header if newly issued.

Uses **service role** key to bypass RLS (submission path cannot use anon client for storage upload without additional RLS).

## Location Geocoding

`LocationPicker` calls `https://photon.komoot.io/api/?q={query}&limit=5` with 300ms debounce and per-request `AbortController`. Results are displayed as pills with type label (city/neighborhood/venue). Selection writes to `location_text` (display string). Lat/lng are available in `LocationData` but not currently persisted.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Service role for submission API | Service role key on server | Anon client with RLS | Storage upload requires service role; RLS enforcement happens via cookie validation in handler code [inferred] |
| Client-side color extraction | 32×32 canvas downsample | Server-side Jimp/sharp | Avoids binary deps on server; client already has the file in memory [inferred] |
| Synchronous color recompute post-submit | Await in handler, swallow error | Background job / queue | Simplicity at current scale; no job queue infrastructure [inferred] |
| Photon/Komoot geocoding | Public Photon API | Google Maps, Mapbox | Free, no API key required [inferred] |
| Tag deduplication by lowercase | `byLower` map in `dedupeTagNames` | DB unique constraint only | Prevent near-duplicate tags in single submission before hitting DB [inferred] |

## Open Questions & Future Decisions

### Resolved
*(none yet)*

### Deferred
1. Should lat/lng from `LocationPicker` be stored on `joy_spots` for future map/proximity features?
2. Should tag creation be restricted (e.g., curated tags only, admin-approved)?
3. Should color recompute be moved to a background job (e.g., Supabase Edge Function) to remove latency from the submission response?
4. Is there a maximum file size limit on photo uploads? None found in current code.

## References

- Arrow doc: docs/arrows/share-a-spot.md
- EARS: docs/intent/share-a-spot/share-a-spot-specs.md
- Photon geocoding API: https://photon.komoot.io
