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
    title: "Kamus Buku Bahasa Arab Madinah",
    subtitle: "Cari kalimah Arab daripada Buku Bahasa Arab Madinah, maksud Melayu, bentuk jamak, serta nota nahu dan saraf.",
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
    book: "Buku",
    wordsInChapter: "Kalimah dalam bab ini",
    backToTop: "Atas",
    examples: ["بيت", "rumah", "بيوت", "مسجد"],
  },
  en: {
    title: "Madinah Arabic Book Dictionary",
    subtitle: "Search Arabic words from the Madinah Arabic Book, English meanings, plural forms, and grammar or morphology notes.",
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
    book: "Book",
    wordsInChapter: "Words in this chapter",
    backToTop: "Top",
    examples: ["بيت", "house", "بيوت", "mosque"],
  },
} as const;

export default function DictionaryApp({ entries, chapters, entryCount }: Props) {
  const index = useMemo(() => buildSearchIndex(entries, Fuse as never), [entries]);
  const [language, setLanguage] = useState<UiLanguage>("ms");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [babKey, setBabKey] = useState("");
  const [activeBook, setActiveBook] = useState(() => chapters[0]?.buku ?? "Buku 1");
  const [visible, setVisible] = useState(INITIAL_LIMIT);
  const [showSuggest, setShowSuggest] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [focusedEntryId, setFocusedEntryId] = useState("");
  const [showBackTop, setShowBackTop] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollId = useRef<string | null>(null);
  const t = copy[language];
  const books = useMemo(() => Array.from(new Set(chapters.map((chapter) => chapter.buku))), [chapters]);
  const chaptersForActiveBook = useMemo(() => chapters.filter((chapter) => chapter.buku === activeBook), [chapters, activeBook]);
  const selectedChapter = useMemo(() => chapters.find((chapter) => chapter.babKey === babKey) ?? null, [chapters, babKey]);
  const chapterEntries = useMemo(() => babKey ? entries.filter((entry) => entry.babKey === babKey) : [], [entries, babKey]);

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
    if (!babKey) return;
    const chapter = chapters.find((item) => item.babKey === babKey);
    if (chapter) setActiveBook(chapter.buku);
  }, [babKey, chapters]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "ms" ? "Kamus Buku Bahasa Arab Madinah" : "Madinah Arabic Book Dictionary";
  }, [language]);

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    const close = (e: MouseEvent) => {
      if (!boxRef.current || boxRef.current.contains(e.target as Node)) return;
      setShowSuggest(false);
      setChapterOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const scrollToEntry = useCallback((id: string) => {
    const element = document.getElementById(`entry-${id}`);
    if (!element) return false;
    pendingScrollId.current = null;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setFocusedEntryId(id);
    window.setTimeout(() => setFocusedEntryId((current) => current === id ? "" : current), 1800);
    return true;
  }, []);

  useEffect(() => {
    const id = pendingScrollId.current;
    if (id) scrollToEntry(id);
  }, [shown, scrollToEntry]);

  const selectEntry = useCallback((entry: DictionaryEntry) => {
    setBabKey("");
    setQuery(entry.arabic); setDebounced(entry.arabic); setShowSuggest(false); setActiveIdx(-1);
  }, []);

  const searchFor = (value: string) => {
    setQuery(value);
    setShowSuggest(Boolean(value.trim()));
    setActiveIdx(-1);
    setFocusedEntryId("");
    if (value.trim()) setBabKey("");
  };

  const submitSearch = () => {
    const clean = query.trim();
    setDebounced(clean);
    setQuery(clean);
    setBabKey("");
    setShowSuggest(false);
    setActiveIdx(-1);
    setVisible(INITIAL_LIMIT);
  };

  const chooseBook = (book: string) => {
    setActiveBook(book);
    setBabKey("");
    setVisible(INITIAL_LIMIT);
    setFocusedEntryId("");
  };

  const chooseChapter = (key: string) => {
    setBabKey(key);
    setQuery("");
    setDebounced("");
    setShowSuggest(false);
    setChapterOpen(false);
    setVisible(INITIAL_LIMIT);
    setFocusedEntryId("");
  };

  const jumpToEntry = (entry: DictionaryEntry, index: number) => {
    setBabKey(entry.babKey);
    setQuery("");
    setDebounced("");
    setShowSuggest(false);
    setVisible(Math.max(INITIAL_LIMIT, index + 1));
    pendingScrollId.current = entry.id;
    window.setTimeout(() => scrollToEntry(entry.id), 0);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (openSuggest && activeIdx >= 0) selectEntry(suggestions[activeIdx]);
      else submitSearch();
      return;
    }
    if (!openSuggest) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIdx((i) => i <= 0 ? suggestions.length - 1 : i - 1); }
    else if (event.key === "Escape") { setShowSuggest(false); setActiveIdx(-1); }
  };

  const clearSearch = () => { setQuery(""); setDebounced(""); setShowSuggest(false); inputRef.current?.focus(); };
  const goHome = () => {
    setQuery("");
    setDebounced("");
    setBabKey("");
    setActiveBook(books[0] ?? "Buku 1");
    setVisible(INITIAL_LIMIT);
    setFocusedEntryId("");
    window.history.replaceState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const hasQuery = Boolean(debounced.trim());
  const babSelected = Boolean(babKey);

  return (
    <div>
      <header className="border-b border-line bg-panel">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <nav className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <a href="/" className="text-lg font-semibold text-ink hover:text-accent">Tuwailib</a>
            <div className="flex items-center gap-2">
              <a href="/" className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-soft">Home</a>
              <a href="/durusul-lughah" className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-soft">Syarah</a>
            </div>
          </nav>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-ink sm:text-3xl">
                <button type="button" onClick={goHome} className="text-start transition hover:text-accent focus:outline-none focus-visible:rounded focus-visible:outline-accent">
                  {t.title}
                </button>
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{t.subtitle}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-3">
              <span className="arabic text-lg text-accent" dir="rtl">دروس اللغة العربية لغير الناطقين بها</span>
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
          <div ref={boxRef} className="sticky top-0 z-[80] -mx-4 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.68fr)]">
              <div className="relative z-[90] min-w-0">
                <label htmlFor="carian" className="sr-only">{t.placeholder}</label>
                <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 shadow-sm focus-within:border-accent">
                  <button type="button" onClick={() => submitSearch()} className="shrink-0 rounded-full p-1 text-muted transition hover:bg-accent-soft hover:text-accent" aria-label="Search"><SearchIcon /></button>
                  <input
                    id="carian"
                    ref={inputRef}
                    className="w-full bg-transparent text-lg text-ink placeholder:text-muted focus:outline-none"
                    placeholder={t.placeholder}
                    value={query}
                    onChange={(e) => {
                      searchFor(e.target.value);
                      setChapterOpen(false);
                    }}
                    onFocus={() => {
                      setShowSuggest(true);
                      setChapterOpen(false);
                    }}
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
                  <ul id="suggest-list" role="listbox" className="suggest-scroll absolute z-[100] mt-2 max-h-72 w-full overflow-auto rounded-xl border border-line bg-panel py-1 shadow-xl">
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
                <p className="mt-2 px-1 text-xs text-muted">{t.searchHint}</p>
              </div>

              <div className="relative z-[85] min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuggest(false);
                    setChapterOpen((open) => !open);
                  }}
                  className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-start text-sm text-ink shadow-sm hover:border-accent"
                  aria-expanded={chapterOpen}
                >
                  <span className="min-w-0 flex-1 overflow-hidden leading-snug">
                    <span className="block font-semibold text-muted">{t.chapter}</span>
                    <span className="block break-words text-ink">{selectedChapter?.label ?? t.allChapters}</span>
                  </span>
                  <span className="shrink-0 text-muted" aria-hidden="true">⌄</span>
                </button>

                {chapterOpen && (
                  <div className="absolute left-0 right-0 z-[95] mt-2 w-full max-w-full overflow-hidden rounded-xl border border-line bg-panel p-3 shadow-xl">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {books.map((book) => {
                        const active = book === activeBook;
                        return (
                          <button
                            key={book}
                            type="button"
                            onClick={() => chooseBook(book)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              active ? "border-accent bg-accent text-white" : "border-line bg-paper text-accent hover:bg-accent-soft"
                            }`}
                          >
                            {book}
                          </button>
                        );
                      })}
                    </div>

                    <div className="suggest-scroll max-h-72 overflow-auto pr-1">
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => chooseChapter("")}
                          className={`rounded-lg border px-3 py-2 text-start text-sm transition ${
                            !babKey ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-paper text-ink hover:border-accent hover:text-accent"
                          }`}
                        >
                          {t.allChapters}
                        </button>
                        {chaptersForActiveBook.map((chapter) => {
                          const active = chapter.babKey === babKey;
                          return (
                            <button
                              key={chapter.babKey}
                              type="button"
                              onClick={() => chooseChapter(chapter.babKey)}
                              className={`rounded-lg border px-3 py-2 text-start text-sm transition ${
                                active ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-paper text-ink hover:border-accent hover:text-accent"
                              }`}
                            >
                              <span className="block">{chapter.label.replace(`${chapter.buku} · `, "")}</span>
                              <span className="block text-xs text-muted">{chapter.count} {t.footer}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedChapter && chapterEntries.length > 0 && (
            <div className="mt-5 rounded-2xl border border-line bg-panel p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t.wordsInChapter}</div>
                <div className="text-xs text-muted">{selectedChapter.label}</div>
              </div>
              <div className="scroll-cue rounded-xl bg-paper/70">
                <div className="suggest-scroll flex max-h-40 flex-wrap gap-2 overflow-auto p-2 pr-3">
                {chapterEntries.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => jumpToEntry(entry, index)}
                    className="arabic rounded-full border border-line bg-panel px-3 py-1.5 text-base leading-relaxed text-ink transition hover:border-accent hover:bg-accent-soft hover:text-accent"
                    title={language === "ms" ? entry.malay : entry.english}
                    dir="rtl"
                  >
                    {entry.arabic}
                  </button>
                ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-7">
            {!hasQuery && !babSelected ? (
              <div className="rounded-2xl border border-dashed border-line bg-panel/60 p-8 text-center">
                <p className="text-ink">{t.emptyTitle}</p>
                <p className="mt-1 text-sm text-muted">{t.emptyText}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {t.examples.map((example) => <button key={example} type="button" onClick={() => searchFor(example)} className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-ink hover:border-accent hover:text-accent">{example}</button>)}
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
                  <div className="space-y-4">
                    {shown.map((entry) => (
                      <div
                        key={entry.id}
                        id={`entry-${entry.id}`}
                        className={`scroll-mt-4 rounded-2xl transition ${focusedEntryId === entry.id ? "ring-2 ring-accent ring-offset-2 ring-offset-paper" : ""}`}
                      >
                        <DictionaryCard entry={entry} language={language} />
                      </div>
                    ))}
                  </div>
                )}
                {visible < fullResults.length && <div className="mt-6 flex justify-center"><button type="button" onClick={() => setVisible((v) => v + PAGE)} className="rounded-lg border border-line bg-panel px-5 py-2 text-sm font-medium text-accent hover:bg-accent-soft">{t.more} ({fullResults.length - visible} {t.remaining})</button></div>}
              </>
            )}
          </div>
        </div>
      </main>

      {showBackTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 z-40 rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-accent shadow-lg transition hover:bg-accent-soft"
        >
          ↑ {t.backToTop}
        </button>
      )}

      <footer className="mt-10 border-t border-line py-6">
        <p className="mx-auto max-w-3xl px-4 text-center text-xs text-muted">{entryCount.toLocaleString(language === "ms" ? "ms-MY" : "en-US")} {t.footer} · {chapters.length} {language === "ms" ? "bab" : "chapters"} · {t.local}</p>
      </footer>
    </div>
  );
}

function SearchIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-muted"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function XIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
