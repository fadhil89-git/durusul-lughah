import { entries, chapters, report } from "../data/dictionary.ts";

export function GET() {
  return new Response(
    JSON.stringify({
      entries,
      chapters,
      entryCount: report.entryCount,
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
