import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import Fuse from "fuse.js";
import type { DictionaryEntry } from "../lib/parseDictionary.ts";
import { buildSearchIndex, searchDictionary, suggest } from "../lib/searchDictionary.ts";
import DictionaryCard, { type UiLanguage } from "./DictionaryCard.tsx";

type ChapterOption = { babKey: string; label: string; buku: string; count: number };
type Props = { entries: DictionaryEntry[]; chapters: ChapterOption[]; entryCount: number };

const INITIAL_LIMIT = 30;
const PAGE = 30;
const SUGGEST_MAX = 8;
const DEBOUNCE_MS = 180;

const copy = {
  ms: {
    title: "Kamus Durusul Lughah",
    subtitle: "Cari kalimah Arab, maksud Melayu, bentuk jamak, serta nota nahu dan sarf.",
    placeholder: "Cari Arab atau Bahasa Melayu…",
    searchHint: "Carian menyokong tulisan Arab dengan atau tanpa harakat.",
    chapter: "Bab",
    allChapters: "Semua Bab",
    clearFilter: "Buang penapis",
    emptyTitle: "Mula menaip untuk mencari sebuah kalimah.",
    emptyText: "Cari menggunakan kalimah Arab, maksud Melayu atau bentuk jamak.",
    noResults: "Tiada hasil ditemui.",
    noMatch: "Tiada kalimah sepadan. Cuba ejaan lain, buang penapis Bab atau taip tanpa harakat.",
    results: "hasil",
    for: "bagi",
    more: "Lihat lagi",
    remaining: "lagi",
    footer: "kalimah",
    local: "Berjalan sepenuhnya secara lokal.",
    languageLabel: "English",
    examples: ["بيت", "rumah", "بيوت", "مسجد"],
  },
  en: {
    title: "Durusul Lughah Dictionary",
    subtitle: "Search Arabic words, English meanings, plural forms, and grammar or morphology notes.",
    placeholder: "Search Arabic or English…",
    searchHint: "Arabic search works with or without diacritics.",
    chapter: "Chapter",
    allChapters: "All Chapters",
    clearFilter: "Clear filter",
    emptyTitle: "Start typing to search for a word.",
    emptyText: "Search by Arabic word, English meaning, or plural form.",
    noResults: "No results found.",
    noMatch: "No matching word was found. Try another spelling, clear the chapter filter, or type without diacritics.",
    results: "results",
    for: "for",
    more: "Show more",
    remaining: "remaining",
    footer: "words",
    local: "Runs entirely locally.",
    languageLabel: "Bahasa Melayu",
    examples: ["بيت", "house", "بيوت", "mosque"],
  },
} as const;

export default function DictionaryApp({ entries, chapters, entryCount }: Props) {
  const index = useMemo(() => buildSearchIndex(entries, Fuse as never), [entries]);
  const [language, setLanguage] = useState<UiLanguage>("ms");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [babKey, setBabKey] = useState("");
  const [visible, setVisible] = useState(INITIAL_LIMIT);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = copy[language];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") ?? "";
    const bab = params.get("bab") ?? "";
    const lang = params.get("lang") === "en" ? "en" : "ms";
    setLanguage(lang);
    if (q) { setQuery(q); setDebounced(q); }
    if (bab) setBabKey(bab);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "ms" ? "Kamus Durusul Lughah" : "Durusul Lughah Dictionary";
  }, [language]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setDebounced(query); setVisible(INITIAL_LIMIT); }, DEBOUNCE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debounced.trim()) params.set("q", debounced.trim());
    if (babKey) params.set("bab", babKey);
    if (language === "en") params.set("lang", "en");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [debounced, babKey, language]);

  const fullResults = useMemo(() => {
    if (!debounced.trim()) return babKey ? entries.filter((e) => e.babKey === babKey) : [];
    return searchDictionary(debounced, index, { babKey: babKey || null }).map((r) => r.entry);
  }, [debounced, babKey, entries, index]);
  const shown = fullResults.slice(0, visible);
  const suggestions = useMemo(
    () => query.trim() ? suggest(query, index, { babKey: babKey || null, limit: SUGGEST_MAX }) : [],
    [query, index, babKey]
  );
  const openSuggest = showSuggest && suggestions.length > 0;

  useEffect(() => {
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowSuggest(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selectEntry = useCallback((entry: DictionaryEntry) => {
    setQuery(entry.arabic); setDebounced(entry.arabic); setShowSuggest(false); setActiveIdx(-1);
  }, []);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!openSuggest) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIdx((i) => i <= 0 ? suggestions.length - 1 : i - 1); }
    else if (event.key === "Enter" && activeIdx >= 0) { event.preventDefault(); selectEntry(suggestions[activeIdx]); }
    else if (event.key === "Escape") { setShowSuggest(false); setActiveIdx(-1); }
  };

  const clearSearch = () => { setQuery(""); setDebounced(""); setShowSuggest(false); inputRef.current?.focus(); };
  const hasQuery = Boolean(debounced.trim());
  const babSelected = Boolean(babKey);

  return (
    <div>
      <header className="border-b border-line bg-panel">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{t.title}</h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{t.subtitle}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-3">
              <span className="arabic text-lg text-accent" dir="rtl">دروس اللغة</span>
              <button
                type="button"
                onClick={() => setLanguage((lang) => lang === "ms" ? "en" : "ms")}
                className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft"
                aria-label={language === "ms" ? "Switch to English" : "Tukar ke Bahasa Melayu"}
              >
                {t.languageLabel}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="py-8">
        <div className="mx-auto w-full max-w-3xl px-4">
          <div ref={boxRef} className="relative">
            <label htmlFor="carian" className="sr-only">{t.placeholder}</label>
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm focus-within:border-accent">
              <SearchIcon />
              <input
                id="carian"
                ref={inputRef}
                className="w-full bg-transparent text-lg text-ink placeholder:text-muted focus:outline-none"
                placeholder={t.placeholder}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggest(true); setActiveIdx(-1); }}
                onFocus={() => setShowSuggest(true)}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded={openSuggest}
                aria-controls="suggest-list"
                autoComplete="off"
                spellCheck={false}
              />
              {query && <button type="button" onClick={clearSearch} aria-label="Clear search" className="rounded-full p-1 text-muted hover:bg-accent-soft hover:text-accent"><XIcon /></button>}
            </div>
            {openSuggest && (
              <ul id="suggest-list" role="listbox" className="suggest-scroll absolute z-20 mt-2 max-h-[60vh] w-full overflow-auto rounded-xl border border-line bg-panel py-1 shadow-lg">
                {suggestions.map((entry, i) => (
                  <li key={entry.id} role="option" aria-selected={i === activeIdx} onMouseEnter={() => setActiveIdx(i)} onMouseDown={(e) => { e.preventDefault(); selectEntry(entry); }} className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2 ${i === activeIdx ? "bg-accent-soft" : ""}`}>
                    <div className="min-w-0">
                      <span className="arabic text-xl text-ink" dir="rtl">{entry.arabic}</span>
                      <span className="block truncate text-sm text-muted">{language === "ms" ? entry.malay : entry.english}</span>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted">{entry.babLabel}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-2 px-1 text-xs text-muted">{t.searchHint}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2 px-1">
            <label htmlFor="bab" className="text-sm text-muted">{t.chapter}</label>
            <select id="bab" value={babKey} onChange={(e) => { setBabKey(e.target.value); setVisible(INITIAL_LIMIT); }} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none">
              <option value="">{t.allChapters}</option>
              {chapters.map((chapter) => <option key={chapter.babKey} value={chapter.babKey}>{chapter.label} ({chapter.count})</option>)}
            </select>
            {babSelected && <button type="button" onClick={() => setBabKey("")} className="text-sm text-accent hover:underline">{t.clearFilter}</button>}
          </div>

          <div className="mt-7">
            {!hasQuery && !babSelected ? (
              <div className="rounded-2xl border border-dashed border-line bg-panel/60 p-8 text-center">
                <p className="text-ink">{t.emptyTitle}</p>
                <p className="mt-1 text-sm text-muted">{t.emptyText}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {t.examples.map((example) => <button key={example} type="button" onClick={() => setQuery(example)} className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-ink hover:border-accent hover:text-accent">{example}</button>)}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 px-1 text-sm text-muted" aria-live="polite">
                  {fullResults.length === 0 ? t.noResults : `${fullResults.length} ${t.results}${hasQuery ? ` ${t.for} “${debounced.trim()}”` : ""}`}
                </div>
                {fullResults.length === 0 ? (
                  <div className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-muted">{t.noMatch}</div>
                ) : (
                  <div className="space-y-4">{shown.map((entry) => <DictionaryCard key={entry.id} entry={entry} language={language} />)}</div>
                )}
                {visible < fullResults.length && <div className="mt-6 flex justify-center"><button type="button" onClick={() => setVisible((v) => v + PAGE)} className="rounded-lg border border-line bg-panel px-5 py-2 text-sm font-medium text-accent hover:bg-accent-soft">{t.more} ({fullResults.length - visible} {t.remaining})</button></div>}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-10 border-t border-line py-6">
        <p className="mx-auto max-w-3xl px-4 text-center text-xs text-muted">{entryCount.toLocaleString(language === "ms" ? "ms-MY" : "en-US")} {t.footer} · {chapters.length} {language === "ms" ? "bab" : "chapters"} · {t.local}</p>
      </footer>
    </div>
  );
}

function SearchIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-muted"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function XIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
