import { normalizeArabic } from "./normalizeArabic.ts";
import { normalizeLatin } from "./normalizeLatin.ts";

const LETTERS: Record<string, string[]> = {
  ا: ["a"], أ: ["a"], إ: ["i", "a"], آ: ["a"],
  ب: ["b"], ت: ["t"], ث: ["th", "s"], ج: ["j"], ح: ["h"], خ: ["kh"],
  د: ["d"], ذ: ["dh", "z"], ر: ["r"], ز: ["z"], س: ["s"], ش: ["sy", "sh"],
  ص: ["s"], ض: ["d", "dh"], ط: ["t"], ظ: ["z", "zh"], ع: ["", "a"], غ: ["gh"],
  ف: ["f"], ق: ["q", "k"], ك: ["k"], ل: ["l"], م: ["m"], ن: ["n"],
  ه: ["h"], ة: ["h", "t"], و: ["w", "u", "o"], ي: ["y", "i", "e"], ى: ["a"], ء: [""], ئ: ["i", "y"], ؤ: ["u", "w"],
  لا: ["la"],
};

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function compact(value: string): string {
  return normalizeLatin(value).replace(/[^a-z0-9]+/g, "");
}

function loose(value: string): string {
  return compact(value)
    .replace(/sy/g, "sh")
    .replace(/aa+/g, "a")
    .replace(/ii+/g, "i")
    .replace(/uu+/g, "u")
    .replace(/[aeiou]/g, "");
}

function appendVariant(forms: string[], variants: string[], limit: number): string[] {
  const next = new Set<string>();
  for (const form of forms) {
    for (const variant of variants) {
      next.add(form + variant);
      if (next.size >= limit) return Array.from(next);
    }
  }
  return Array.from(next);
}

export function normalizeTransliterationInput(value: string): string {
  return loose(value);
}

export function arabicToTransliterationKeys(value: string): string {
  const normalized = normalizeArabic(value);
  let forms = [""];
  for (const char of normalized) {
    forms = appendVariant(forms, LETTERS[char] ?? [char], 64);
  }

  const keys = new Set<string>();
  for (const form of forms) {
    const clean = compact(form);
    if (!clean) continue;
    keys.add(clean);
    keys.add(loose(clean));
    keys.add(clean.replace(/sh/g, "sy"));
    if (clean.endsWith("a")) keys.add(clean + "a");
    if (clean.endsWith("i")) keys.add(clean + "y");
    const noVowels = clean.split("").filter((char) => !VOWELS.has(char)).join("");
    if (noVowels.length >= 2) keys.add(noVowels);
  }
  return Array.from(keys).join(" ");
}
