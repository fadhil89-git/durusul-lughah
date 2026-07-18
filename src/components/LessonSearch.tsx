import { useMemo, useState } from "react";
import type { LessonSearchItem } from "../lib/parseLessons.ts";
import { hasArabic, normalizeArabic } from "../lib/normalizeArabic.ts";
import { normalizeLatin } from "../lib/normalizeLatin.ts";
import { normalizeTransliterationInput } from "../lib/transliterateArabic.ts";

type Props = {
  items: LessonSearchItem[];
};

const RESULT_LIMIT = 8;

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
  if (/kesalahan|salah|mistake|error/.test(latinQuery) && /kesalahan/i.test(item.section)) score += 20;
  if (/bab\s*\d+/.test(latinQuery)) score += 8;

  return score;
}

export default function LessonSearch({ items }: Props) {
  const [query, setQuery] = useState("");
  const clean = query.trim();

  const results = useMemo(() => {
    if (clean.length < 2) return [];
    return items
      .map((item) => ({ item, score: scoreItem(item, clean) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.item.bookNumber - b.item.bookNumber || a.item.chapter - b.item.chapter)
      .slice(0, RESULT_LIMIT);
  }, [clean, items]);

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <label htmlFor="lesson-search" className="block text-sm font-semibold uppercase tracking-[0.08em] text-muted">
        Cari Topik
      </label>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 focus-within:border-accent">
        <span className="text-muted" aria-hidden="true">⌕</span>
        <input
          id="lesson-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-transparent text-lg text-ink placeholder:text-muted focus:outline-none"
          placeholder="Contoh: isim inna, mudari, mansub, لَيْسَ"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="rounded-full px-2 py-1 text-sm font-semibold text-muted hover:bg-accent-soft hover:text-accent"
            aria-label="Kosongkan carian"
          >
            ×
          </button>
        )}
      </div>

      {clean.length > 0 && clean.length < 2 && (
        <p className="mt-3 text-sm text-muted">Taip sekurang-kurangnya 2 aksara.</p>
      )}

      {clean.length >= 2 && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-paper p-4 text-sm text-muted">
              Tiada topik ditemui. Cuba istilah lain seperti “nahu”, “sorof”, “mansub”, atau taip Arab tanpa baris.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map(({ item }) => (
                <a
                  key={item.id}
                  href={item.url}
                  className="block rounded-xl border border-line bg-paper p-4 transition hover:border-accent hover:bg-accent-soft"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    <span>{item.book}</span>
                    <span>·</span>
                    <span>Bab {item.chapter}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-accent">{item.section}</h3>
                  <p className="arabic mt-1 text-xl text-ink" dir="rtl">{item.arabicTitle}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{item.excerpt}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
