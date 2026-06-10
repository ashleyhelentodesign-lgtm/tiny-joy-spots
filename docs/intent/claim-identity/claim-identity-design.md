---
parent: high-level-design
prefix: IDENT
---

# Claim Identity

## Context and Design Philosophy

Joy Spots uses no authentication. Identity is a UUID cookie (`joy_spots_device_id`) issued per browser on first API interaction. A profile is a voluntary layer on top: it lets a device claim a display name and bio that will appear on its spots going forward. Creating a profile is always optional; the system invites users after they have posts worth claiming.

The core invariant: one profile per device, never required, never blocking. The invite system nudges rather than walls.

## Device Identity

`JOY_SPOTS_DEVICE_COOKIE = "joy_spots_device_id"` is a normalized UUID (trimmed, lowercased). It is:

- **Issued** by `POST /api/submit-joy-spot` or `GET /api/profile` when absent from the request.
- **Read** on every API call that needs to identify the caller.
- **Normalized** via `normalizeJoySpotsDeviceId` (trim + lowercase → null if empty) to match DB values.

The cookie is `httpOnly: false`, `sameSite: lax`, 1-year expiry. Non-httpOnly allows the client to read it for the Supabase `x-device-id` header (RLS enforcement).

## Profile CRUD

### Creation — POST /api/profile

1. Parse/issue device cookie.
2. Validate `display_name` (non-empty after trim) and optional `bio` (≤ 160 chars).
3. Check for existing profile (`SELECT id FROM profiles WHERE device_id = ?`). Return 409 if found.
4. Insert `profiles` row — `avatar_color` is assigned by the `profiles_before_insert` DB trigger.
5. Call `recomputeUserColorProfile` (awaited, failure logged only).
6. Return the created profile.

### Fetch — GET /api/profile

Returns `{ profile: Profile | null }`. Issues device cookie if absent. Used by:
- `use-viewer-profile` hook (gallery shell)
- `SubmissionForm` (to pre-fill contributor name)
- `ProfileInvitationCta` (footer)

### No Update Endpoint

Profile update (display name, bio) is not yet implemented. `avatar_color` is DB-managed.

## Viewer Profile Hook

`use-viewer-profile` fetches `GET /api/profile` on mount with cancellation on unmount. Exposes:

- `profile: Profile | null | undefined` — `undefined` while loading, `null` if no profile.
- `promptDismissed` — initialized from `isProfilePromptDismissed()` (cookie read at hook instantiation).
- `dismissPrompt()` — writes dismiss cookie and sets state.
- `setProfileFromCreate(profile)` — called by `ProfileCreateModal` on success to update state without re-fetch.

## Profile Create Flow

`ProfileCreateModal` wraps `ProfileCreateForm` in a full-viewport overlay. On open, `formKey` increments to reset the form. On success, `onCreated(profile)` is called (updates gallery shell state), the modal closes, and `router.push('/profile')` navigates to the profile page.

`ProfileCreateForm` shows `JoyColorAuraPreview` (CSS-animated placeholder aura) as a visual incentive before the form fields.

## Invite CTAs

Three surfaces invite profile creation:

| Surface | Trigger | Component |
|---|---|---|
| Gallery grid header | Viewer owns ≥1 spot, no profile, not dismissed | `GalleryProfileInviteCard` |
| Site footer | Viewer has no profile | `ProfileInvitationCta` |
| `/profile/new` route | Direct navigation | Opens `ProfileCreateModal`, redirects home on close |

`GalleryProfileHeaderLink` renders the viewer's avatar in the site header when a profile exists, linking to `/profile`.

## Avatar Color

`avatar_color` is assigned by the `profiles_before_insert` DB trigger (`profiles_before_write`), which calls `pick_profile_avatar_color(device_id)`. This function queries `joy_spots` for the most frequent `dominant_color` for the device; if none exists, picks a random entry from the 8-color `profile_avatar_palette()`. The color is never sent from the client.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Device cookie, no auth | UUID cookie, no login | Email/OAuth auth | Zero friction; community-journal tone doesn't need accounts [inferred] |
| Profile is optional, never required | Opt-in invite | Required before posting | Post-first, claim-later reduces abandonment [inferred] |
| `avatar_color` assigned by DB trigger | Trigger calls SQL function | Application-layer assignment | Consistent with the DB managing derived fields [inferred] |
| Cookie not httpOnly | `httpOnly: false` | `httpOnly: true` | Client must read it for Supabase `x-device-id` RLS header [inferred] |
| One profile per device | Unique index on `trim(lower(device_id))` | Multiple profiles | Simplest identity model; one "you" per browser [inferred] |

## Open Questions & Future Decisions

### Resolved
*(none yet)*

### Deferred
1. Profile update endpoint — currently create-only; display name and bio cannot be changed.
2. Profile deletion — no mechanism to remove a profile.
3. Consolidate duplicate `/api/profile` fetches (gallery shell + footer CTA + submission form each fetch independently on mount).
4. Should device ID issuance move to middleware so all visitors get a cookie on first page load?

## References

- Arrow doc: docs/arrows/claim-identity.md
- EARS: docs/intent/claim-identity/claim-identity-specs.md
