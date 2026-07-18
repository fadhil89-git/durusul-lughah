import { headingToId, markdownToHtml } from "./markdownToHtml.ts";
import { normalizeArabic } from "./normalizeArabic.ts";
import { normalizeLatin } from "./normalizeLatin.ts";
import { arabicToTransliterationKeys } from "./transliterateArabic.ts";

export type LessonChapter = {
  book: string;
  bookNumber: number;
  chapter: number;
  slug: string;
  titleArabic: string;
  titleMalay: string;
  title: string;
  summary: string[];
  rawBody: string;
  html: string;
};

export type LessonBook = {
  book: string;
  bookNumber: number;
  title: string;
  chapters: LessonChapter[];
};

export type LessonSearchItem = {
  id: string;
  book: string;
  bookNumber: number;
  chapter: number;
  title: string;
  arabicTitle: string;
  section: string;
  excerpt: string;
  url: string;
  latin: string;
  arabic: string;
  transliteration: string;
};

function stripComments(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, "").trim();
}

function plainInline(value: string): string {
  return value.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function splitTitle(value: string): { titleArabic: string; titleMalay: string } {
  const clean = plainInline(value);
  const parts = clean.split(/\s+—\s+/);
  return {
    titleArabic: parts[0]?.trim() ?? clean,
    titleMalay: parts.slice(1).join(" — ").trim(),
  };
}

function extractSummary(markdown: string): string[] {
  const marker = "## Apa yang Dipelajari dalam Bab Ini";
  const start = markdown.indexOf(marker);
  if (start < 0) return [];
  const nextHeading = markdown.indexOf("\n## ", start + marker.length);
  const block = markdown.slice(start + marker.length, nextHeading > -1 ? nextHeading : undefined);
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => plainInline(line.slice(2)));
}

function stripRepeatedChapterHeading(markdown: string): string {
  return markdown.replace(/^##\s+.+\n+/, "").trim();
}

function keywordAliases(text: string): string {
  const aliases: string[] = [];
  const checks: [RegExp, string][] = [
    [/إِنَّ|إنَّ|اسم إن/i, "inna isim inna ism inna harf nasab nasab mansub penegasan"],
    [/لَعَلَّ|لعل/i, "laalla la alla harapan tarajji isim laalla"],
    [/لَيْسَ|ليس/i, "laysa laisa penafian khabar laysa"],
    [/مُبْتَدَأ|مبتدأ/i, "mubtada subjek jumlah ismiyyah"],
    [/خَبَر|خبر/i, "khabar predikat"],
    [/مَنْصُوب|منصوب|نَصْب|نصب/i, "mansub nasab accusative"],
    [/مَجْرُور|مجرور|جَرّ|جر/i, "majrur jarr genitive"],
    [/مَرْفُوع|مرفوع|رَفْع|رفع/i, "marfu rafa nominative"],
    [/مُضَاف|مضاف/i, "mudaf mudhaf idafah"],
    [/فِعْل|فعل/i, "fiil fi il verb"],
    [/مُضَارِع|مضارع/i, "mudari mudhari mudhari present"],
    [/مَاضِي|ماضي/i, "madi madhi past"],
    [/أَمْر|امر|أمر/i, "amr perintah command"],
    [/الْأَفْعَالُ الْخَمْسَة|الأفعال الخمسة|افعال خمسه/i, "afal khamsah af aal khamsah lima fiil"],
    [/مَعْرِفَة|معرفة/i, "marifah definite tertentu"],
    [/نَكِرَة|نكرة/i, "nakirah indefinite umum"],
    [/صَرْف|صرف/i, "sorof sarf morphology"],
    [/نَحْو|نحو/i, "nahu grammar"],
  ];

  for (const [pattern, value] of checks) {
    if (pattern.test(text)) aliases.push(value);
  }
  return aliases.join(" ");
}

function makeSearchItem(chapter: LessonChapter, section: string, excerpt: string, anchor = ""): LessonSearchItem {
  const source = [chapter.title, chapter.titleArabic, section, excerpt].join(" ");
  const aliasText = keywordAliases(source);
  const url = `/durusul-lughah/buku-${chapter.bookNumber}/bab-${chapter.chapter}${anchor ? `#${anchor}` : ""}`;

  return {
    id: `${chapter.bookNumber}-${chapter.chapter}-${anchor || "top"}-${section.length}`,
    book: chapter.book,
    bookNumber: chapter.bookNumber,
    chapter: chapter.chapter,
    title: chapter.titleMalay || chapter.title,
    arabicTitle: chapter.titleArabic,
    section: plainInline(section),
    excerpt: plainInline(excerpt),
    url,
    latin: normalizeLatin([source, aliasText].join(" ")),
    arabic: normalizeArabic(source),
    transliteration: arabicToTransliterationKeys(source),
  };
}

export function buildLessonSearchItems(books: LessonBook[]): LessonSearchItem[] {
  const items: LessonSearchItem[] = [];

  for (const book of books) {
    for (const chapter of book.chapters) {
      items.push(makeSearchItem(chapter, `${chapter.book} Bab ${chapter.chapter}`, chapter.title, ""));

      if (chapter.summary.length) {
        items.push(makeSearchItem(
          chapter,
          "Apa yang Dipelajari dalam Bab Ini",
          chapter.summary.slice(0, 4).join("; "),
          headingToId("Apa yang Dipelajari dalam Bab Ini"),
        ));
      }

      const headingMatches = Array.from(chapter.rawBody.matchAll(/^(##|###)\s+(.+)$/gm));
      for (const match of headingMatches) {
        const section = match[2];
        const start = (match.index ?? 0) + match[0].length;
        const next = chapter.rawBody.slice(start).match(/\n(?:##|###)\s+/);
        const block = chapter.rawBody.slice(start, next?.index ? start + next.index : undefined);
        const excerpt = block
          .split("\n")
          .map((line) => line.trim())
          .find((line) => line && !line.startsWith("|") && !line.startsWith("---")) ?? section;

        items.push(makeSearchItem(chapter, section, excerpt.replace(/^- /, ""), headingToId(section)));
      }
    }
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.url}|${item.section}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseLessonBook(markdown: string, bookNumber: number): LessonBook {
  const cleaned = stripComments(markdown);
  const titleMatch = cleaned.match(/^#\s+(.+)$/m);
  const title = titleMatch ? plainInline(titleMatch[1]) : `Durusul Lughah Buku ${bookNumber}`;
  const chapterRegex = /^# Bab\s+(\d+)\s+—\s+(.+)$/gm;
  const matches = Array.from(cleaned.matchAll(chapterRegex));

  const chapters = matches.map((match, index) => {
    const chapter = Number(match[1]);
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? cleaned.length;
    const rawChapter = cleaned.slice(start, end).trim();
    const firstTopic = rawChapter.match(/^##\s+(.+)$/m);
    const titleParts = splitTitle(firstTopic?.[1] ?? match[2]);
    const body = stripRepeatedChapterHeading(
      rawChapter.replace(/^# Bab\s+\d+\s+—\s+.+\n+/, "").trim(),
    );

    return {
      book: `Buku ${bookNumber}`,
      bookNumber,
      chapter,
      slug: `bab-${chapter}`,
      titleArabic: titleParts.titleArabic,
      titleMalay: titleParts.titleMalay,
      title: titleParts.titleMalay ? `${titleParts.titleArabic} — ${titleParts.titleMalay}` : titleParts.titleArabic,
      summary: extractSummary(rawChapter),
      rawBody: body,
      html: markdownToHtml(body),
    };
  });

  return { book: `Buku ${bookNumber}`, bookNumber, title, chapters };
}
