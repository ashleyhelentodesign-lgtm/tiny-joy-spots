"use client";

import { ChevronDown, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { LocationPicker } from "@/components/LocationPicker";
import { PhotoUploadDropzone } from "@/components/photo-upload-dropzone";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type TagRow = { id: string; name: string };
type SelectedTag = { id: string | null; name: string };

const DEFAULT_MOOD_SUGGESTIONS = ["soft", "home", "peace", "chaos"] as const;

function normalizeTagName(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

/** Single mood token (first word). */
function normalizeMoodWord(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.split(/\s+/)[0] ?? "";
}

function normalizeMoodOrLabel(raw: string) {
  return normalizeMoodWord(raw) || raw.trim();
}

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const fieldLabel =
  "mb-2 block text-[calc(0.95rem_+_4pt)] font-medium tracking-[0.02em] text-[#3d3530]";

const fieldInput =
  "w-full rounded-2xl border border-[#e3d9ce] bg-[#FFFCF7] px-4 py-3.5 text-[calc(1rem_+_4pt)] text-[#2e2824] shadow-inner shadow-black/[0.02] outline-none transition-[border-color,box-shadow] placeholder:text-[#8C7B6E]/70 focus:border-[#C17B5A] focus:ring-2 focus:ring-[#C17B5A]/20";

/** ~2 visible suggestion rows (py-3 + large type); rest scrolls */
const SUGGEST_LIST_MAX_H = "max-h-[8.5rem]";

export type SubmissionFormProps = {
  variant?: "page" | "modal";
  /** For `aria-labelledby` on a parent dialog */
  headingId?: string;
  title?: string;
  subtitle?: string;
  /** If set, successful submit skips inline success message (e.g. modal thank-you step). */
  onSubmitted?: () => void;
};

export function SubmissionForm({
  variant = "page",
  headingId: headingIdProp,
  title = "Share a joy spot",
  subtitle = "Joy is everywhere if we just look",
  onSubmitted,
}: SubmissionFormProps) {
  const baseId = useId();
  const autoHeadingId = useId();
  const headingId = headingIdProp ?? autoHeadingId;

  const [formKey, setFormKey] = useState(0);
  const [textOnly, setTextOnly] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [bodyText, setBodyText] = useState("");
  const [caption, setCaption] = useState("");
  const [spotDate, setSpotDate] = useState(() => todayISODate());
  const [locationText, setLocationText] = useState("");
  const [contributorName, setContributorName] = useState("");
  const [allTags, setAllTags] = useState<TagRow[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mood, setMood] = useState<string | null>(null);
  const [moodInput, setMoodInput] = useState("");
  const [moodSuggestOpen, setMoodSuggestOpen] = useState(false);
  const [knownMoods, setKnownMoods] = useState<string[]>([]);
  const moodBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const refreshKnownMoods = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("joy_spots")
      .select("mood")
      .not("mood", "is", null)
      .limit(400);
    if (error || !data) return;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of data as { mood: string | null }[]) {
      const m = row.mood?.trim();
      if (!m) continue;
      const k = m.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(m);
    }
    out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    setKnownMoods(out);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tags")
        .select("id, name")
        .order("name");
      if (cancelled) return;
      if (!error && data) setAllTags(data as TagRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshKnownMoods();
  }, [refreshKnownMoods]);

  const mergedMoodOptions = useMemo(() => {
    const byLower = new Map<string, string>();
    for (const m of DEFAULT_MOOD_SUGGESTIONS) {
      byLower.set(m.toLowerCase(), m);
    }
    for (const m of knownMoods) {
      const k = m.toLowerCase();
      if (!byLower.has(k)) byLower.set(k, m);
    }
    const defaults = [...DEFAULT_MOOD_SUGGESTIONS];
    const rest = [...byLower.values()].filter(
      (m) => !DEFAULT_MOOD_SUGGESTIONS.some((d) => d.toLowerCase() === m.toLowerCase()),
    );
    rest.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return [...defaults, ...rest];
  }, [knownMoods]);

  const filteredMoodDropdown = useMemo(() => {
    const q =
      mood !== null ? "" : moodInput.trim().toLowerCase();
    if (!q) return mergedMoodOptions.slice(0, 24);
    return mergedMoodOptions
      .filter((m) => m.toLowerCase().includes(q))
      .slice(0, 24);
  }, [mergedMoodOptions, moodInput, mood]);

  const showCustomMoodRow =
    mood === null &&
    Boolean(moodInput.trim()) &&
    !mergedMoodOptions.some(
      (m) => m.toLowerCase() === moodInput.trim().toLowerCase(),
    );

  const filteredSuggestions = useMemo(() => {
    const q = normalizeTagName(tagInput).toLowerCase();
    const selectedLower = new Set(
      selectedTags.map((t) => t.name.toLowerCase()),
    );
    return allTags.filter((t) => {
      if (selectedLower.has(t.name.toLowerCase())) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q);
    });
  }, [allTags, tagInput, selectedTags]);

  const addTag = useCallback(
    (raw: string) => {
      const name = normalizeTagName(raw);
      if (!name) return;
      if (
        selectedTags.some((t) => t.name.toLowerCase() === name.toLowerCase())
      ) {
        setTagInput("");
        return;
      }
      const existing = allTags.find(
        (t) => t.name.toLowerCase() === name.toLowerCase(),
      );
      setSelectedTags((prev) => [
        ...prev,
        { id: existing?.id ?? null, name: existing?.name ?? name },
      ]);
      setTagInput("");
      setSuggestOpen(false);
    },
    [allTags, selectedTags],
  );

  const removeTag = (name: string) => {
    setSelectedTags((prev) => prev.filter((t) => t.name !== name));
  };

  const scheduleBlurClose = () => {
    blurTimer.current = setTimeout(() => setSuggestOpen(false), 120);
  };

  const cancelBlurClose = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  };

  const scheduleMoodBlurClose = () => {
    moodBlurTimer.current = setTimeout(() => setMoodSuggestOpen(false), 120);
  };

  const cancelMoodBlurClose = () => {
    if (moodBlurTimer.current) clearTimeout(moodBlurTimer.current);
  };

  const commitMood = useCallback((raw: string) => {
    const w = normalizeMoodWord(raw);
    if (!w) return;
    const match = mergedMoodOptions.find(
      (m) => m.toLowerCase() === w.toLowerCase(),
    );
    setMood(match ?? w);
    setMoodInput("");
    setMoodSuggestOpen(false);
  }, [mergedMoodOptions]);

  const clearMood = () => {
    setMood(null);
    setMoodInput("");
  };

  const pickMoodOption = (option: string) => {
    commitMood(option);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (textOnly) {
      if (!bodyText.trim()) {
        setFormError(
          "Write a few words for your joy spot, or switch to photo.",
        );
        return;
      }
    } else if (!file) {
      setFormError("Add a photo, or switch to text only.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      if (file) {
        formData.append("photo", file);
      }
      formData.append("text_content", bodyText.trim());
      formData.append("date", spotDate);
      formData.append("location_text", locationText.trim());
      if (contributorName.trim()) {
        formData.append("contributor_name", contributorName.trim());
      }
      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }
      if (mood?.trim()) {
        formData.append("mood", mood.trim());
      }
      if (selectedTags.length > 0) {
        formData.append(
          "tags",
          JSON.stringify(selectedTags.map((t) => t.name)),
        );
      }

      const res = await fetch("/api/submit-joy-spot", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const payload = (await res.json()) as { error?: string };

      if (!res.ok) {
        setFormError(
          typeof payload.error === "string"
            ? payload.error
            : "Could not save your joy spot.",
        );
        return;
      }

      if (onSubmitted) {
        onSubmitted();
      } else {
        setFormSuccess(true);
      }
      setFormKey((k) => k + 1);
      setTextOnly(false);
      setFile(null);
      setBodyText("");
      setCaption("");
      setSpotDate(todayISODate());
      setLocationText("");
      setContributorName("");
      setSelectedTags([]);
      setTagInput("");
      setMood(null);
      setMoodInput("");

      const supabase = createClient();
      const { data: refreshed } = await supabase
        .from("tags")
        .select("id, name")
        .order("name");
      if (refreshed) setAllTags(refreshed as TagRow[]);
      void refreshKnownMoods();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isModal = variant === "modal";

  /** Matches gallery preview tags (GalleryGrid tag buttons) */
  const selectedTagPillClass =
    "inline-flex max-w-full min-w-0 shrink-0 items-center justify-center gap-1 rounded-[4px] bg-[#897c70] px-2 py-2 text-[11px] font-normal leading-none text-[#f5f5f5] transition-opacity hover:opacity-90";

  const fieldsColumn = (
    <>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <div>
          <label htmlFor={`${baseId}-date`} className={fieldLabel}>
            Date
          </label>
          <input
            id={`${baseId}-date`}
            type="date"
            value={spotDate}
            onChange={(e) => setSpotDate(e.target.value)}
            className={cn(fieldInput, "font-sans")}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-place`} className={fieldLabel}>
            Where
          </label>
          <LocationPicker
            key={formKey}
            id={`${baseId}-place`}
            placeholder="New York City, Los Angeles, etc."
            onValueChange={setLocationText}
            onLocationSelect={() => {
              /* `location_text` synced via onValueChange */
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 sm:items-start">
        <div className="relative min-w-0">
          <span className={fieldLabel}>Tags</span>
          <p
            className={cn(
              "mb-2 text-[calc(0.85rem_+_4pt)] leading-relaxed text-[#6d625a]",
              isModal && "text-[calc(0.8rem_+_4pt)]",
            )}
          >
            As you type, pick an existing tag or add a new one.
          </p>
          {selectedTags.length > 0 && (
            <ul className={cn("mb-2 flex flex-wrap gap-2", !isModal && "mb-3")}>
              {selectedTags.map((t) => (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => removeTag(t.name)}
                    className={selectedTagPillClass}
                  >
                    <span className="min-w-0 truncate">{t.name}</span>
                    <span className="sr-only">Remove</span>
                    <span className="shrink-0 text-[#f5f5f5]/90" aria-hidden>
                      ×
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            id={`${baseId}-tags`}
            type="text"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => {
              cancelBlurClose();
              setSuggestOpen(true);
            }}
            onBlur={scheduleBlurClose}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Choose or type your tags."
            autoComplete="off"
            className={fieldInput}
          />
          {suggestOpen &&
            (filteredSuggestions.length > 0 || normalizeTagName(tagInput)) && (
              <ul
                className={cn(
                  "absolute z-20 mt-2 w-full overflow-y-auto rounded-2xl border border-[#e3d9ce] bg-[#FFFCF7] py-1 shadow-lg",
                  SUGGEST_LIST_MAX_H,
                )}
              >
                {normalizeTagName(tagInput) &&
                  !allTags.some(
                    (t) =>
                      t.name.toLowerCase() ===
                      normalizeTagName(tagInput).toLowerCase(),
                  ) &&
                  !selectedTags.some(
                    (t) =>
                      t.name.toLowerCase() ===
                      normalizeTagName(tagInput).toLowerCase(),
                  ) && (
                    <li>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="w-full px-4 py-3 text-left text-[calc(0.875rem_+_4pt)] text-[#2e2824] hover:bg-[#ebe6e0]"
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => addTag(tagInput)}
                      >
                        Add new “{normalizeTagName(tagInput)}”
                      </button>
                    </li>
                  )}
                {filteredSuggestions.slice(0, 12).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="w-full px-4 py-3 text-left text-[calc(0.875rem_+_4pt)] text-[#2e2824] hover:bg-[#ebe6e0]"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => addTag(t.name)}
                    >
                      {t.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="relative min-w-0">
          <span className={fieldLabel}>Mood</span>
          <p
            className={cn(
              "mb-2 text-[calc(0.85rem_+_4pt)] leading-relaxed text-[#6d625a]",
              isModal && "text-[calc(0.8rem_+_4pt)]",
            )}
          >
            In one word, what&apos;s the mood?
          </p>
          <div className="relative">
            <input
              id={`${baseId}-mood`}
              type="text"
              value={mood ?? moodInput}
              onChange={(e) => {
                setMood(null);
                setMoodInput(e.target.value);
                setMoodSuggestOpen(true);
              }}
              onFocus={() => {
                cancelMoodBlurClose();
                setMoodSuggestOpen(true);
              }}
              onBlur={scheduleMoodBlurClose}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitMood(mood !== null ? mood : moodInput);
                }
                if (e.key === "Escape") {
                  setMoodSuggestOpen(false);
                }
              }}
              placeholder="Choose or type a mood."
              autoComplete="off"
              className={cn(fieldInput, "pr-24 font-sans")}
              role="combobox"
              aria-expanded={moodSuggestOpen}
              aria-autocomplete="list"
              aria-controls={`${baseId}-mood-listbox`}
            />
            <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {(mood !== null || moodInput.trim() !== "") && (
                <button
                  type="button"
                  tabIndex={-1}
                  className="pointer-events-auto rounded-lg p-2 text-[#6d625a] transition-colors hover:bg-[#ebe6e0] hover:text-[#2e2824]"
                  aria-label="Clear mood"
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    clearMood();
                    setMoodSuggestOpen(false);
                  }}
                >
                  <X className="size-6" strokeWidth={2} aria-hidden />
                </button>
              )}
              <button
                type="button"
                tabIndex={-1}
                className="pointer-events-auto rounded-lg p-2 text-[#6d625a] transition-colors hover:bg-[#ebe6e0] hover:text-[#2e2824]"
                aria-label={moodSuggestOpen ? "Close mood options" : "Open mood options"}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  cancelMoodBlurClose();
                  setMoodSuggestOpen((open) => !open);
                }}
              >
                <ChevronDown
                  className={cn(
                    "size-[15px] transition-transform duration-200",
                    moodSuggestOpen && "rotate-180",
                  )}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            </div>
          </div>
          {moodSuggestOpen &&
            (filteredMoodDropdown.length > 0 || showCustomMoodRow) && (
              <ul
                id={`${baseId}-mood-listbox`}
                role="listbox"
                className={cn(
                  "joy-scroll-persistent absolute z-20 mt-2 w-full rounded-2xl border border-[#e3d9ce] bg-[#FFFCF7] py-1 shadow-lg",
                  SUGGEST_LIST_MAX_H,
                )}
              >
                {showCustomMoodRow ? (
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="w-full px-4 py-3 text-left text-[calc(0.875rem_+_4pt)] text-[#2e2824] hover:bg-[#ebe6e0]"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => commitMood(moodInput)}
                    >
                      Use “{normalizeMoodOrLabel(moodInput)}”
                    </button>
                  </li>
                ) : null}
                {filteredMoodDropdown.map((m) => (
                  <li key={m}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={
                        mood !== null && mood.toLowerCase() === m.toLowerCase()
                      }
                      className="w-full px-4 py-3 text-left text-[calc(0.875rem_+_4pt)] text-[#2e2824] hover:bg-[#ebe6e0]"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => pickMoodOption(m)}
                    >
                      {m}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

      <div>
        <label htmlFor={`${baseId}-name`} className={fieldLabel}>
          Your name{" "}
          <span className="font-normal text-[#8C7B6E]/80">(optional)</span>
        </label>
        <input
          id={`${baseId}-name`}
          type="text"
          value={contributorName}
          onChange={(e) => setContributorName(e.target.value)}
          placeholder="i.e. Jane Doe"
          autoComplete="name"
          className={fieldInput}
        />
      </div>
    </>
  );

  const formScrollClass = isModal
    ? "flex flex-col gap-7 overflow-x-hidden"
    : "flex flex-col gap-10";

  const modalScrollInnerClass =
    "joy-scroll-persistent flex min-h-0 flex-1 flex-col overscroll-contain px-[clamp(1rem,1.5vw,2.5rem)] pb-6 pt-10 sm:pb-8 sm:pt-12 [&_input]:text-[clamp(calc(1rem_+_4pt),calc(1rem_+_0.175vw_+_4pt),calc(1.125rem_+_4pt))] [&_textarea]:text-[clamp(calc(1rem_+_4pt),calc(1rem_+_0.175vw_+_4pt),calc(1.125rem_+_4pt))]";

  const formHeader = (
    <header
      className={cn(
        "text-center",
        isModal ? "mb-4" : "mb-10",
      )}
    >
      <h1
        id={headingId}
        className={cn(
          "font-serif font-normal italic leading-tight tracking-tight text-[#2e2824]",
          isModal
            ? "text-[clamp(calc(1.75rem_+_4pt),calc(1.75vw_+_4pt),calc(2.75rem_+_4pt))]"
            : "text-[calc(2rem_+_4pt)] sm:text-[calc(2.5rem_+_4pt)]",
        )}
      >
        {title}
      </h1>
      {subtitle.trim() ? (
        <p
          className={cn(
            "mx-auto mt-3 max-w-md leading-relaxed text-[#8C7B6E]",
            isModal
              ? "text-[clamp(calc(0.875rem_+_4pt),calc(0.6vw_+_4pt),calc(1rem_+_4pt))]"
              : "text-[calc(0.95rem_+_4pt)]",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </header>
  );

  const formBody = (
    <>
      {!textOnly ? (
        <div>
          <span className={fieldLabel}>Your joy spot</span>
          <PhotoUploadDropzone
            key={formKey}
            compact={isModal}
            suppressInlineCaption
            className={cn(
              "mt-1 w-full max-w-none border-[#e3d9ce] bg-[#f0ebe4]",
              isModal &&
                "min-h-[10rem] border-2 border-dashed border-[#d4ccc2] sm:min-h-[12rem]",
            )}
            onFileChange={setFile}
            onTextChange={setBodyText}
            onCaptionChange={setCaption}
            onModeChange={setTextOnly}
          />
          <label htmlFor={`${baseId}-caption`} className={cn(fieldLabel, "mt-4")}>
            Caption{" "}
            <span className="font-normal text-[#8C7B6E]/80">(optional)</span>
          </label>
          <input
            id={`${baseId}-caption`}
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe the moment."
            autoComplete="off"
            className={fieldInput}
          />
        </div>
      ) : (
        <div>
          <span className={fieldLabel}>Your joy spot</span>
          <PhotoUploadDropzone
            key={formKey}
            compact={isModal}
            className={cn(
              "mt-1 w-full max-w-none border-[#e3d9ce] bg-[#f0ebe4]",
              isModal &&
                "min-h-[10rem] border-2 border-dashed border-[#d4ccc2] sm:min-h-[12rem]",
            )}
            onFileChange={setFile}
            onTextChange={setBodyText}
            onCaptionChange={setCaption}
            onModeChange={setTextOnly}
          />
        </div>
      )}

      {fieldsColumn}
    </>
  );

  const formFooter = (
    <>
      {formError && (
        <p
          className={cn(
            "text-center text-[calc(0.875rem_+_4pt)] text-[#a85c4a]",
            isModal ? "mt-6" : "mt-8",
          )}
          role="alert"
        >
          {formError}
        </p>
      )}
      {formSuccess && (
        <p
          className={cn(
            "text-center text-[calc(0.875rem_+_4pt)] text-[#7A9E87]",
            isModal ? "mt-6" : "mt-8",
          )}
        >
          Saved. Thank you for sharing this bit of joy.
        </p>
      )}

      <div className={cn(isModal ? "mt-8 border-t border-transparent pt-6" : "mt-10")}>
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "w-full rounded-2xl bg-[#C17B5A] font-medium text-white shadow-sm transition-[transform,opacity,box-shadow] hover:bg-[#b06d4e] disabled:pointer-events-none disabled:opacity-50",
            isModal
              ? "py-[clamp(0.875rem,0.75vw,1.125rem)] text-[clamp(calc(1rem_+_4pt),calc(0.7vw_+_4pt),calc(1.25rem_+_4pt))]"
              : "py-4 text-[calc(1.125rem_+_4pt)]",
          )}
        >
          {submitting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span
                className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden
              />
              Saving…
            </span>
          ) : (
            "Send it off"
          )}
        </button>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        variant === "page"
          ? "min-h-full bg-[#FAF6F0] px-4 py-14 pb-24"
          : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent",
      )}
    >
      <form
        onSubmit={onSubmit}
        className={cn(
          "mx-auto flex w-full flex-col",
          isModal
            ? "h-full max-h-full min-h-0 min-w-0 max-w-none flex-1 overflow-hidden"
            : "max-w-xl",
        )}
        noValidate
        aria-busy={submitting}
      >
        {isModal ? (
          <div className={modalScrollInnerClass}>
            {formHeader}
            <div className={formScrollClass}>{formBody}</div>
            {formFooter}
          </div>
        ) : (
          <>
            {formHeader}
            <div className={formScrollClass}>
              {formBody}
            </div>
            {formFooter}
          </>
        )}
      </form>
    </div>
  );
}
