import { useEffect, useMemo, useRef, useState } from "react";
import type { LessonSearchItem } from "../lib/parseLessons.ts";
import { hasArabic, normalizeArabic } from "../lib/normalizeArabic.ts";
import { normalizeLatin } from "../lib/normalizeLatin.ts";
import { normalizeTransliterationInput } from "../lib/transliterateArabic.ts";

type ChapterJumpItem = {
  book: string;
  bookNumber: number;
  chapter: number;
  title: string;
  url: string;
};

type Props = {
  chapters: ChapterJumpItem[];
  currentBook: number;
  currentChapter: number;
  searchEndpoint?: string;
  language?: "ms" | "ar";
};

type NavSearchItem = LessonSearchItem & {
  arUrl?: string;
};

const RESULT_LIMIT = 10;

function scoreItem(item: LessonSearchItem, query: string): number {
  const arabicQuery = normalizeArabic(query);
  const latinQuery = normalizeLatin(query);
  const translitQuery = normalizeTransliterationInput(query);
  const latinTokens = latinQuery.split(" ").filter(Boolean);
  let score = 0;

  if (hasArabic(query) && arabicQuery) {
    if (item.arabic === arabicQuery) score += 120;
    else if (item.arabic.includes(arabicQuery)) score += 85;
  }

  if (latinQuery) {
    if (item.latin.includes(latinQuery)) score += 80;
    const matchedTokens = latinTokens.filter((token) => item.latin.includes(token));
    if (matchedTokens.length === latinTokens.length) score += 55;
    else score += matchedTokens.length * 16;
  }

  if (translitQuery && item.transliteration.includes(translitQuery)) score += 70;
  if (/bab\s*\d+/.test(latinQuery)) score += 8;

  return score;
}

export default function LessonArticleNav({ chapters, currentBook, currentChapter, searchEndpoint = "/lesson-search.json", language = "ms" }: Props) {
  const [query, setQuery] = useState("");
  const [chapterOpen, setChapterOpen] = useState(false);
  const [activeBook, setActiveBook] = useState(currentBook);
  const [searchItems, setSearchItems] = useState<NavSearchItem[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const clean = query.trim();
  const isArabic = language === "ar";

  const current = useMemo(
    () => chapters.find((chapter) => chapter.bookNumber === currentBook && chapter.chapter === currentChapter),
    [chapters, currentBook, currentChapter],
  );

  const books = useMemo(() => {
    const seen = new Map<number, string>();
    for (const chapter of chapters) seen.set(chapter.bookNumber, chapter.book);
    return Array.from(seen, ([bookNumber, book]) => ({ bookNumber, book }));
  }, [chapters]);

  const activeBookChapters = useMemo(
    () => chapters.filter((chapter) => chapter.bookNumber === activeBook),
    [chapters, activeBook],
  );

  const results = useMemo(() => {
    if (clean.length < 2) return [];
    return searchItems
      .map((item) => ({ item, score: scoreItem(item, clean) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.item.bookNumber - b.item.bookNumber || a.item.chapter - b.item.chapter)
      .slice(0, RESULT_LIMIT);
  }, [clean, searchItems]);

  useEffect(() => {
    if (clean.length >= 2) setChapterOpen(false);
  }, [clean.length]);

  useEffect(() => {
    if (clean.length < 2 || searchStatus !== "idle") return;

    let alive = true;
    setSearchStatus("loading");

    fetch(searchEndpoint)
      .then((response) => {
        if (!response.ok) throw new Error(`Search index failed: ${response.status}`);
        return response.json() as Promise<NavSearchItem[]>;
      })
      .then((items) => {
        if (!alive) return;
        setSearchItems(items);
        setSearchStatus("ready");
      })
      .catch(() => {
        if (!alive) return;
        setSearchStatus("error");
      });

    return () => {
      alive = false;
    };
  }, [clean.length, searchEndpoint, searchStatus]);

  const labels = isArabic
    ? {
        search: "بحث سريع",
        searchPlaceholder: "ابحث عن موضوع أو حكم...",
        jump: "انتقال",
        book: "كتاب",
        chapter: "باب",
        noResults: "لا توجد نتيجة.",
        loading: "جار تحميل الفهرس...",
        error: "تعذر تحميل البحث.",
      }
    : {
        search: "Cari Cepat",
        searchPlaceholder: "Cari hukum, topik atau istilah...",
        jump: "Lompat Bab",
        book: "Buku",
        chapter: "Bab",
        noResults: "Tiada hasil.",
        loading: "Memuat index carian...",
        error: "Carian tidak dapat dimuat.",
      };

  return (
    <div ref={wrapperRef} className="sticky top-0 z-[80] border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto grid w-full max-w-4xl min-w-0 gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
        <div className="relative z-[90] min-w-0">
          <label htmlFor="lesson-quick-search" className="sr-only">{labels.search}</label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 focus-within:border-accent">
            <span className="text-muted" aria-hidden="true">⌕</span>
            <input
              id="lesson-quick-search"
              value={query}
              onFocus={() => setChapterOpen(false)}
              onChange={(event) => {
                setQuery(event.target.value);
                setChapterOpen(false);
              }}
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
              placeholder={labels.searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full px-2 text-sm font-semibold text-muted hover:bg-accent-soft hover:text-accent"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {clean.length >= 2 && (
            <div className="suggest-scroll absolute left-0 right-0 z-[100] mt-2 max-h-72 w-full max-w-full overflow-auto rounded-xl border border-line bg-panel py-2 shadow-xl">
              {searchStatus === "loading" ? (
                <p className="px-4 py-3 text-sm text-muted">{labels.loading}</p>
              ) : searchStatus === "error" ? (
                <p className="px-4 py-3 text-sm text-muted">{labels.error}</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted">{labels.noResults}</p>
              ) : (
                results.map(({ item }) => (
                  <a
                    key={item.id}
                    href={isArabic ? item.arUrl ?? item.url : item.url}
                    className="block border-b border-line/70 px-4 py-3 last:border-b-0 hover:bg-accent-soft"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                      <span>{isArabic ? `كتاب ${item.bookNumber}` : item.book}</span>
                      <span>·</span>
                      <span>{labels.chapter} {item.chapter}</span>
                    </div>
                    <div className="mt-1 break-words text-sm font-semibold text-accent">{item.section}</div>
                    <p className="arabic mt-1 line-clamp-2 break-words text-base text-ink" dir="rtl">{item.arabicTitle}</p>
                  </a>
                ))
              )}
            </div>
          )}
        </div>

        <div className="relative z-[85] min-w-0">
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setChapterOpen((open) => !open);
            }}
            className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-panel px-3 py-2 text-start text-sm text-ink hover:border-accent"
            aria-expanded={chapterOpen}
          >
            <span className="min-w-0 flex-1 overflow-hidden leading-snug">
              <span className="block font-semibold text-muted">
                {isArabic ? `كتاب ${currentBook} · باب ${currentChapter}` : `${current?.book ?? `Buku ${currentBook}`} · Bab ${currentChapter}`}
              </span>
              <span className="block break-words text-ink">{current?.title}</span>
            </span>
            <span className="shrink-0 text-muted" aria-hidden="true">⌄</span>
          </button>

          {chapterOpen && (
            <div className="absolute left-0 right-0 z-[95] mt-2 w-full max-w-full overflow-hidden rounded-xl border border-line bg-panel p-3 shadow-xl">
              <div className="mb-3 flex flex-wrap gap-2">
                {books.map((book) => {
                  const active = book.bookNumber === activeBook;
                  return (
                    <button
                      key={book.bookNumber}
                      type="button"
                      onClick={() => setActiveBook(book.bookNumber)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        active ? "border-accent bg-accent text-white" : "border-line bg-paper text-accent hover:bg-accent-soft"
                      }`}
                    >
                      {isArabic ? `${labels.book} ${book.bookNumber}` : book.book}
                    </button>
                  );
                })}
              </div>

              <div className="suggest-scroll max-h-72 overflow-auto pr-1">
                <div className="grid gap-2">
                  {activeBookChapters.map((chapter) => {
                    const active = chapter.bookNumber === currentBook && chapter.chapter === currentChapter;
                    return (
                      <a
                        key={`${chapter.bookNumber}-${chapter.chapter}`}
                        href={chapter.url}
                        className={`block rounded-lg border px-3 py-2 text-sm transition ${
                          active ? "border-accent bg-accent-soft text-accent" : "border-line bg-paper text-ink hover:border-accent hover:text-accent"
                        }`}
                      >
                        <span className="block font-semibold">{labels.chapter} {chapter.chapter}</span>
                        <span className="block break-words leading-snug">{chapter.title}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
