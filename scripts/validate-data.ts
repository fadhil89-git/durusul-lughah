/**
 * npm run validate-data
 *
 * Memeriksa fail CSV dan melaporkan (dalam terminal SAHAJA):
 *  - baris header CSV & penanda BUKU / pemisah
 *  - baris kosong
 *  - baris tanpa Bab atau tanpa Kalimah Arab
 *  - jumlah entri
 *  - kalimah yang kelihatan sama selepas harakat dibuang (duplikat)
 *
 * TIDAK memadam apa-apa data. Duplikat dilaporkan sahaja kerana kalimah yang
 * sama mungkin wujud dalam beberapa bab.
 *
 * Perlu Node >= 22.6 (menggunakan --experimental-strip-types).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseDictionary } from "../src/lib/parseDictionary.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV = resolve(__dirname, "../src/data/kamus-durusul-lughah.csv");

const bar = "─".repeat(52);
function h(title: string) {
  console.log(`\n${bar}\n${title}\n${bar}`);
}

const csvText = readFileSync(CSV, "utf8");
const { entries, report } = parseDictionary(csvText);

h("KAMUS DURUSUL LUGHAH — LAPORAN VALIDASI DATA");
console.log("Fail          :", CSV);
console.log("Jumlah baris  :", report.totalRawRows);
console.log("Jumlah entri  :", report.entryCount);

h("STRUKTUR (baris bukan-data — dibuang tetapi dilaporkan)");
console.log("Penanda BUKU  : baris", report.bukuTitleRows.join(", ") || "-");
console.log("Baris header  : baris", report.headerRows.join(", ") || "-");
console.log("Baris '---'   :", report.separatorRows.length, "baris ->", report.separatorRows.join(", "));
console.log("Baris kosong  :", report.emptyRows.length ? report.emptyRows.join(", ") : "tiada");

h("ENTRI MENGIKUT BUKU");
for (const b of report.perBuku) {
  console.log(`  ${b.buku.padEnd(8)} ${String(b.entries).padStart(5)} entri · Bab ${b.babRange} · ${b.chapters} bab`);
}

h("AMARAN — MEDAN HILANG");
if (report.rowsMissingBab.length === 0) console.log("  Tiada baris tanpa Bab. ✓");
else console.log("  Baris tanpa Bab   :", report.rowsMissingBab.join(", "));
if (report.rowsMissingArabic.length === 0) console.log("  Tiada baris tanpa Kalimah Arab. ✓");
else console.log("  Baris tanpa Arab  :", report.rowsMissingArabic.join(", "));

// Duplikat selepas harakat dibuang.
h("DUPLIKAT (selepas harakat dibuang) — MAKLUMAT SAHAJA, TIDAK DIPADAM");
const byNorm = new Map<string, typeof entries>();
for (const e of entries) {
  if (!e.arabicNormalized) continue;
  const arr = byNorm.get(e.arabicNormalized) ?? [];
  arr.push(e);
  byNorm.set(e.arabicNormalized, arr);
}
const dups = [...byNorm.entries()].filter(([, arr]) => arr.length > 1);
dups.sort((a, b) => b[1].length - a[1].length);
console.log(`  Bentuk berulang : ${dups.length} (melibatkan ${dups.reduce((n, [, a]) => n + a.length, 0)} entri)`);
console.log("  Contoh (10 teratas):");
for (const [norm, arr] of dups.slice(0, 10)) {
  const where = arr.map((e) => e.babLabel.replace("Buku ", "B").replace(" · Bab ", "/")).join(", ");
  console.log(`    ${norm.padEnd(16)} ×${arr.length}  ->  ${where}`);
}

// Semakan integriti asas.
h("SEMAKAN INTEGRITI");
const idSet = new Set(entries.map((e) => e.id));
console.log("  ID unik       :", idSet.size === entries.length ? "ya ✓" : `TIDAK (${idSet.size}/${entries.length})`);
const badBab = entries.filter((e) => !/^\d+$/.test(e.bab));
console.log("  Semua Bab nombor:", badBab.length === 0 ? "ya ✓" : `TIDAK (${badBab.length} baris)`);

console.log("\nSelesai. Tiada data diubah.\n");
