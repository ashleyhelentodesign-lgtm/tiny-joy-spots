# EARS Specs — Joy Color (JCOLOR)

Prefix: `JCOLOR`

Spec status: `[x]` observed working · `[ ]` broken or partial · `[D]` intentional non-feature

---

## Color Extraction

- [x] **JCOLOR-001** — WHEN a user selects a photo for submission, the system SHALL extract up to 3 dominant colors client-side by downsampling the image to 32×32, bucketing pixels into 32-step RGB quantization buckets (excluding transparent, near-white `sum > 720`, and near-black `sum < 36` pixels), and returning the top 3 buckets with weights 3, 2, and 1.

- [x] **JCOLOR-002** — WHEN a photo submission includes extracted colors, the system SHALL store them as JSONB on `joy_spots.extracted_colors`; WHEN no extracted colors are present and a legacy `dominant_color` exists, the system SHALL use it as a single-entry fallback with weight 3 during aggregation.

## Profile Computation

- [x] **JCOLOR-003** — WHEN `recomputeUserColorProfile` is called for a device, the system SHALL fetch all of that device's joy spots, aggregate their color samples into 12 hue buckets (30° each, 0–330°), and compute weighted-average saturation, lightness, saturation variance, and color temperature proportions (warm/cool/green/neutral).

- [x] **JCOLOR-004** — WHEN building color samples, the system SHALL apply a recency multiplier of 2× to spots submitted within the last 14 days and 1× to older spots, so recent submissions influence the color profile more strongly.

- [x] **JCOLOR-005** — AFTER aggregation, the system SHALL upsert a `user_color_profile` row for the device (keyed by `device_id`) containing the computed hue buckets, averages, top 3 hue buckets with representative hex values, and an `updated_at` timestamp.

## JoyAura Display

- [x] **JCOLOR-006** — WHEN `JoyAura` renders with a `UserColorProfile`, the system SHALL animate up to 5 color blobs on a canvas using `requestAnimationFrame`, each blob positioned and oscillating based on its hue bucket's angular position and weight, with a circular crop mask and orbiting particle specks.

- [x] **JCOLOR-007** — WHEN `JoyAura` renders with no `UserColorProfile` or empty `top_hue_buckets`, the system SHALL display a single warm-gray fallback blob so the canvas is never blank.

## Admin Recompute

- [x] **JCOLOR-008** — WHEN `GET /api/admin/recompute-color-profiles` or `POST /api/admin/recompute-color-profiles` is called with a valid `ADMIN_RECOMPUTE_KEY` (as `Authorization: Bearer {key}` or `?key=`), the system SHALL recompute color profiles for all distinct device IDs found in `joy_spots` and return a summary of `{total_devices, processed, failures}`.

- [x] **JCOLOR-009** — WHEN the admin recompute endpoint is called without a valid key, the system SHALL return 401 and SHALL NOT recompute any profiles.
