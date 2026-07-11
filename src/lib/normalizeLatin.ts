/**
 * normalizeLatin — normalisasi teks Melayu / Inggeris untuk carian SAHAJA.
 *
 *  - Tukar kepada huruf kecil.
 *  - Buang loghat/diakritik Latin (café -> cafe) melalui NFD.
 *  - Tukar tanda baca biasa kepada ruang (koma, noktah, kurungan, /, -, dsb).
 *  - Mampatkan ruang berlebihan.
 *
 * Membenarkan carian frasa separa kerana output dipecahkan kepada token
 * di lapisan carian.
 */
export function normalizeLatin(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); // buang diakritik
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9\s]/g, " "); // tanda baca -> ruang
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Pecahkan teks ternormal kepada token unik untuk pemadanan. */
export function latinTokens(input: string): string[] {
  const n = normalizeLatin(input);
  if (!n) return [];
  return Array.from(new Set(n.split(" ")));
}
