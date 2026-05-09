import type { GallerySpot } from "@/components/GalleryGrid";
import { matchesSearch } from "@/lib/gallery-filters";

export type ExplorerChip = {
  id: string;
  kind: "tag" | "author" | "location" | "text";
  value: string;
  label: string;
};

export function chipId(kind: ExplorerChip["kind"], value: string) {
  return `${kind}:${value.toLowerCase()}`;
}

export function tagChipForName(name: string): ExplorerChip {
  const trimmed = name.trim();
  return {
    id: chipId("tag", trimmed),
    kind: "tag",
    value: trimmed,
    label: trimmed,
  };
}

/** Appends a tag filter chip if that tag is not already active. */
export function addTagChipIfNew(
  chips: ExplorerChip[],
  tagName: string,
): ExplorerChip[] {
  const chip = tagChipForName(tagName);
  if (chips.some((c) => c.id === chip.id)) return chips;
  return [...chips, chip];
}

export function matchesExplorerChips(
  spot: GallerySpot,
  chips: ExplorerChip[],
): boolean {
  if (chips.length === 0) return true;
  for (const c of chips) {
    if (c.kind === "tag") {
      if (
        !spot.tags.some(
          (t) => t.name.toLowerCase() === c.value.toLowerCase(),
        )
      ) {
        return false;
      }
    } else if (c.kind === "author") {
      const n = spot.contributor_name?.trim();
      if (!n || n.toLowerCase() !== c.value.toLowerCase()) return false;
    } else if (c.kind === "location") {
      const loc = spot.location_text.trim();
      if (!loc || loc.toLowerCase() !== c.value.toLowerCase()) return false;
    } else if (c.kind === "text") {
      if (!matchesSearch(spot, c.value)) return false;
    }
  }
  return true;
}
