# Arrow: claim-identity

How a browser device becomes "someone" — the device cookie, optional profile creation, and the CTA to claim spots.

## Status

**MAPPED** — last audited 2026-06-01 (git SHA `null`). Initial brownfield mapping; no prior design docs.

## References

### HLD
- docs/high-level-design.md (Claim Identity section)

### LLD
- docs/intent/claim-identity/claim-identity-design.md

### EARS
- docs/intent/claim-identity/claim-identity-specs.md (9 specs)

### Tests
- None found.

### Code
- src/lib/joy-spots-device.ts
- src/lib/joy-spots-device-client.ts
- src/lib/profile.ts
- src/lib/profile-server.ts
- src/lib/profile-prompt-dismissal.ts
- src/hooks/use-viewer-profile.ts
- src/app/api/profile/route.ts
- src/app/profile/new/page.tsx
- src/components/ProfileCreateForm.tsx
- src/components/ProfileCreateModal.tsx
- src/components/ProfileAvatar.tsx
- src/components/GalleryProfileInviteCard.tsx
- src/components/GalleryProfileHeaderLink.tsx
- src/components/ProfileInvitationCta.tsx

## Architecture

**Purpose:** Enables a device to optionally attach a display name and bio to its joy spots. Identity is device-scoped (one profile per UUID cookie, no auth). A profile is never required to post; the system invites users after they have accumulated spots. Creating a profile triggers an initial color profile computation.

**Key Components:**

1. `joy-spots-device.ts` — Cookie name constant (`joy_spots_device_id`), normalize (trim + lowercase), parse from `Cookie:` header. The authoritative source of device identity across server and client.
2. `profile.ts` — `Profile` type, validation helpers, `mapProfileRow`, avatar palette constant. Pure domain logic with no I/O.
3. `GET /api/profile` — Returns the viewer's profile by device cookie (or null); issues device cookie if missing.
4. `POST /api/profile` — Creates a profile for the device; validates display name; triggers initial `recomputeUserColorProfile`; rejects if profile already exists (409).
5. `use-viewer-profile` hook — Client hook that fetches `/api/profile` on mount and manages profile state + prompt-dismiss state.
6. `ProfileCreateForm` — Controlled form for name + bio; submits to `POST /api/profile`; shows `JoyColorAuraPreview` as visual incentive.
7. `ProfileCreateModal` — Modal wrapper around `ProfileCreateForm`; resets form on open; handles scroll lock.
8. `GalleryProfileInviteCard` — Invite card shown in the gallery when the viewer has spots but no profile and hasn't dismissed.
9. `ProfileInvitationCta` — Footer CTA; polls `/api/profile` independently on mount.
10. `GalleryProfileHeaderLink` — Avatar link to `/profile` shown in the site header when viewer has a profile.
11. `profile-prompt-dismissal.ts` — Client-only: reads/writes `joy_spots_profile_prompt_dismissed=1` cookie.

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|---|---|---|---|---|
| Device cookie | IDENT-001 to IDENT-002 | 2 | 0 | 0 |
| Profile CRUD | IDENT-003 to IDENT-005 | 3 | 0 | 0 |
| Invite CTAs | IDENT-006 to IDENT-007 | 2 | 0 | 0 |
| Profile display | IDENT-008 to IDENT-009 | 2 | 0 | 0 |

**Summary:** 9 of 9 active specs implemented (brownfield bootstrap; specs reflect observed behavior).

## Key Findings

1. **Device ID issued on first API call, not on first page load** — The cookie is set by `POST /api/submit-joy-spot` or `GET /api/profile`, not by a middleware or page load. A viewer who never submits or fetches their profile has no persistent ID. [inferred: acceptable since ownership only matters for spots you've submitted]
2. **Profile invite shown at most once per session per dismissal** — Dismissal writes a 1-year cookie client-side. The gallery invite card is also gated on `ownsAnySpot` which is computed from SSR data — requires `viewer_owns_spot` on at least one spot in the current page load (`gallery-shell.tsx:20-26`).
3. **`ProfileInvitationCta` fetches profile independently** — The footer CTA runs its own `fetch('/api/profile')` on mount, unconnected to `use-viewer-profile`. Duplicate request in the gallery shell where both exist.
4. **Profile creation is idempotent from the UI** — POST returns 409 if a profile exists; the form shows the error string. No update flow exists yet. [inferred: intentional MVP scope]
5. **`avatar_color` set by DB trigger** — The `profiles_before_insert` trigger calls `pick_profile_avatar_color()` which picks the most common `dominant_color` from existing spots or falls back to a random palette entry. App code does not send `avatar_color` on insert.

## Work Required

### Must Fix
- None identified.

### Should Fix
1. Consolidate duplicate `/api/profile` fetches (invite card + footer CTA + gallery shell all fetch independently).
2. Add profile update endpoint (currently create-only).

### Nice to Have
1. Middleware-based device cookie issuance so all visitors get an ID immediately.
