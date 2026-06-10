# High-Level Design: Joy Spots

## Problem

Small joyful moments disappear. They're too minor to post to social media, too fleeting to journal, and too personal to share publicly with a name attached. There's no lightweight, low-friction way to record and share them with a community — and no way for that community to reflect back what those moments say about you collectively.

## Approach

A no-auth, no-account web app where any browser visitor can share a joy spot — a photo or a few words — and see the community's spots in a shared gallery. Identity is a UUID cookie; participation requires nothing more than a working browser. Optionally, users can claim a display name that attaches to their spots going forward.

The personal layer turns the act of posting into self-discovery: color extracted from uploaded photos accumulates into a "joy color profile," and the profile page reflects back a prose portrait — aura sentence, subjects drawn toward, words of joy.

## Target Users

- **Browsers** — visit the gallery to see what the community has shared; no account, no expectations.
- **Posters** — share one or more joy spots from this device; want it fast and frictionless; may never return.
- **Identity claimers** — have accumulated spots and want to put a name to them; want to see their joy portrait.
- **Ashley (operator)** — sole creator and moderator; needs an admin recompute endpoint; monitors via Supabase dashboard.

## Goals

- Any visitor can share a joy spot in under 60 seconds with no account.
- All community spots are visible in one public gallery, newest first.
- A user with ≥1 photo spots sees a meaningful Joy Color aura on their profile within one recompute.
- Tags enable cross-spot discovery in both gallery filter and tag-map views.
- The system runs entirely on Supabase (DB + Storage) and Vercel (Next.js) with zero additional infrastructure.

## Non-Goals

- User authentication (no email, OAuth, or passwords).
- Direct messaging or social graph features.
- Moderation tools beyond Supabase dashboard access.
- Mobile native apps.
- Paid tiers or access control.

## Tenets

- **Frictionless over complete.** When a feature would require an account, a form field, or a confirmation step that isn't strictly necessary, remove it. A posted spot with no metadata is better than an abandoned form.
- **Device is identity, profile is optional decoration.** The cookie is the source of truth for ownership. A profile adds a name — it never gates access or changes what the device can do.
- **Reflect back, don't judge.** The joy portrait synthesizes what users post into something that feels true and warm, not analytical. Language is poetic, not clinical.

## System Design

```
Browser
  │
  ├── GET /          →  GalleryServerBody (SSR, anon Supabase)
  │                       └── GalleryShell (client: modals, header, grid)
  │
  ├── GET /tag-map   →  TagPhotoMap page (SSR + client graph layout)
  │
  ├── GET /profile   →  ProfilePage (SSR, service role Supabase)
  │                       └── ProfilePageClient (client: tabs, portrait)
  │
  ├── POST /api/submit-joy-spot  →  upload Storage + insert joy_spots + recompute color
  ├── DELETE /api/joy-spots/[id] →  ownership check + storage remove + DB delete
  ├── GET|POST /api/profile      →  profile CRUD (service role)
  └── GET|POST /api/admin/recompute-color-profiles  →  batch color recompute

Supabase (Postgres + Storage)
  ├── joy_spots          — core content
  ├── tags               — shared tag vocabulary
  ├── joy_spot_tags      — spot↔tag junction
  ├── profiles           — optional device identity
  └── user_color_profile — rolling color aggregates per device

External
  └── Photon/Komoot      — geocoding API (location picker)
```

RLS enforces device ownership via `x-device-id` request header on the anon client. Server API routes use the service role key, enforcing ownership in application code.

## Key Design Decisions

*(not yet specified — flesh out in segment LLDs and promote load-bearing decisions here)*

## Success Metrics

*(not yet specified)*

## References

- Arrow docs: docs/arrows/
- Segment designs: docs/intent/
- Supabase migrations: supabase/migrations/
