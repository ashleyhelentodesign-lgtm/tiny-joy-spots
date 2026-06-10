# Arrow: know-yourself

The profile page — Joy Portrait tab and My Spots tab — reflecting what your spots reveal about you.

## Status

**MAPPED** — last audited 2026-06-01 (git SHA `null`). Initial brownfield mapping; no prior design docs.

## References

### HLD
- docs/high-level-design.md (Know Yourself section)

### LLD
- docs/intent/know-yourself/know-yourself-design.md

### EARS
- docs/intent/know-yourself/know-yourself-specs.md (8 specs)

### Tests
- None found.

### Code
- src/app/profile/page.tsx
- src/app/profile/layout.tsx
- src/components/profile/ProfilePageClient.tsx
- src/components/profile/ProfileJoyPortraitView.tsx
- src/components/profile/ProfileHeaderSection.tsx
- src/components/profile/ProfileNavTabs.tsx
- src/components/ProfileMySpotsSection.tsx
- src/lib/profile-portrait-data.ts
- src/lib/fetch-device-joy-spots.ts

## Architecture

**Purpose:** Provides a personal reflection surface for users who have created a profile. The profile page is server-rendered (SSR) and redirects to `/profile/new` if no profile exists. The "Joy Portrait" tab synthesizes the user's spots into a prose aura sentence, a subject summary, and a words-of-joy tag cloud. The "Joy Spots" tab shows the user's own posts in a gallery grid.

**Key Components:**

1. `ProfilePage` (server component) — SSR: reads device cookie, fetches profile (redirect if none), fetches device's joy spots, computes top color palette, fetches `UserColorProfile`. Passes all data to `ProfilePageClient`.
2. `ProfilePageClient` — Client component managing tab state (`portrait` | `spots`); renders `ProfileHeaderSection` and either `ProfileJoyPortraitView` or `mySpotsSection` slot.
3. `ProfileHeaderSection` — Avatar, display name, bio, back-to-gallery link, and `ProfileNavTabs`.
4. `ProfileNavTabs` — Two-button tab bar: "Joy spots (N)" and "Joy portrait".
5. `ProfileJoyPortraitView` — Lays out the portrait: joy aura sentence, "what draws you in", "words of joy" tags, and `JoyAura` canvas. Calls `buildProfilePortraitData` client-side.
6. `buildProfilePortraitData` (`profile-portrait-data.ts`) — Pure analytics: tallies subjects (keyword matching against 9 subject buckets), tallies descriptor words (excluding stop words and subject keywords), picks top colors, and generates the prose aura sentence.
7. `ProfileMySpotsSection` — Wraps `GalleryGrid` with `showExplorerSearch=false`; shows spot count line and a share-spot CTA when empty.
8. `fetch-device-joy-spots.ts` — Server-side Supabase query for all spots belonging to a device (service role or anon key).

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|---|---|---|---|---|
| Page routing | PORTRAIT-001 to PORTRAIT-002 | 2 | 0 | 0 |
| Portrait analytics | PORTRAIT-003 to PORTRAIT-005 | 3 | 0 | 0 |
| My Spots tab | PORTRAIT-006 to PORTRAIT-007 | 2 | 0 | 0 |
| Portrait display | PORTRAIT-008 | 1 | 0 | 0 |

**Summary:** 8 of 8 active specs implemented (brownfield bootstrap; specs reflect observed behavior).

## Key Findings

1. **Portrait analytics run client-side** — `buildProfilePortraitData` is called inside `ProfilePageClient` (client component), so portrait generation runs in the browser on every render. Data (`spots`) is already SSR-fetched and passed as a prop. [inferred: acceptable given small spot counts per user]
2. **`ProfileJoyColorCircles` is unused** — Component exists at `src/components/profile/ProfileJoyColorCircles.tsx` and renders color bubbles scaled by frequency count. It is not imported or rendered anywhere in the current profile page. Appears to be a parallel/prior design superseded by `JoyAura`.
3. **Avatar color on profile page overrides DB value** — `ProfilePage` computes `avatarColor` from `pickTopDominantColorsWithCounts` client-side and passes it to `ProfilePageClient`, rather than using `profile.avatar_color` from the DB directly (`profile/page.tsx:35-39`). DB value is used as fallback only.
4. **"Joy portrait" is the default tab** — `ProfilePageClient` initializes `activeTab` to `"portrait"`, so the portrait view shows first on profile load.
5. **Subject matching is fuzzy** — `tallySubjects` uses both `token === kw` (exact) and `token.includes(kw) || kw.includes(token)` (substring), which can produce false positives on short keywords (e.g., `"art"` matching `"party"`).

## Work Required

### Must Fix
- None identified.

### Should Fix
1. Remove or integrate `ProfileJoyColorCircles` — dead component.
2. Fix substring subject matching to avoid false positives (e.g., use word-boundary check).

### Nice to Have
1. Move portrait analytics to server-side computation for consistency with color profile.
