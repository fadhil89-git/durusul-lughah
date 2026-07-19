import { cleanTopicTitle, headingToId, markdownToHtml, topicTitleHint } from "./markdownToHtml.ts";
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
  toc: LessonTocItem[];
  rawBody: string;
  html: string;
};

export type LessonTocItem = {
  id: string;
  title: string;
  hint?: string;
  level: 2 | 3;
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
  return value
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\(\(([^)]+)\)\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

function splitTitle(value: string): { titleArabic: string; titleMalay: string } {
  const clean = plainInline(value);
  const parts = clean.split(/\s+—\s+/);
  return {
    titleArabic: cleanTopicTitle(parts[0]?.trim() ?? clean),
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

function stripLearningOverview(markdown: string): string {
  const marker = "## Apa yang Dipelajari dalam Bab Ini";
  const start = markdown.indexOf(marker);
  if (start < 0) return markdown;

  const nextHeading = markdown.indexOf("\n## ", start + marker.length);
  const before = markdown.slice(0, start).trimEnd();
  const after = nextHeading > -1 ? markdown.slice(nextHeading).trimStart() : "";
  return [before, after].filter(Boolean).join("\n\n").trim();
}

function isUsefulTocTitle(title: string): boolean {
  const plainTitle = title
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim()
    .replace(/^\d+\.\s*/, "")
    .toLowerCase();
  if (
    plainTitle.startsWith("i‘rab") ||
    plainTitle.startsWith("i’rab") ||
    plainTitle.startsWith("tidak digunakan")
  ) {
    return false;
  }

  return ![
    "apa yang dipelajari dalam bab ini",
    "penerangan",
    "contoh",
    "nota",
    "latihan",
    "betul",
    "salah",
    "mengapa salah",
    "jawapan",
  ].includes(plainTitle);
}

function extractToc(markdown: string): LessonTocItem[] {
  const seen = new Set<string>();
  return Array.from(markdown.matchAll(/^##\s+(.+)$/gm))
    .map((match) => {
      const rawTitle = plainInline(match[1]);
      return {
        id: headingToId(rawTitle),
        title: cleanTopicTitle(rawTitle),
        hint: topicTitleHint(rawTitle),
        level: 2 as const,
      };
    })
    .filter((item) => {
      if (!isUsefulTocTitle(item.title)) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
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
          "Index Bab",
          chapter.summary.slice(0, 4).join("; "),
          "",
        ));
      }

      const headingMatches = Array.from(chapter.rawBody.matchAll(/^(##|###)\s+(.+)$/gm));
      for (const match of headingMatches) {
        const section = match[2];
        const displaySection = match[1] === "##" ? cleanTopicTitle(section) : plainInline(section);
        const start = (match.index ?? 0) + match[0].length;
        const next = chapter.rawBody.slice(start).match(/\n(?:##|###)\s+/);
        const block = chapter.rawBody.slice(start, next?.index ? start + next.index : undefined);
        const excerpt = block
          .split("\n")
          .map((line) => line.trim())
          .find((line) => line && !line.startsWith("|") && !line.startsWith("---")) ?? section;

        items.push(makeSearchItem(chapter, displaySection, excerpt.replace(/^- /, ""), headingToId(section)));
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
  const title = `Buku Bahasa Arab Madinah — Buku ${bookNumber}`;
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
    const bodyWithoutOverview = stripLearningOverview(body);

    return {
      book: `Buku ${bookNumber}`,
      bookNumber,
      chapter,
      slug: `bab-${chapter}`,
      titleArabic: titleParts.titleArabic,
      titleMalay: titleParts.titleMalay,
      title: titleParts.titleMalay ? `${titleParts.titleArabic} — ${titleParts.titleMalay}` : titleParts.titleArabic,
      summary: extractSummary(rawChapter),
      toc: extractToc(bodyWithoutOverview),
      rawBody: bodyWithoutOverview,
      html: markdownToHtml(bodyWithoutOverview, { showTopicHints: true }),
    };
  });

  return { book: `Buku ${bookNumber}`, bookNumber, title, chapters };
}
