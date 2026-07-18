import buku1Arabic from "./lessons-ar/buku-1.md?raw";
import buku2Arabic from "./lessons-ar/buku-2.md?raw";
import buku3Arabic from "./lessons-ar/buku-3.md?raw";
import { cleanTopicTitle, headingToId, markdownToHtml } from "../lib/markdownToHtml.ts";
import type { LessonTocItem } from "../lib/parseLessons.ts";

export type LocalizedLesson = {
  bookNumber: number;
  chapter: number;
  language: "ar";
  title: string;
  toc: LessonTocItem[];
  html: string;
  url: string;
};

type ArabicSection = {
  chapters: number[];
  title: string;
  body: string;
};

const buku1ChapterGroups = [
  [1],
  [2],
  [3],
  [4],
  [5],
  [6],
  [7],
  [8],
  [9],
  [10],
  [11],
  [12],
  [13],
  [14],
  [15],
  [16, 17],
  [18],
  [19, 20],
  [21],
  [22, 23],
];

const buku2ChapterGroups = [
  [1],
  [2],
  [3],
  [4],
  [5],
  [6],
  [7],
  [8],
  [9],
  [10],
  [11],
  [12, 13],
  [14],
  [15],
  [16],
  [17],
  [18],
  [19],
  [20],
  [21],
  [22],
  [23],
  [24],
  [25],
  [26],
  [27],
  [28],
  [29],
  [30],
  [31],
];

const buku3ChapterGroups = Array.from({ length: 34 }, (_, index) => [index + 1]);

function splitArabicBook(markdown: string, chapterGroups: number[][]): ArabicSection[] {
  const cleaned = markdown.replace(/<!--[\s\S]*?-->/g, "").trim();
  const matches = [...cleaned.matchAll(/^#{1,2}\s+((?:الد[\u064b-\u065f]*ر[\u064b-\u065f]*س|الدرس).+)$/gm)];

  return matches
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? cleaned.length;
      const rawSection = cleaned.slice(start, end).trim();
      const title = match[1].trim();
      const body = rawSection.replace(/^#{1,2}\s+.+\n+/, "").trim();
      return {
        chapters: chapterGroups[index] ?? [index + 1],
        title,
        body,
      };
    })
    .filter((section) => section.body.length > 0);
}

function plainInline(value: string): string {
  return value
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\(\(([^)]+)\)\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

function isUsefulTocTitle(title: string): boolean {
  const plainTitle = plainInline(title).toLowerCase();
  return ![
    "أمثلة",
    "الأمثلة",
    "مثال",
    "تدريب",
    "التدريب",
    "تمرين",
    "التمرين",
    "تنبيه",
    "ملاحظة",
  ].includes(plainTitle);
}

function extractToc(markdown: string): LessonTocItem[] {
  const seen = new Set<string>();
  return Array.from(markdown.matchAll(/^(##|###)\s+(.+)$/gm))
    .filter((match) => match[1] === "##" || match[2].includes("[["))
    .map((match) => {
      const rawTitle = plainInline(match[2]);
      return {
        id: headingToId(rawTitle),
        title: cleanTopicTitle(rawTitle),
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

function parseArabicBook(markdown: string, bookNumber: number, chapterGroups: number[][]): LocalizedLesson[] {
  return splitArabicBook(markdown, chapterGroups).flatMap((section) =>
    section.chapters.map((chapter) => ({
      bookNumber,
      chapter,
      language: "ar" as const,
      title: section.title,
      toc: extractToc(section.body),
      html: markdownToHtml(section.body),
      url: `/durusul-lughah/ar/buku-${bookNumber}/bab-${chapter}`,
    }))
  );
}

export const arabicLessons: LocalizedLesson[] = [
  ...parseArabicBook(buku1Arabic, 1, buku1ChapterGroups),
  ...parseArabicBook(buku2Arabic, 2, buku2ChapterGroups),
  ...parseArabicBook(buku3Arabic, 3, buku3ChapterGroups),
];

export function findArabicLesson(bookNumber: number, chapter: number): LocalizedLesson | undefined {
  return arabicLessons.find((lesson) => lesson.bookNumber === bookNumber && lesson.chapter === chapter);
}

export function hasArabicLesson(bookNumber: number, chapter: number): boolean {
  return Boolean(findArabicLesson(bookNumber, chapter));
}
