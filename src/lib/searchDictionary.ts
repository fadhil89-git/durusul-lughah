import type { DictionaryEntry } from "./parseDictionary.ts";
import { normalizeArabic, hasArabic } from "./normalizeArabic.ts";
import { normalizeLatin } from "./normalizeLatin.ts";

export type SearchResult = { entry: DictionaryEntry; tier: number };
export const TIER = {
  ARABIC_EXACT: 0,
  ARABIC_NORM_EXACT: 1,
  ARABIC_PREFIX: 2,
  MALAY_EXACT: 3,
  ENGLISH_EXACT: 4,
  PLURAL_MATCH: 5,
  PARTIAL: 6,
  FUZZY: 7,
} as const;

export type FuseLike = { search: (q: string) => { item: DictionaryEntry }[] };
export type SearchIndex = { entries: DictionaryEntry[]; fuse: FuseLike | null };

export function buildSearchIndex(
  entries: DictionaryEntry[],
  FuseCtor?: new (list: DictionaryEntry[], opts: unknown) => FuseLike
): SearchIndex {
  const fuse = FuseCtor
    ? new FuseCtor(entries, {
        includeScore: true,
        ignoreLocation: true,
        threshold: 0.32,
        minMatchCharLength: 2,
        keys: [
          { name: "arabicNormalized", weight: 1 },
          { name: "pluralOrSingularNormalized", weight: 0.65 },
          { name: "malay", weight: 0.85 },
          { name: "english", weight: 0.85 },
          { name: "searchTextLatin", weight: 0.3 },
          { name: "searchTextArabic", weight: 0.3 },
        ],
      })
    : null;
  return { entries, fuse };
}

export function deterministicSearch(query: string, entries: DictionaryEntry[]): Map<string, number> {
  const best = new Map<string, number>();
  const consider = (id: string, tier: number) => {
    const current = best.get(id);
    if (current === undefined || tier < current) best.set(id, tier);
  };
  const qArabic = hasArabic(query);
  const qNormAr = normalizeArabic(query);
  const qNormLatin = normalizeLatin(query);
  const raw = query.trim();

  for (const entry of entries) {
    if (qArabic && qNormAr) {
      if (entry.arabic.trim() === raw) consider(entry.id, TIER.ARABIC_EXACT);
      if (entry.arabicNormalized === qNormAr) consider(entry.id, TIER.ARABIC_NORM_EXACT);
      else if (entry.arabicNormalized.startsWith(qNormAr)) consider(entry.id, TIER.ARABIC_PREFIX);
      if (entry.pluralOrSingularNormalized.includes(qNormAr)) consider(entry.id, TIER.PLURAL_MATCH);
      if (qNormAr.length >= 2 && entry.searchTextArabic.includes(qNormAr)) consider(entry.id, TIER.PARTIAL);
    } else if (qNormLatin) {
      const bm = normalizeLatin(entry.malay);
      const en = normalizeLatin(entry.english);
      const bmTokens = bm.split(" ");
      const enTokens = en.split(" ");
      if (bm === qNormLatin || bmTokens.includes(qNormLatin)) consider(entry.id, TIER.MALAY_EXACT);
      if (en === qNormLatin || enTokens.includes(qNormLatin)) consider(entry.id, TIER.ENGLISH_EXACT);
      if (normalizeLatin(entry.searchTextLatin).includes(qNormLatin)) consider(entry.id, TIER.PARTIAL);
      if (normalizeLatin(entry.babLabel).includes(qNormLatin)) consider(entry.id, TIER.PARTIAL);
    }
  }
  return best;
}

export function searchDictionary(
  query: string,
  index: SearchIndex,
  opts: { babKey?: string | null; limit?: number } = {}
): SearchResult[] {
  const q = query.trim();
  const byId = new Map(index.entries.map((entry) => [entry.id, entry]));
  const best = q ? deterministicSearch(q, index.entries) : new Map<string, number>();

  if (q && index.fuse && q.length >= 2) {
    const fuseQuery = hasArabic(q) ? normalizeArabic(q) : normalizeLatin(q);
    for (const result of index.fuse.search(fuseQuery)) {
      if (!best.has(result.item.id)) best.set(result.item.id, TIER.FUZZY);
    }
  }

  let results = Array.from(best, ([id, tier]) => ({ entry: byId.get(id)!, tier })).filter((r) => r.entry);
  if (opts.babKey) results = results.filter((r) => r.entry.babKey === opts.babKey);
  results.sort((a, b) =>
    a.tier - b.tier ||
    a.entry.arabicNormalized.length - b.entry.arabicNormalized.length ||
    a.entry.arabic.localeCompare(b.entry.arabic, "ar")
  );
  return opts.limit ? results.slice(0, opts.limit) : results;
}

export function suggest(
  query: string,
  index: SearchIndex,
  opts: { babKey?: string | null; limit?: number } = {}
): DictionaryEntry[] {
  return searchDictionary(query, index, { babKey: opts.babKey, limit: opts.limit ?? 8 }).map((r) => r.entry);
}
