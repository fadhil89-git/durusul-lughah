import buku1Bab1Arabic from "./lessons-ar/buku-1-bab-1.md?raw";
import { markdownToHtml } from "../lib/markdownToHtml.ts";

export type LocalizedLesson = {
  bookNumber: number;
  chapter: number;
  language: "ar";
  title: string;
  html: string;
  url: string;
};

function parseArabicLesson(markdown: string, bookNumber: number, chapter: number): LocalizedLesson {
  const cleaned = markdown.replace(/<!--[\s\S]*?-->/g, "").trim();
  const titleMatch = cleaned.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? `الدرس ${chapter}`;
  const body = cleaned
    .replace(/<div class="lesson-page"[^>]*>\s*/m, "")
    .replace(/<header class="lesson-header">[\s\S]*?<\/header>\s*/m, "")
    .replace(/<\/div>\s*$/m, "")
    .replace(/^#\s+.+\n+/, "")
    .trim();

  return {
    bookNumber,
    chapter,
    language: "ar",
    title,
    html: markdownToHtml(body),
    url: `/durusul-lughah/ar/buku-${bookNumber}/bab-${chapter}`,
  };
}

export const arabicLessons: LocalizedLesson[] = [
  parseArabicLesson(buku1Bab1Arabic, 1, 1),
];

export function findArabicLesson(bookNumber: number, chapter: number): LocalizedLesson | undefined {
  return arabicLessons.find((lesson) => lesson.bookNumber === bookNumber && lesson.chapter === chapter);
}

export function hasArabicLesson(bookNumber: number, chapter: number): boolean {
  return Boolean(findArabicLesson(bookNumber, chapter));
}
