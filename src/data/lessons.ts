import buku1Markdown from "./lessons/buku-1.md?raw";
import buku2Markdown from "./lessons/buku-2.md?raw";
import buku3Markdown from "./lessons/buku-3.md?raw";
import { buildLessonSearchItems, parseLessonBook, type LessonBook, type LessonChapter } from "../lib/parseLessons.ts";

export const lessonBooks: LessonBook[] = [
  parseLessonBook(buku1Markdown, 1),
  parseLessonBook(buku2Markdown, 2),
  parseLessonBook(buku3Markdown, 3),
];

export const lessonChapters: LessonChapter[] = lessonBooks.flatMap((book) => book.chapters);
export const lessonSearchItems = buildLessonSearchItems(lessonBooks);

export function findLessonChapter(bookSlug: string, chapterSlug: string): LessonChapter | undefined {
  const bookNumber = Number(bookSlug.replace("buku-", ""));
  const chapterNumber = Number(chapterSlug.replace("bab-", ""));
  return lessonChapters.find((chapter) => chapter.bookNumber === bookNumber && chapter.chapter === chapterNumber);
}

export function getAdjacentLesson(chapter: LessonChapter, direction: -1 | 1): LessonChapter | undefined {
  const index = lessonChapters.findIndex((item) => item.bookNumber === chapter.bookNumber && item.chapter === chapter.chapter);
  return index >= 0 ? lessonChapters[index + direction] : undefined;
}
