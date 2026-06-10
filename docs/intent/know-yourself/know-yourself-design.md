---
parent: high-level-design
prefix: PORTRAIT
---

# Know Yourself

## Context and Design Philosophy

Know-yourself is the personal reflection surface. Once a user has a profile and some spots, the profile page gives back something meaningful: a prose aura sentence, a subject summary, and their most-used tags — assembled entirely from what they posted. The goal is to make posting feel generative, not just archival.

The profile page is SSR-only (no streaming). All data is fetched server-side; portrait analytics run client-side from the already-fetched spots array.

## Page Structure

```
/profile  (SSR, force-dynamic implied by cookies())
  └── ProfilePage (server component)
        ├── fetch profile → redirect to /profile/new if null
        ├── fetchJoySpotsForDevice()
        ├── pickTopDominantColorsWithCounts() → avatarColor
        ├── getUserColorProfileForDevice() → UserColorProfile | null
        └── ProfilePageClient (client boundary)
              ├── ProfileHeaderSection
              │     ├── ProfileAvatar + display name + bio
              │     ├── back-to-gallery link
              │     └── ProfileNavTabs ("Joy spots N" | "Joy portrait")
              └── [activeTab === 'portrait']
                    ProfileJoyPortraitView
                      ├── JoyAura (canvas, driven by UserColorProfile)
                      ├── Joy aura sentence (prose, from buildProfilePortraitData)
                      ├── "What draws you in" (subject tally)
                      └── "Words of joy" (top 3 tags)
              └── [activeTab === 'spots']
                    mySpotsSection (slot from server — ProfileMySpotsSection)
```

## Portrait Analytics

`buildProfilePortraitData(spots: GallerySpot[]): ProfilePortraitData` runs in `ProfilePageClient` on every render (pure function, no effect). It produces:

### Subject Tally

`tallySubjects` matches each spot's tokens (mood, tags, caption + text_content lowercased words) against 9 subject keyword lists: people, nature, dogs, cats, food, animals, home, light, art. Each spot can match multiple subjects; each match increments that subject's count. Top 2 subjects become `whatDrawsYouIn`.

Matching uses substring containment in both directions (`token.includes(kw) || kw.includes(token)`), which can false-positive on short keywords. [inferred: known trade-off; acceptable at current vocabulary size]

### Words of Joy

`tallyTagsOnly` counts tag occurrences across all spots and returns the top 3 labels as `wordsOfJoy`. Tag display names (original case) are used as labels.

### Joy Aura Sentence

`buildJoyAuraSentence` assembles a prose sentence from up to 4 fragments:

- **Color phrase** — derived from the top `DominantColorCount` via `hexToPoeticColorName` (maps hue/lightness to: deep, soft, warm, terracotta, sage, cool, golden, rosy, gentle)
- **Mood phrase** — first 1–2 distinct moods across spots (`"a {mood} pulse"` or `"{m1} and {m2} threads"`)
- **Subject phrase** — `"drawn toward {subject1} and {subject2}"`
- **Descriptor phrase** — `"you describe it with words like {word1} and {word2}"` (from `tallyDescriptorWords`: body text tokens minus stop words, subject keywords, and tokens < 3 chars)

Fragments are joined with natural-language conjunctions via `joinNatural`.

## My Spots Tab

`ProfileMySpotsSection` renders `GalleryGrid` with `showExplorerSearch=false`. It uses `viewer_owns_spot: true` on all spots (since only the viewer's own spots are loaded). Empty state shows a "Share a joyspot" button that opens `ShareJoySpotModal`.

## Avatar Color on Profile Page

`ProfilePage` (server) computes `avatarColor` from `pickTopDominantColorsWithCounts(mySpots, 5)[0]?.hex ?? pickMostCommonDominantColor(mySpots, profile.avatar_color)`. This overwrites the DB-assigned `profile.avatar_color` with the live color frequency calculation. `ProfilePageClient` receives this as a prop and passes it to `ProfileHeaderSection` → `ProfileAvatar`.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Portrait analytics client-side | `buildProfilePortraitData` in client component | Server component or API endpoint | Data already available in client; avoids extra round-trip [inferred] |
| Default tab is "Joy portrait" | `useState<ProfileTab>("portrait")` | Default to "Joy spots" | Portrait is the differentiated, emotional surface; spots tab is secondary [inferred] |
| Avatar color recomputed on profile load | `pickTopDominantColorsWithCounts` overrides DB value | Use `profile.avatar_color` directly | Live computation reflects latest spots; DB value may be stale [inferred] |
| `ProfileJoyColorCircles` not rendered | Component exists but not used | Render alongside JoyAura | Design superseded by JoyAura canvas; circles remain as dormant alternative [inferred] |

## Open Questions & Future Decisions

### Resolved
*(none yet)*

### Deferred
1. Should portrait analytics move server-side for consistency? (Subject matching is somewhat expensive for large spot counts.)
2. `ProfileJoyColorCircles` — integrate into portrait or delete?
3. Subject false-positives from substring matching (e.g., `"art"` in `"party"`) — add word-boundary check?
4. Should the profile page display bio editing inline?

## References

- Arrow doc: docs/arrows/know-yourself.md
- EARS: docs/intent/know-yourself/know-yourself-specs.md
- Depends on: joy-color (UserColorProfile, JoyAura)
