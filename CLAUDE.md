@AGENTS.md

## LID

- Mode: Full
- HLD: docs/high-level-design.md
- Arrow index: docs/arrows/index.yaml
- Segments: share-a-spot · browse-spots · explore-by-tag · claim-identity · know-yourself · joy-color

### Arrow navigation

| Segment | Arrow doc | Design | Specs |
|---|---|---|---|
| share-a-spot | docs/arrows/share-a-spot.md | docs/intent/share-a-spot/share-a-spot-design.md | docs/intent/share-a-spot/share-a-spot-specs.md |
| browse-spots | docs/arrows/browse-spots.md | docs/intent/browse-spots/browse-spots-design.md | docs/intent/browse-spots/browse-spots-specs.md |
| explore-by-tag | docs/arrows/explore-by-tag.md | docs/intent/explore-by-tag/explore-by-tag-design.md | docs/intent/explore-by-tag/explore-by-tag-specs.md |
| claim-identity | docs/arrows/claim-identity.md | docs/intent/claim-identity/claim-identity-design.md | docs/intent/claim-identity/claim-identity-specs.md |
| know-yourself | docs/arrows/know-yourself.md | docs/intent/know-yourself/know-yourself-design.md | docs/intent/know-yourself/know-yourself-specs.md |
| joy-color | docs/arrows/joy-color.md | docs/intent/joy-color/joy-color-design.md | docs/intent/joy-color/joy-color-specs.md |

### Working with this codebase

Before any code change, identify which segment(s) it touches via the arrow index. Read the relevant design doc and EARS specs. After the change, update the arrow doc's Key Findings and Work Required if needed.
