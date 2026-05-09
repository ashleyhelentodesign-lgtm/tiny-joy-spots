"use client";

import { MapPin, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

export type LocationData = {
  display: string;
  lat: number;
  lng: number;
  type: "city" | "neighborhood" | "venue";
};

export interface LocationPickerProps {
  onLocationSelect: (location: LocationData | null) => void;
  /** Sync plain text for form `location_text` (typing, clear, pick). */
  onValueChange?: (value: string) => void;
  placeholder?: string;
  initialValue?: LocationData;
  id?: string;
}

type PhotonProperties = {
  name?: string;
  city?: string;
  country?: string;
  state?: string;
  osm_value?: string;
};

type PhotonFeature = {
  type: "Feature";
  geometry: { type: string; coordinates: [number, number] };
  properties: PhotonProperties;
};

type PhotonResponse = {
  type: string;
  features: PhotonFeature[];
};

function buildLabel(props: PhotonProperties): string {
  const name = props.name?.trim() || "";
  const city = props.city?.trim() || "";
  const state = props.state?.trim() || "";
  const country = props.country?.trim() || "";
  if (name) return [name, city, country].filter(Boolean).join(", ");
  if (city) return [city, state, country].filter(Boolean).join(", ");
  return [state, country].filter(Boolean).join(", ");
}

function deriveType(osm: string | undefined): LocationData["type"] {
  const v = (osm ?? "").toLowerCase();
  if (v === "city" || v === "town" || v === "village") return "city";
  if (v === "suburb" || v === "neighbourhood" || v === "neighborhood")
    return "neighborhood";
  return "venue";
}

function formatTypePill(osm: string | undefined): string {
  if (!osm) return "place";
  const v = osm.toLowerCase();
  const map: Record<string, string> = {
    city: "city",
    town: "city",
    village: "city",
    suburb: "neighborhood",
    neighbourhood: "neighborhood",
    neighborhood: "neighborhood",
    cafe: "café",
    restaurant: "restaurant",
    park: "park",
  };
  if (map[v]) return map[v];
  return v.replace(/_/g, " ");
}

function featureToLocation(f: PhotonFeature): LocationData | null {
  const coords = f.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lng, lat] = coords;
  const display = buildLabel(f.properties);
  if (!display) return null;
  return {
    display,
    lat,
    lng,
    type: deriveType(f.properties.osm_value),
  };
}

const inputShell =
  "w-full rounded-2xl border border-[#e3d9ce] bg-[#FFFCF7] py-3.5 pl-11 pr-11 text-[calc(1rem_+_8pt)] text-[#2e2824] shadow-inner shadow-black/[0.02] outline-none transition-[border-color,box-shadow] placeholder:text-[#8C7B6E]/70 focus:border-[#C17B5A] focus:ring-2 focus:ring-[#C17B5A]/20";

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

export function LocationPicker({
  onLocationSelect,
  onValueChange,
  placeholder = "New York City, Los Angeles, etc.",
  initialValue,
  id: idProp,
}: LocationPickerProps) {
  const genId = useId();
  const inputId = idProp ?? `location-picker-${genId}`;
  const listId = `${inputId}-list`;

  const [inputValue, setInputValue] = useState(initialValue?.display ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState<PhotonFeature[]>([]);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedRef = useRef<LocationData | null>(initialValue ?? null);

  const syncParentText = useCallback(
    (text: string) => {
      onValueChange?.(text);
    },
    [onValueChange],
  );

  useEffect(() => {
    if (initialValue) {
      setInputValue(initialValue.display);
      selectedRef.current = initialValue;
    }
  }, [initialValue]);

  const rows = useMemo(() => {
    return features
      .map((f) => {
        const loc = featureToLocation(f);
        if (!loc) return null;
        return { feature: f, location: loc };
      })
      .filter((x): x is { feature: PhotonFeature; location: LocationData } =>
        Boolean(x),
      );
  }, [features]);

  const runSearch = useCallback(async (q: string) => {
    const query = q.trim();
    if (query.length < MIN_QUERY) {
      setFeatures([]);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) {
        setFeatures([]);
        return;
      }
      const data = (await res.json()) as PhotonResponse;
      setFeatures(Array.isArray(data.features) ? data.features : []);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const scheduleSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runSearch(q);
      }, DEBOUNCE_MS);
    },
    [runSearch],
  );

  const pick = useCallback(
    (loc: LocationData) => {
      selectedRef.current = loc;
      setInputValue(loc.display);
      syncParentText(loc.display);
      onLocationSelect(loc);
      setOpen(false);
      setFeatures([]);
      setHighlight(0);
    },
    [onLocationSelect, syncParentText],
  );

  const clear = useCallback(() => {
    selectedRef.current = null;
    setInputValue("");
    syncParentText("");
    onLocationSelect(null);
    setFeatures([]);
    setOpen(false);
    setHighlight(0);
    abortRef.current?.abort();
  }, [onLocationSelect, syncParentText]);

  const onInputChange = (raw: string) => {
    setInputValue(raw);
    syncParentText(raw);
    if (selectedRef.current && raw !== selectedRef.current.display) {
      selectedRef.current = null;
      onLocationSelect(null);
    }
    if (raw.trim().length >= MIN_QUERY) {
      setOpen(true);
      scheduleSearch(raw);
    } else {
      setFeatures([]);
      setOpen(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
    setHighlight(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && rows.length) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!rows.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[highlight];
      if (row) pick(row.location);
    }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const showClear = inputValue.length > 0;
  const showList = open && inputValue.trim().length >= MIN_QUERY;

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-[#8C7B6E]"
          strokeWidth={2}
          aria-hidden
        />
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => {
            if (inputValue.trim().length >= MIN_QUERY) {
              setOpen(true);
              scheduleSearch(inputValue);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          className={inputShell}
        />
        {showClear ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6d625a] transition-colors hover:bg-[#ebe6e0] hover:text-[#2e2824]"
            aria-label="Clear location"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => clear()}
          >
            <X className="size-5" strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>

      {showList ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-[#e3d9ce] bg-[#FFFCF7] py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-4 py-3 text-[calc(0.875rem_+_8pt)] text-[#8C7B6E]">
              Searching…
            </li>
          ) : rows.length === 0 ? (
            <li className="px-4 py-3 text-[calc(0.875rem_+_8pt)] text-[#8C7B6E]">
              No places found
            </li>
          ) : (
            rows.map(({ feature, location }, idx) => {
              const pill = formatTypePill(feature.properties.osm_value);
              const active = idx === highlight;
              return (
                <li key={`${location.lng},${location.lat},${location.display},${idx}`} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-idx={idx}
                    className={cn(
                      "flex w-full items-start gap-2 px-4 py-3 text-left text-[calc(0.875rem_+_8pt)] transition-colors",
                      active ? "bg-[#ebe6e0]" : "hover:bg-[#f5f0ea]",
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(location);
                    }}
                    onMouseEnter={() => setHighlight(idx)}
                  >
                    <span className="min-w-0 flex-1 leading-snug text-[#2e2824]">
                      {location.display}
                    </span>
                    <span className="shrink-0 rounded-full border border-[#d4ccc2] bg-[#f0ebe4] px-2 py-0.5 text-[calc(0.7rem_+_6pt)] font-medium capitalize text-[#5c4f45]">
                      {pill}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
