---
parent: high-level-design
prefix: JCOLOR
---

# Joy Color

## Context and Design Philosophy

Joy Color is the pipeline that turns uploaded photos into a personal color identity. Each photo contributes up to 3 dominant color samples (with rank weights). These accumulate in a rolling per-device aggregate — the `UserColorProfile` — which the `JoyAura` canvas animates into a shifting color orb on the profile page.

The pipeline has three phases:
1. **Extraction** — client-side, at submission time.
2. **Aggregation** — server-side, triggered synchronously after each submission (and batchable via admin endpoint).
3. **Display** — client-side canvas animation driven by the stored aggregate.

## Color Extraction

`extractDominantColorsFromImageFile(file: File): Promise<ExtractedColor[]>` runs in the browser on form submit:

1. Creates a 32×32 canvas via `createImageBitmap`.
2. Iterates pixels; skips transparent, near-white (`sum > 720`), and near-black (`sum < 36`).
3. Quantizes each pixel into 32-step RGB buckets (`Math.round(channel / 32) * 32`).
4. Returns the top 3 buckets by pixel count as `ExtractedColor[]` with weights `[3, 2, 1]`.

Each `ExtractedColor` carries `{hex, h, s, l, weight}`. Stored on `joy_spots.extracted_colors` (JSONB array, max 3 entries per submission).

## Color Profile Aggregation

`recomputeUserColorProfile(supabase, deviceId)` is a full recomputation (not incremental):

1. Fetch all `joy_spots` for device: `id, created_at, extracted_colors, dominant_color`.
2. Build `SpotColorSample[]`: for each spot, parse `extracted_colors` (falling back to `dominant_color` if absent). Apply recency multiplier: `2×` if `created_at` is within 14 days, `1×` otherwise.
3. Aggregate weighted samples into:
   - **12 hue buckets** (0, 30, 60, …, 330°) — weighted totals.
   - **avg_saturation**, **avg_lightness** — weighted means.
   - **saturation_variance** — weighted variance.
   - **color_temperature** — normalized proportions: warm (H 0–90°), green (H 90–150°), cool (H 150–360°), neutral (S < 15%).
   - **top_hue_buckets** — top 3 non-zero buckets by weight, each with a `representative_hex` (`hslToHex(bucket_start + 15, avgS, avgL)`).
4. Upsert `user_color_profile` (keyed by `device_id`).

### Triggering

Recompute is triggered:
- After `POST /api/submit-joy-spot` (every submission)
- After `POST /api/profile` (profile creation)
- By `GET|POST /api/admin/recompute-color-profiles` (all devices)

All three call `recomputeUserColorProfile` synchronously; failure is logged but does not propagate to the caller.

## JoyAura Visualization

`JoyAura` is a `<canvas>` component driven by `requestAnimationFrame`. It renders:

1. **Warm inner glow** — radial gradient, always present.
2. **Color blobs** — one per entry in `top_hue_buckets` (up to 5). Each blob oscillates with independent sinusoidal frequencies (`fx`, `fy`) and amplitudes (`ampX`, `ampY`). Rendered as a radial gradient with alpha falloff.
3. **Circular crop** — `destination-out` radial gradient at the orb edge for smooth boundary.
4. **Particles** — 13 white specks orbiting at varying speeds and radii.
5. **Depth shadow** — subtle off-center shadow for dimensionality.

Blob parameters (`ox`, `oy`, `fx`, `fy`, phase offsets, amplitudes) are computed from `top_hue_buckets` by `buildBlobsFromProfile`. When no profile or empty buckets, `buildFallbackBlobs` returns a single warm-gray blob.

`paused` prop stops time advancement (keeps canvas frozen at last frame). `speed` scales the time increment.

## Admin Recompute

`GET|POST /api/admin/recompute-color-profiles` is protected by `ADMIN_RECOMPUTE_KEY` env var (checked as `Authorization: Bearer {key}` header or `?key=` query param). It:

1. Fetches all distinct `device_id` values from `joy_spots` using service role.
2. Normalizes each via `normalizeJoySpotsDeviceId`.
3. Iterates and calls `recomputeUserColorProfile` for each; collects failures.
4. Returns `{total_devices, processed, failures[]}`.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Full recompute on each trigger | Re-aggregate all spots | Incremental delta update | Correctness; simpler to reason about; spot counts small [inferred] |
| Client-side extraction (32×32 canvas) | Browser canvas API | Server-side sharp/Jimp | Avoids native dep on server; client has file in memory [inferred] |
| Recency multiplier (2× < 14 days) | Time-based weight boost | Equal weight all time | Makes aura responsive to recent emotional state [inferred] |
| 12 hue buckets at 30° | Fixed bucket grid | Adaptive clustering | Simple to aggregate, display, and explain [inferred] |
| `representative_hex` from avg S/L | `hslToHex(start+15, avgS, avgL)` | Modal hex from raw samples | Consistent saturation/lightness with the overall palette feel [inferred] |
| JoyColorAuraPreview as CSS-only | CSS animation, no data | Show nothing until profile | Immediate visual feedback before color profile exists [inferred] |

## Open Questions & Future Decisions

### Resolved
*(none yet)*

### Deferred
1. **Table name** — code uses `user_color_profile` (singular); migrations created `user_color_profiles` (plural). Verify live Supabase table name and align.
2. Should recompute be async (Edge Function / queue) to remove latency from submissions?
3. `ProfileJoyColorCircles` — integrate or delete? (Currently dormant)
4. Should `JoyAura` expose its color state for use by other UI elements (e.g., tinting the profile header)?

## References

- Arrow doc: docs/arrows/joy-color.md
- EARS: docs/intent/joy-color/joy-color-specs.md
- Consumed by: know-yourself (JoyAura, UserColorProfile)
- Triggered by: share-a-spot, claim-identity
