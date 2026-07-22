import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const wordSchema = z.object({
  word: z.string(),
  meaning: z.string(),
  root: z.string().optional(),
  type: z.enum(["keyword", "letters", "rule", "example"]).optional(),
});

const lineSchema = z.object({
  text: z.string(),
  translation: z.string(),
  words: z.array(wordSchema).optional(),
});

const verseSchema = z.object({
  number: z.number(),
  type: z.string().optional(),
  lines: z.array(lineSchema),
});

const proseWordSchema = z.object({
  arabic: z.string(),
  transliteration: z.string().optional(),
  meaning: z.string(),
  root: z.string().optional(),
  type: z.enum(["keyword", "letters", "rule", "example"]).optional(),
});

const proseSectionSchema = z.object({
  id: z.string(),
  matn: z.object({
    id: z.string(),
    arabic: z.string(),
    translation: z.string(),
    words: z.array(proseWordSchema).optional(),
  }),
  sharh: z.object({
    title: z.string().optional(),
    arabic: z.string(),
    malay: z.string(),
  }),
});

const mutoonCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/mutoon" }),
  schema: z.object({
    titleArabic: z.string().optional(),
    titleMalay: z.string().optional(),
    title: z.string().optional(),
    titleMs: z.string().optional(),
    slug: z.string(),
    book: z.string().optional(),
    bookTitle: z.string().optional(),
    order: z.number(),
    chapter: z.number().optional(),
    layout: z.enum(["verse", "prose"]).optional(),
    previous: z.string().nullable().optional(),
    next: z.string().nullable().optional(),
    translationDefault: z.boolean().optional(),
    wordTranslationDefault: z.boolean().optional(),
    sharhDefaultLanguage: z.enum(["ar", "ms"]).optional(),
    sourceEdition: z.object({
      matn: z.string(),
      sharh: z.string().optional(),
    }).optional(),
    audio: z.object({
      src: z.string(),
      chapterStart: z.number(),
      matnStart: z.number(),
      chapterEnd: z.number(),
    }).optional(),
    verses: z.array(verseSchema).optional(),
    proseSections: z.array(proseSectionSchema).optional(),
  }),
});

export const collections = {
  mutoon: mutoonCollection,
};
