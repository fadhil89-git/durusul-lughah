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

const mutoonCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/mutoon" }),
  schema: z.object({
    titleArabic: z.string(),
    titleMalay: z.string(),
    slug: z.string(),
    order: z.number(),
    verses: z.array(verseSchema),
  }),
});

export const collections = {
  mutoon: mutoonCollection,
};
