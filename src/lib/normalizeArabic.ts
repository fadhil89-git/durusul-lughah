/**
 * normalizeArabic — untuk carian SAHAJA.
 *
 * Fungsi ini TIDAK PERNAH menyentuh teks yang dipaparkan kepada pengguna.
 * Ia hanya menghasilkan bentuk carian yang konsisten supaya carian dengan
 * atau tanpa harakat menemui entri yang sama.
 *
 * Langkah:
 *  - Normalisasi Unicode ke NFC (bentuk konsisten).
 *  - Buang semua harakat / tanda baris (fathah, kasrah, dammah, sukun,
 *    shaddah, tanwin, dagger alif, dsb).
 *  - Buang tatweel (ـ).
 *  - Samakan bentuk alif: أ إ آ ٱ ٲ ٳ ٵ  ->  ا
 *  - Samakan alif maqsurah ى -> ي
 *  - Kendalikan hamzah di atas waw/ya: ؤ -> و , ئ -> ي (munasabah untuk carian).
 *  - Buang hamzah bersendirian ء supaya "شيء" dan "شي" berdekatan.
 *  - Samakan ة -> ه (ta marbutah selalu ditaip sebagai ha).
 *  - Buang tanda bukan-Arab (noktah, koma, kurungan) supaya nota tidak mengganggu.
 *  - Mampatkan ruang berlebihan.
 */

// Julat tanda baris Arab + dagger alif + tanda kecil lain yang lazim.
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;
const TATWEEL = /\u0640/g;

const ALIF_VARIANTS = /[\u0622\u0623\u0625\u0671\u0672\u0673\u0675]/g; // آ أ إ ٱ ٲ ٳ ٵ
const ALIF_MAQSURA = /\u0649/g; // ى
const TA_MARBUTA = /\u0629/g; // ة
const WAW_HAMZA = /\u0624/g; // ؤ
const YA_HAMZA = /\u0626/g; // ئ
const HAMZA_STANDALONE = /[\u0621\u0674]/g; // ء ٴ

// Aksara yang dikekalkan untuk carian: huruf Arab + ruang tunggal.
// Selain itu (noktah, koma, kurungan, angka Latin dalam nota) dibuang.
const NON_SEARCH = /[^\u0621-\u064A\u066E-\u06D3\s]/g;

export function normalizeArabic(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFC");

  s = s.replace(ARABIC_DIACRITICS, "");
  s = s.replace(TATWEEL, "");

  s = s.replace(ALIF_VARIANTS, "\u0627"); // -> ا
  s = s.replace(WAW_HAMZA, "\u0648"); // ؤ -> و
  s = s.replace(YA_HAMZA, "\u064A"); // ئ -> ي
  s = s.replace(ALIF_MAQSURA, "\u064A"); // ى -> ي
  s = s.replace(TA_MARBUTA, "\u0647"); // ة -> ه
  s = s.replace(HAMZA_STANDALONE, ""); // ء -> (buang)

  s = s.replace(NON_SEARCH, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** True jika rentetan mengandungi sekurang-kurangnya satu huruf Arab. */
export function hasArabic(input: string): boolean {
  return /[\u0621-\u064A]/.test(input);
}
