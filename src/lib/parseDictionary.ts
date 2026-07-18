import { normalizeArabic } from "./normalizeArabic.ts";
import { arabicToTransliterationKeys } from "./transliterateArabic.ts";

export type DictionaryEntry = {
  id: string;
  buku: string;
  bab: string;
  babKey: string;
  babLabel: string;
  changeNote: string;
  arabic: string;
  arabicNormalized: string;
  arabicTranslit: string;
  pluralOrSingular: string;
  pluralOrSingularNormalized: string;
  malay: string;
  english: string;
  noteMalay: string;
  noteEnglish: string;
  nahuArabic: string;
  nahuMalay: string;
  nahuEnglish: string;
  sarfArabic: string;
  sarfMalay: string;
  sarfEnglish: string;
  searchTextLatin: string;
  searchTextArabic: string;
};

export type ParseReport = {
  totalRawRows: number;
  bukuTitleRows: number[];
  headerRows: number[];
  separatorRows: number[];
  emptyRows: number[];
  rowsMissingBab: number[];
  rowsMissingArabic: number[];
  entryCount: number;
  perBuku: { buku: string; entries: number; babRange: string; chapters: number }[];
};

export type ParseResult = { entries: DictionaryEntry[]; report: ParseReport };

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeBukuLabel(raw: string): string {
  const value = cleanText(raw);
  const m = value.match(/BUKU\s*(\d+)/i);
  return m ? `Buku ${m[1]}` : value;
}

function headerKey(value: string): string {
  return cleanText(value).replace(/\s+/g, " ").toLocaleLowerCase("ms");
}

function cleanText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

export function parseDictionary(csvText: string): ParseResult {
  const rows = parseCsv(csvText);
  const report: ParseReport = {
    totalRawRows: rows.length,
    bukuTitleRows: [],
    headerRows: [],
    separatorRows: [],
    emptyRows: [],
    rowsMissingBab: [],
    rowsMissingArabic: [],
    entryCount: 0,
    perBuku: [],
  };

  const entries: DictionaryEntry[] = [];
  let currentBuku = "Buku 1";
  let columns = new Map<string, number>();
  const perBukuMap = new Map<string, { count: number; babs: Set<string> }>();

  const get = (row: string[], label: string, fallback = -1) => {
    const index = columns.get(headerKey(label)) ?? fallback;
    return index >= 0 ? cleanText(row[index] ?? "") : "";
  };

  rows.forEach((row, idx) => {
    const lineNo = idx + 1;
    const first = cleanText(row[0] ?? "");

    if (row.every((x) => cleanText(x ?? "") === "")) {
      report.emptyRows.push(lineNo);
      return;
    }
    if (/^BUKU\s*\d+/i.test(first)) {
      currentBuku = normalizeBukuLabel(first);
      report.bukuTitleRows.push(lineNo);
      return;
    }
    if (row.some((x) => headerKey(x ?? "") === "kalimah asal (arab)")) {
      columns = new Map(row.map((value, index) => [headerKey(value ?? ""), index]));
      report.headerRows.push(lineNo);
      return;
    }
    if (row.every((x) => cleanText(x ?? "") === "---")) {
      report.separatorRows.push(lineNo);
      return;
    }

    const bab = get(row, "Bab", 0);
    const arabic = get(row, "Kalimah Asal (Arab)", 2);
    if (!bab) report.rowsMissingBab.push(lineNo);
    if (!arabic) report.rowsMissingArabic.push(lineNo);
    if (!bab || !arabic) return;

    const rawPlural = get(row, "Jamak/Mufrad", 3);
    const pluralOrSingular = rawPlural === "-" ? "" : rawPlural;
    const malay = get(row, "Terjemahan (BM)", 4);
    const english = get(row, "Terjemahan (BI)", 5);
    const noteMalay = get(row, "Nota BM", 6);
    const noteEnglish = get(row, "Nota English", 7);
    const nahuArabic = get(row, "Nota Nahu (Arab)", 8);
    const nahuMalay = get(row, "Nota Nahu (BM)", 9);
    const nahuEnglish = get(row, "Nota Nahu (English)", 10);
    const sarfArabic = get(row, "Nota Sarf (Arab)", 11);
    const sarfMalay = get(row, "Nota Sarf (BM)", 12);
    const sarfEnglish = get(row, "Nota Sarf (English)", 13);
    const changeNote = get(row, "Nota Perubahan", 1);

    const entry: DictionaryEntry = {
      id: `${currentBuku.replace(/\s+/g, "")}-b${bab}-${entries.length + 1}`,
      buku: currentBuku,
      bab,
      babKey: `${currentBuku}|${bab}`,
      babLabel: `${currentBuku} · Bab ${bab}`,
      changeNote,
      arabic,
      arabicNormalized: normalizeArabic(arabic),
      arabicTranslit: arabicToTransliterationKeys([arabic, pluralOrSingular].join(" ")),
      pluralOrSingular,
      pluralOrSingularNormalized: normalizeArabic(pluralOrSingular),
      malay,
      english,
      noteMalay,
      noteEnglish,
      nahuArabic,
      nahuMalay,
      nahuEnglish,
      sarfArabic,
      sarfMalay,
      sarfEnglish,
      searchTextLatin: [malay, english, noteMalay, noteEnglish, nahuMalay, nahuEnglish, sarfMalay, sarfEnglish].join(" "),
      searchTextArabic: normalizeArabic([arabic, pluralOrSingular, nahuArabic, sarfArabic].join(" ")),
    };
    entries.push(entry);

    const acc = perBukuMap.get(currentBuku) ?? { count: 0, babs: new Set<string>() };
    acc.count++;
    acc.babs.add(bab);
    perBukuMap.set(currentBuku, acc);
  });

  report.entryCount = entries.length;
  for (const [buku, acc] of perBukuMap) {
    const nums = Array.from(acc.babs).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    report.perBuku.push({
      buku,
      entries: acc.count,
      babRange: nums.length ? `${nums[0]}–${nums[nums.length - 1]}` : "-",
      chapters: acc.babs.size,
    });
  }
  return { entries, report };
}
