import { hasArabicLesson } from "../data/lessonLocales.ts";
import { lessonSearchItems } from "../data/lessons.ts";

export function GET() {
  const items = lessonSearchItems.map((item) => {
    const arUrl = hasArabicLesson(item.bookNumber, item.chapter)
      ? item.url.replace("/durusul-lughah/", "/durusul-lughah/ar/")
      : item.url;

    return {
      ...item,
      arUrl,
    };
  });

  return new Response(JSON.stringify(items), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
