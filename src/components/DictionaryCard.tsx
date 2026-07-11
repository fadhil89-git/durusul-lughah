import type { ReactNode } from "react";
import type { DictionaryEntry } from "../lib/parseDictionary.ts";

export type UiLanguage = "ms" | "en";

type Props = { entry: DictionaryEntry; language: UiLanguage };

function Field({ label, children, arabic = false }: { label: string; children: ReactNode; arabic?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={arabic ? "arabic mt-1 text-xl text-ink" : "mt-1 text-ink"}>{children}</div>
    </div>
  );
}

function KnowledgeAccordion({
  title,
  arabic,
  translated,
  language,
}: {
  title: string;
  arabic: string;
  translated: string;
  language: UiLanguage;
}) {
  if (!arabic && !translated) return null;
  return (
    <details className="group overflow-hidden rounded-xl border border-line bg-paper/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium text-ink marker:hidden">
        <span>{title}</span>
        <span className="text-accent transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
      </summary>
      <div className="border-t border-line px-4 py-4">
        {arabic && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">العربية</div>
            <p className="arabic mt-1 text-lg leading-loose text-ink" dir="rtl">{arabic}</p>
          </div>
        )}
        {translated && (
          <div className={arabic ? "mt-4 border-t border-line pt-4" : ""}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              {language === "ms" ? "Bahasa Melayu" : "English"}
            </div>
            <p className="mt-1 leading-relaxed text-ink">{translated}</p>
          </div>
        )}
      </div>
    </details>
  );
}

export default function DictionaryCard({ entry, language }: Props) {
  const isMs = language === "ms";
  const translation = isMs ? entry.malay : entry.english;
  const note = isMs ? entry.noteMalay : entry.noteEnglish;
  const nahu = isMs ? entry.nahuMalay : entry.nahuEnglish;
  const sarf = isMs ? entry.sarfMalay : entry.sarfEnglish;

  return (
    <article className="rounded-2xl border border-line bg-panel p-5 shadow-[0_1px_3px_rgba(0,0,0,0.035)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="arabic text-4xl leading-tight text-ink" dir="rtl">{entry.arabic}</h3>
        <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">{entry.babLabel}</span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={isMs ? "Maksud" : "Meaning"}>{translation || "—"}</Field>
        {entry.pluralOrSingular && <Field label={isMs ? "Jamak / Mufrad" : "Plural / Singular"} arabic>{entry.pluralOrSingular}</Field>}
      </div>

      {note && (
        <div className="mt-5 rounded-xl bg-accent-soft/60 px-4 py-3">
          <Field label={isMs ? "Nota" : "Note"}>{note}</Field>
        </div>
      )}

      {(entry.nahuArabic || nahu || entry.sarfArabic || sarf) && (
        <div className="mt-5 space-y-3">
          <KnowledgeAccordion title={isMs ? "Nahu" : "Grammar"} arabic={entry.nahuArabic} translated={nahu} language={language} />
          <KnowledgeAccordion title={isMs ? "Sarf" : "Morphology"} arabic={entry.sarfArabic} translated={sarf} language={language} />
        </div>
      )}
    </article>
  );
}
