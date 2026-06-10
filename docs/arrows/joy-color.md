# Arrow: joy-color

Color extraction from photos, rolling color profile aggregation per device, the JoyAura canvas visualization, and admin recompute.

## Status

**MAPPED** — last audited 2026-06-01 (git SHA `null`). Initial brownfield mapping; no prior design docs.

## References

### HLD
- docs/high-level-design.md (Joy Color section)

### LLD
- docs/intent/joy-color/joy-color-design.md

### EARS
- docs/intent/joy-color/joy-color-specs.md (9 specs)

### Tests
- None found.

### Code
- src/lib/dominant-color.ts
- src/lib/user-color-profile.ts
- src/lib/profile-color-server.ts
- src/components/profile/JoyAura.tsx
- src/components/JoyColorAuraPreview.tsx
- src/components/profile/ProfileJoyColorCircles.tsx
- src/app/api/admin/recompute-color-profiles/route.ts
- supabase/migrations/20260601001000_color_profiles.sql
- supabase/migrations/20260601002000_user_color_profiles_device_id.sql

## Architecture

**Purpose:** Derives a personal color identity from a device's uploaded photos. Each photo submission samples the image client-side (3 dominant colors with weights), stores them as `extracted_colors` JSONB on `joy_spots`, and triggers `recomputeUserColorProfile` — a full recomputation that aggregates all of the device's spot colors into hue bucket totals, weighted saturation/lightness averages, and color temperature proportions. The `JoyAura` component animates these aggregates as a canvas-based color orb. An admin endpoint allows batch recompute across all devices.

**Key Components:**

1. `dominant-color.ts` — Hex/HSL conversion utilities; `extractDominantColorsFromImageFile` (32×32 canvas sample → top 3 color buckets with weights 3/2/1); `pickTopDominantColorsWithCounts` (frequency-ranked color list for profile page).
2. `user-color-profile.ts` — `recomputeUserColorProfile`: fetches all spots for a device, builds weighted HSL samples with recency multiplier (2× for spots < 14 days old), aggregates into 12 hue buckets (30° each), computes avg saturation/lightness, saturation variance, color temperature (warm/cool/green/neutral proportions), and top 3 hue buckets with representative hex. Upserts `user_color_profile` table.
3. `profile-color-server.ts` — Server-side fetch of `UserColorProfile` for a device (used by `ProfilePage`).
4. `JoyAura` — Canvas component (`requestAnimationFrame` loop) rendering animated color blobs derived from `UserColorProfile.top_hue_buckets`. Blob positions oscillate with sinusoidal frequencies; particles orbit the center; a radial crop mask creates the orb shape.
5. `JoyColorAuraPreview` — CSS-only animated placeholder shown in `ProfileCreateForm` before a color profile exists.
6. `ProfileJoyColorCircles` — Color bubble display (unused; see know-yourself findings).
7. `admin/recompute-color-profiles` — Bearer/query-key-protected GET+POST that recomputes color profiles for all distinct device IDs found in `joy_spots`.

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|---|---|---|---|---|
| Color extraction | JCOLOR-001 to JCOLOR-002 | 2 | 0 | 0 |
| Profile computation | JCOLOR-003 to JCOLOR-005 | 3 | 0 | 0 |
| JoyAura display | JCOLOR-006 to JCOLOR-007 | 2 | 0 | 0 |
| Admin recompute | JCOLOR-008 to JCOLOR-009 | 2 | 0 | 0 |

**Summary:** 9 of 9 active specs implemented (brownfield bootstrap; specs reflect observed behavior).

## Key Findings

1. **Table name divergence between code and migration (resolved)** — TypeScript code uses `USER_COLOR_PROFILE_TABLE = "user_color_profile"` (singular); migrations created `public.user_color_profiles` (plural). Confirmed 2026-06-01: the live Supabase table IS `user_color_profile` (singular) — code is correct. The migration names a different table that is unused. Additionally, the aggregate columns (`hue_buckets`, `avg_saturation`, etc.) were found to also exist on `joy_spots` as phantom columns (added manually outside of migrations); those columns are never read or written by application code on `joy_spots` and should be dropped from that table.
2. **Recency weighting** — Spots submitted within the last 14 days contribute 2× weight to the color aggregation, making recent submissions more influential (`user-color-profile.ts:110-116`). [inferred: intentional to keep aura responsive to current mood]
3. **Recompute triggered on every submission** — Both `POST /api/submit-joy-spot` and `POST /api/profile` call `recomputeUserColorProfile` synchronously. A user who submits many spots quickly will trigger many full recomputes.
4. **`JoyAura` uses `requestAnimationFrame` without cleanup guard** — The effect returns a cancel function, but `blobs` and `particles` are stable memos — the effect only re-runs when those or `paused/size/speed` change, which is rarely. Acceptable pattern.
5. **Fallback blob when no profile** — `buildBlobsFromProfile` returns a single warm-gray blob when `colorProfile` is null or empty (`JoyAura.tsx:48-68`). The aura is always visible, just generic.
6. **`ProfileJoyColorCircles` dormant** — Present in `joy-color` scope but not rendered anywhere. May represent a design alternative to `JoyAura`.

## Work Required

### Must Fix
1. **Verify `device_id` uniqueness constraint on `user_color_profile`** — the upsert uses `onConflict: "device_id"`; if no PRIMARY KEY or UNIQUE constraint exists on that column, the upsert fails silently and the profile is never written. Run in Supabase SQL editor: `SELECT conname, contype FROM pg_constraint WHERE conrelid = 'public.user_color_profile'::regclass;` and add a constraint if missing.
2. **Drop phantom aggregate columns from `joy_spots`** — `hue_buckets`, `avg_saturation`, `avg_lightness`, `saturation_variance`, `color_temperature`, `top_hue_buckets` were added to `joy_spots` outside of migrations; they have no application code reading or writing them there.

### Should Fix
1. Debounce or background color recompute to avoid repeated full aggregations on bulk submission.

### Nice to Have
1. Either integrate or delete `ProfileJoyColorCircles`.
