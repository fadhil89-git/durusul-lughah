// Dimuatkan pada BUILD TIME. CSV diimport sebagai teks mentah (?raw) supaya
// tiada bacaan fail semasa runtime dan tiada API luar.
import csvText from "./kamus-durusul-lughah.csv?raw";
import { parseDictionary, type DictionaryEntry } from "../lib/parseDictionary.ts";

const result = parseDictionary(csvText);

export const entries: DictionaryEntry[] = result.entries;
export const report = result.report;

export type ChapterOption = { babKey: string; label: string; buku: string; count: number };

/** Senarai bab dijana daripada DATA sebenar (bukan ditulis manual). */
export const chapters: ChapterOption[] = (() => {
  const map = new Map<string, ChapterOption>();
  for (const e of entries) {
    const cur = map.get(e.babKey);
    if (cur) cur.count++;
    else map.set(e.babKey, { babKey: e.babKey, label: e.babLabel, buku: e.buku, count: 1 });
  }
  const arr = Array.from(map.values());
  // Susun ikut buku kemudian nombor bab.
  arr.sort((a, b) => {
    const [ba, na] = a.babKey.split("|");
    const [bb, nb] = b.babKey.split("|");
    if (ba !== bb) return ba.localeCompare(bb, "ms");
    return (parseInt(na, 10) || 0) - (parseInt(nb, 10) || 0);
  });
  return arr;
})();
