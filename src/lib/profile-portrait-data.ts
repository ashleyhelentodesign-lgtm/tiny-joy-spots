import type { GallerySpot } from "@/components/GalleryGrid";
import {
  pickTopDominantColorsWithCounts,
  type DominantColorCount,
} from "@/lib/dominant-color";

/** Subject buckets inferred from tags, moods, and spot text. */
const JOY_SUBJECTS: { label: string; keywords: string[] }[] = [
  {
    label: "people",
    keywords: [
      "people",
      "person",
      "human",
      "humans",
      "friend",
      "friends",
      "family",
      "face",
      "faces",
      "portrait",
      "together",
      "community",
    ],
  },
  {
    label: "nature",
    keywords: [
      "nature",
      "tree",
      "trees",
      "flower",
      "flowers",
      "garden",
      "sky",
      "sun",
      "sunset",
      "beach",
      "ocean",
      "water",
      "leaf",
      "leaves",
      "plant",
      "plants",
      "outdoor",
      "outdoors",
      "park",
      "forest",
      "mountain",
      "cloud",
      "clouds",
      "rain",
    ],
  },
  {
    label: "dogs",
    keywords: ["dog", "dogs", "puppy", "puppies", "canine", "pup"],
  },
  {
    label: "cats",
    keywords: ["cat", "cats", "kitten", "kittens", "feline"],
  },
  {
    label: "food",
    keywords: [
      "food",
      "meal",
      "coffee",
      "tea",
      "baking",
      "bread",
      "cake",
      "dessert",
      "kitchen",
      "cafe",
      "restaurant",
      "cook",
      "cooking",
    ],
  },
  {
    label: "animals",
    keywords: [
      "animal",
      "animals",
      "bird",
      "birds",
      "wildlife",
      "creature",
      "creatures",
    ],
  },
  {
    label: "home",
    keywords: [
      "home",
      "house",
      "room",
      "cozy",
      "interior",
      "bed",
      "sofa",
      "window",
      "door",
    ],
  },
  {
    label: "light",
    keywords: ["light", "sunlight", "golden", "glow", "bright", "shine"],
  },
  {
    label: "art",
    keywords: [
      "art",
      "creative",
      "craft",
      "draw",
      "drawing",
      "paint",
      "painting",
      "music",
      "design",
    ],
  },
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "your",
  "you",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "but",
  "not",
  "all",
  "can",
  "just",
  "like",
  "what",
  "when",
  "where",
  "how",
  "about",
  "into",
  "out",
  "our",
  "its",
  "it's",
  "been",
  "being",
  "they",
  "them",
  "their",
  "there",
  "here",
  "who",
  "will",
  "would",
  "could",
  "should",
  "than",
  "then",
  "very",
  "also",
  "more",
  "some",
  "much",
  "many",
  "over",
  "such",
  "through",
  "after",
  "before",
  "while",
  "during",
  "between",
  "under",
  "above",
  "upon",
  "joy",
  "spot",
  "spots",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^'+|'+$/g, ""))
    .filter((t) => t.length >= 2);
}

function collectSpotTokens(spot: GallerySpot): string[] {
  const parts: string[] = [];
  if (spot.mood?.trim()) parts.push(spot.mood.trim());
  for (const tag of spot.tags) parts.push(tag.name);
  const body = [spot.caption, spot.text_content]
    .filter(Boolean)
    .join(" ");
  parts.push(...tokenize(body));
  return parts.map((p) => p.toLowerCase());
}

function tallySubjects(spots: GallerySpot[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const spot of spots) {
    const tokens = collectSpotTokens(spot);
    const matched = new Set<string>();
    for (const { label, keywords } of JOY_SUBJECTS) {
      if (matched.has(label)) continue;
      const hit = tokens.some((token) =>
        keywords.some(
          (kw) => token === kw || token.includes(kw) || kw.includes(token),
        ),
      );
      if (hit) {
        matched.add(label);
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function tallyTagsOnly(
  spots: GallerySpot[],
  limit: number,
): { label: string; count: number }[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const spot of spots) {
    for (const tag of spot.tags) {
      const label = tag.name.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      const prev = counts.get(key);
      if (prev) prev.count += 1;
      else counts.set(key, { label, count: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function tallyDescriptorWords(
  spots: GallerySpot[],
  limit: number,
): { label: string; count: number }[] {
  const counts = new Map<string, { label: string; count: number }>();

  const add = (raw: string) => {
    const label = raw.trim();
    if (!label) return;
    const key = label.toLowerCase();
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { label, count: 1 });
  };

  const subjectKeywords = new Set(
    JOY_SUBJECTS.flatMap((subject) => subject.keywords),
  );

  for (const spot of spots) {
    const body = [spot.caption, spot.text_content]
      .filter(Boolean)
      .join(" ");
    for (const token of tokenize(body)) {
      if (
        STOP_WORDS.has(token) ||
        token.length < 3 ||
        subjectKeywords.has(token)
      ) {
        continue;
      }
      add(token);
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function hexToPoeticColorName(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;

  if (l < 0.2) return "deep";
  if (l > 0.85) return "soft";
  if (r > g + 40 && r > b + 40) return r > 180 ? "warm" : "terracotta";
  if (g > r + 25 && g > b + 25) return "sage";
  if (b > r + 25 && b > g + 25) return "cool";
  if (r > 200 && g > 160 && b < 120) return "golden";
  if (r > 160 && g > 120 && b > 100) return "rosy";
  return "gentle";
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function buildJoyAuraSentence(
  spots: GallerySpot[],
  topColors: DominantColorCount[],
  subjects: string[],
  descriptorWords: string[],
): string | null {
  if (spots.length === 0) return null;

  const topColor = topColors[0];
  const colorPhrase = topColor
    ? `${hexToPoeticColorName(topColor.hex)} light`
    : null;

  const moods = [...new Set(spots.map((s) => s.mood?.trim()).filter(Boolean))].slice(
    0,
    2,
  ) as string[];

  const moodPhrase =
    moods.length > 0
      ? moods.length === 1
        ? `a ${moods[0]} pulse`
        : `${moods[0]} and ${moods[1]} threads`
      : null;

  const subjectPhrase =
    subjects.length > 0
      ? `drawn toward ${joinNatural(subjects.slice(0, 2))}`
      : null;

  const descriptorPhrase =
    descriptorWords.length > 0
      ? `you describe it with words like ${joinNatural(
          descriptorWords.slice(0, 2),
        )}`
      : null;

  const fragments = [
    colorPhrase,
    moodPhrase,
    subjectPhrase,
    descriptorPhrase,
  ].filter(Boolean) as string[];

  if (fragments.length === 0) {
    return "Your joy portrait is still gathering shape—each spot you share adds another thread.";
  }

  if (fragments.length === 1) {
    return `Your joy carries ${fragments[0]}.`;
  }

  if (colorPhrase && subjectPhrase) {
    const extraBits = [moodPhrase, descriptorPhrase].filter(Boolean);
    if (extraBits.length === 0) {
      return `Your joy feels ${colorPhrase} and quietly drawn toward ${joinNatural(
        subjects.slice(0, 2),
      )}.`;
    }
    return `Your joy feels ${colorPhrase}, ${joinNatural(
      subjects.slice(0, 2),
    )} keeps pulling you in, and ${extraBits.join(", ")}.`;
  }

  return `Your joy carries ${joinNatural(fragments)}.`;
}

export type ProfilePortraitData = {
  topColors: DominantColorCount[];
  joyAuraSentence: string | null;
  whatDrawsYouIn: string | null;
  wordsOfJoy: string[];
};

export function buildProfilePortraitData(
  spots: GallerySpot[],
): ProfilePortraitData {
  const topColors = pickTopDominantColorsWithCounts(spots, 5);
  const subjectTally = tallySubjects(spots);
  const topSubjects = subjectTally.slice(0, 2).map((s) => s.label);
  const wordsOfJoy = tallyTagsOnly(spots, 3).map((w) => w.label);
  const descriptorWords = tallyDescriptorWords(spots, 3).map((w) => w.label);

  const whatDrawsYouIn =
    topSubjects.length > 0 ? joinNatural(topSubjects) : null;

  const joyAuraSentence = buildJoyAuraSentence(
    spots,
    topColors,
    topSubjects,
    descriptorWords,
  );

  return {
    topColors,
    joyAuraSentence,
    whatDrawsYouIn,
    wordsOfJoy,
  };
}

export function formatProfileSpotCount(count: number): string {
  if (count === 1) return "1 spot";
  return `${count} spots`;
}
