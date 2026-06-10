# Arrow: share-a-spot

Posting a joy spot — photo or text — with optional location, tags, mood, and caption.

## Status

**MAPPED** — last audited 2026-06-01 (git SHA `null`). Initial brownfield mapping; no prior design docs.

## References

### HLD
- docs/high-level-design.md (Share a Spot section)

### LLD
- docs/intent/share-a-spot/share-a-spot-design.md

### EARS
- docs/intent/share-a-spot/share-a-spot-specs.md (9 specs)

### Tests
- None found.

### Code
- src/components/SubmissionForm.tsx
- src/components/photo-upload-dropzone.tsx
- src/components/PhotoUpload.tsx
- src/components/LocationPicker.tsx
- src/app/api/submit-joy-spot/route.ts
- src/lib/joy-spot-storage.ts
- src/lib/joy-spots-device.ts

## Architecture

**Purpose:** Allows any browser visitor to share a small joyful moment with the community. No login required — a UUID device cookie identifies the author. Submissions may include a photo (uploaded to Supabase Storage) or plain text, along with optional metadata: location (geocoded via Photon/Komoot), tags, mood, and caption. After insert, the submitter's color profile is recomputed.

**Key Components:**

1. `SubmissionForm` — Rich client form orchestrating all submission fields; manages photo/text toggle, tag combobox, mood combobox, location, contributor identity, and submit flow.
2. `PhotoUploadDropzone` — Drag-and-drop / click-to-browse photo picker; also handles text-only mode toggle. Samples the image client-side and emits color extraction results.
3. `LocationPicker` — Debounced geocoding combobox backed by the Photon/Komoot public API; emits both structured `LocationData` and plain `location_text` string.
4. `POST /api/submit-joy-spot` — Server handler: validates, uploads photo to `joy-spot-photos` bucket, inserts `joy_spots` row, resolves/creates tags, and triggers `recomputeUserColorProfile`.
5. `joy-spot-storage.ts` — Bucket ID constant and URL-to-path converter used by delete flow.
6. `joy-spots-device.ts` — Cookie name/parse/normalize used at submission to issue or read the device ID.

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|---|---|---|---|---|
| Core submission | SHARE-001 to SHARE-004 | 4 | 0 | 0 |
| Media | SHARE-005 to SHARE-006 | 2 | 0 | 0 |
| Metadata | SHARE-007 to SHARE-009 | 3 | 0 | 0 |

**Summary:** 9 of 9 active specs implemented (brownfield bootstrap; specs reflect observed behavior).

## Key Findings

1. **Client-side color extraction** — `PhotoUploadDropzone` samples a 32×32 canvas of the image and sends `extracted_colors` JSON with the form POST (`src/components/photo-upload-dropzone.tsx` → `extractDominantColorsFromImageFile`). Server stores up to 3 colors per submission.
2. **Contributor identity resolution** — When a device profile exists, `contributor_name` is sourced from `profile.display_name` regardless of what the user typed in the form (`src/app/api/submit-joy-spot/route.ts:196-213`). [inferred: intentional to keep byline consistent with profile name]
3. **Tag creation is upsert-like** — Tags are inserted optimistically; on conflict the existing row is fetched. Shared tag vocabulary grows from submissions, not a curated list (`route.ts:59-81`).
4. **Color recompute is synchronous in the request** — `recomputeUserColorProfile` is awaited inside the POST handler. Failure is logged but does not fail the submission (`route.ts:270-282`).
5. **No deduplication of identical submissions** — Nothing prevents a device from submitting the same photo + text repeatedly. [inferred: acceptable given community-journal nature]

## Work Required

### Must Fix
- None identified.

### Should Fix
1. Add server-side tag name length/content validation (currently only trimmed, not bounded).

### Nice to Have
1. Consider background job for color recompute to avoid adding latency to the submission response.
