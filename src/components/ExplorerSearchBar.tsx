"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GallerySpot } from "@/components/GalleryGrid";
import { type ExplorerChip, chipId } from "@/lib/explorer-filters";
import { cn } from "@/lib/utils";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

const filterChipClass =
  "inline-flex max-w-full min-w-0 items-center gap-2 rounded-full bg-[#8B7E74] px-5 py-2.5 font-normal lowercase leading-snug text-white transition-colors hover:bg-[#7a6e66]";

type Suggestion =
  | { kind: "tag"; value: string; label: string }
  | { kind: "author"; value: string; label: string }
  | { kind: "location"; value: string; label: string }
  | { kind: "text"; value: string; label: string };

function buildIndexes(spots: GallerySpot[]) {
  const tagNames = new Map<string, string>();
  const authors = new Map<string, string>();
  const locations = new Map<string, string>();

  for (const s of spots) {
    for (const t of s.tags) {
      const k = t.name.toLowerCase();
      if (!tagNames.has(k)) tagNames.set(k, t.name);
    }
    if (s.contributor_name?.trim()) {
      const v = s.contributor_name.trim();
      authors.set(v.toLowerCase(), v);
    }
    if (s.location_text.trim()) {
      const v = s.location_text.trim();
      locations.set(v.toLowerCase(), v);
    }
  }

  return {
    tagNames: [...tagNames.entries()].sort((a, b) =>
      a[1].localeCompare(b[1]),
    ),
    authors: [...authors.values()].sort((a, b) => a.localeCompare(b)),
    locations: [...locations.values()].sort((a, b) => a.localeCompare(b)),
  };
}

type ExplorerSearchBarProps = {
  spots: GallerySpot[];
  chips: ExplorerChip[];
  onChipsChange: (next: ExplorerChip[]) => void;
  className?: string;
};

export function ExplorerSearchBar({
  spots,
  chips,
  onChipsChange,
  className,
}: ExplorerSearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedIds = useMemo(
    () => new Set(chips.map((c) => c.id)),
    [chips],
  );

  const indexes = useMemo(() => buildIndexes(spots), [spots]);

  const suggestions = useMemo((): Suggestion[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: Suggestion[] = [];
    const seen = new Set<string>();

    const textId = chipId("text", query.trim());
    if (!selectedIds.has(textId)) {
      out.push({
        kind: "text",
        value: query.trim(),
        label: `Match all text: “${query.trim()}”`,
      });
    }

    for (const [, name] of indexes.tagNames) {
      if (!name.toLowerCase().includes(q)) continue;
      const id = chipId("tag", name);
      if (selectedIds.has(id)) continue;
      const key = `tag:${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: "tag", value: name, label: name });
    }

    for (const name of indexes.authors) {
      if (!name.toLowerCase().includes(q)) continue;
      const id = chipId("author", name);
      if (selectedIds.has(id)) continue;
      const key = `author:${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        kind: "author",
        value: name,
        label: `Author: ${name}`,
      });
    }

    for (const place of indexes.locations) {
      if (!place.toLowerCase().includes(q)) continue;
      const id = chipId("location", place);
      if (selectedIds.has(id)) continue;
      const key = `location:${place.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        kind: "location",
        value: place,
        label: `Place: ${place}`,
      });
    }

    return out.slice(0, 24);
  }, [query, indexes, selectedIds]);

  useEffect(() => {
    queueMicrotask(() => {
      setHighlight(0);
    });
  }, [query, suggestions.length]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const addChip = useCallback(
    (s: Suggestion) => {
      const chip: ExplorerChip = {
        id: chipId(s.kind, s.value),
        kind: s.kind,
        value: s.value,
        label: s.label,
      };
      if (selectedIds.has(chip.id)) return;
      onChipsChange([...chips, chip]);
      setQuery("");
      setOpen(false);
      inputRef.current?.focus();
    },
    [chips, onChipsChange, selectedIds],
  );

  const removeChip = useCallback(
    (id: string) => {
      onChipsChange(chips.filter((c) => c.id !== id));
    },
    [chips, onChipsChange],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      if (suggestions.length > 0) {
        const s = suggestions[highlight];
        if (s) addChip(s);
      } else {
        const tid = chipId("text", query.trim());
        if (!selectedIds.has(tid)) {
          addChip({
            kind: "text",
            value: query.trim(),
            label: `Match all text: “${query.trim()}”`,
          });
        }
      }
    }
  };

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div className="mb-10 flex w-full flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
        <div className="relative min-w-0 shrink-0" style={{ width: "40%" }}>
          <SearchIcon className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-[#8a7d72]" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search tags, authors, places…"
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="explorer-search-listbox"
            aria-autocomplete="list"
            className="w-full rounded-full border border-[#e8e2da] bg-white py-4 pl-14 pr-5 leading-normal text-[#2e2824] outline-none transition-[border-color,box-shadow] placeholder:text-[12px] placeholder:text-[#6d625a] focus:border-[#c9bfb3] focus:ring-2 focus:ring-[#C17B5A]/20"
            style={{
              fontSize: "12px",
              lineHeight: 1.5,
            }}
            autoComplete="off"
          />
          {open && query.trim() && suggestions.length > 0 ? (
            <ul
              id="explorer-search-listbox"
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-auto rounded-2xl border border-[#e3d9ce] bg-[#FFFCF7] py-2 shadow-lg ring-1 ring-black/5"
            >
              {suggestions.map((s, i) => (
                <li key={`${s.kind}-${s.value}-${i}`} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === highlight}
                    className={cn(
                      "flex w-full px-4 py-4 text-left text-[#2e2824] transition-colors",
                      i === highlight
                        ? "bg-[#C17B5A]/15"
                        : "hover:bg-[#7A9E87]/10",
                    )}
                    style={{ fontSize: "12px" }}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => addChip(s)}
                  >
                    <span className="font-medium">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {chips.length > 0 && (
          <ul className="flex flex-1 flex-wrap items-center gap-2">
            {chips.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => removeChip(c.id)}
                  className={cn(filterChipClass)}
                  style={{ fontSize: "12px" }}
                >
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  <CloseIcon className="size-[9px] shrink-0 text-white/90" />
                  <span className="sr-only">Remove filter {c.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
