# Kamus Durusul Lughah al-'Arabiyyah

Kamus carian **Durusul Lughah** yang berjalan sepenuhnya secara _local_ di dalam pelayar.
Tiada database, tiada API luar, tiada login, tiada backend.

- Cari kalimah Arab **dengan atau tanpa harakat** (`بَيْتٌ` atau `بيت`)
- Cari guna **Bahasa Melayu** (`rumah`) atau **Bahasa Inggeris** (`house`)
- Cari bentuk **jamak/mufrad** — `بيوت` membawa anda ke `بَيْتٌ`
- Autosuggestion, penapis Bab, dan carian yang tahan sedikit salah ejaan (Fuse.js)

Data: **2,411 entri** daripada Buku 1–3 (Bab dinomborkan semula setiap buku).

---

## 1. Menjalankan secara local

Perlu **Node.js 22.6 atau lebih baru** (skrip validasi guna `--experimental-strip-types`).

```bash
npm install
npm run dev
```

Buka pautan yang dipaparkan (biasanya `http://localhost:4321`).

Arahan lain:

```bash
npm run build          # bina versi production ke folder dist/
npm run preview        # pratonton hasil build
npm run validate-data  # laporan validasi data dalam terminal
```

## 2. Lokasi fail CSV

```
src/data/kamus-durusul-lughah.csv
```

Fail ini ialah **salinan tepat** fail Google Sheets anda (tidak diubah). Ia dibaca pada
_build time_ sahaja dan dibungkus ke dalam laman statik — tiada bacaan fail semasa runtime.

### Struktur sebenar CSV

Fail bukan satu buku sahaja — ia mengandungi **tiga buku**:

| Buku   | Entri | Bab   |
| ------ | ----- | ----- |
| Buku 1 | 530   | 1–23  |
| Buku 2 | 667   | 1–30  |
| Buku 3 | 1,214 | 1–34  |

Baris berikut **dibuang secara automatik** daripada data (tetapi dilaporkan oleh
`validate-data`, bukan dibuang secara senyap):

- 3 baris tajuk `BUKU 1/2/3` (baris 1, 533, 1228)
- 3 baris header berulang (baris 2, 534, 1229)
- 50 baris pemisah `---`

Kerana **nombor Bab berulang setiap buku**, penapis Bab memaparkan `Buku 1 · Bab 1`,
`Buku 2 · Bab 1`, dan seterusnya supaya tidak bercampur.

## 3. Menggantikan CSV selepas kemas kini Google Sheets

1. Di Google Sheets: **File → Download → Comma-separated values (.csv)**.
2. Ganti fail ini dengan fail baharu (kekalkan nama):

   ```
   src/data/kamus-durusul-lughah.csv
   ```

3. Jalankan validasi untuk memastikan struktur masih betul:

   ```bash
   npm run validate-data
   ```

4. Bina semula:

   ```bash
   npm run build
   ```

Pastikan struktur lajur kekal sama: `Bab, Kalimah Asal (Arab), Jamak/Mufrad,
Terjemahan (BM), Terjemahan (BI), Nota / Tatabahasa Arab`. Penghurai turut mengenali
label lajur ke-3 versi Buku 2/3 (`Pasangan (Jamak atau Mufrad)`).

## 4. Validasi data

```bash
npm run validate-data
```

Laporan (dalam terminal sahaja) menunjukkan:

- baris header CSV, penanda `BUKU`, dan baris pemisah `---`
- baris kosong
- baris tanpa Bab atau tanpa Kalimah Arab
- jumlah entri dan pecahan setiap buku
- kalimah yang **kelihatan sama selepas harakat dibuang** (duplikat)

Duplikat **tidak dipadam** — kalimah yang sama memang boleh muncul dalam beberapa bab.

## 5. Bina versi production

```bash
npm run build      # hasil dalam dist/
npm run preview    # semak sebelum hantar
```

Folder `dist/` ialah laman statik biasa — boleh diletak pada mana-mana _static host_
atau dibuka terus.

## 6. Bagaimana normalisasi Arab berfungsi

`normalizeArabic()` (`src/lib/normalizeArabic.ts`) digunakan **untuk carian sahaja**.
Teks Arab asal dengan harakat sentiasa kekal dalam paparan.

Ia membuang harakat & tatweel, dan menyamakan bentuk yang serupa:

- `أ إ آ ٱ` → `ا`
- `ى` → `ي`
- `ة` → `ه`
- `ؤ` → `و`, `ئ` → `ي`, `ء` dibuang
- normalisasi Unicode ke NFC dan mampatkan ruang

Kesannya `بَيْتٌ` dan `بيت`, atau `هَذَا` dan `هذا`, menemui entri yang sama.

`normalizeLatin()` (`src/lib/normalizeLatin.ts`) menukar teks Melayu/Inggeris kepada
huruf kecil, membuang diakritik dan tanda baca, untuk carian dua hala.

### Susunan keutamaan hasil

1. Padanan tepat Arab asal
2. Padanan tepat Arab tanpa harakat
3. Arab bermula dengan carian
4. Padanan tepat Melayu
5. Padanan tepat Inggeris
6. Padanan dalam Jamak/Mufrad
7. Padanan separa
8. Fuzzy (Fuse.js, `threshold` ketat 0.34)

## 7. Menambah ringkasan bab pada masa depan (BELUM dibina)

Versi ini **tidak** termasuk ringkasan pelajaran setiap bab — itu projek akan datang.
Cadangan bila tiba masanya (jangan bina sekarang):

- Simpan ringkasan dalam `src/data/summaries/` (satu fail `.md` setiap bab, mis.
  `buku1-bab1.md`).
- Muatkan pada build time (seperti `src/data/dictionary.ts` memuatkan CSV).
- Papar pautan "Ringkasan Bab" pada penapis Bab yang membuka panel/halaman berasingan.

Struktur data sedia ada sudah membawa `buku` dan `babKey`, jadi ringkasan boleh
dipetakan terus kepada setiap bab tanpa mengubah kod carian.

---

## Struktur projek

```
src/
  components/
    DictionaryApp.tsx   # pulau React: carian, cadangan, penapis, URL, pagination
    DictionaryCard.tsx  # kad hasil
  data/
    kamus-durusul-lughah.csv
    dictionary.ts       # muat + hurai CSV pada build time; jana senarai bab
  lib/
    normalizeArabic.ts  # normalisasi Arab (carian sahaja)
    normalizeLatin.ts   # normalisasi Melayu/Inggeris
    parseDictionary.ts  # penghurai CSV + laporan
    searchDictionary.ts # carian berperingkat + Fuse.js
  pages/
    index.astro
  styles/
    global.css
scripts/
  validate-data.ts
```

## Nota reka bentuk

- Carian berlaku **client-side**; indeks Fuse dibina **sekali** sahaja, dengan
  _debounce_ 200ms, hasil awal dihadkan 30 dengan butang **Lihat lagi**.
- Carian disimpan dalam URL (`/?q=بيت`, `/?q=rumah&bab=Buku%201|1`) — boleh
  _refresh_, _bookmark_, dan dikongsi.
- Font Arab menggunakan _font_ sistem (Amiri / Noto Naskh Arabic / Traditional Arabic)
  supaya laman berfungsi sepenuhnya tanpa internet. Untuk rupa seragam merentas
  peranti, letak fail font pilihan anda dalam `public/` dan rujuk dalam
  `src/styles/global.css`.

## Bilingual V2 interface

The interface defaults to Bahasa Melayu. The language button in the header switches the full interface to English. Arabic source text remains visible in both modes. Nahu and Sarf are presented as compact accordions; each accordion combines the Arabic analysis with the selected Malay or English explanation.

The current CSV header order is:

`Bab, Nota Perubahan, Kalimah Asal (Arab), Jamak/Mufrad, Terjemahan (BM), Terjemahan (BI), Nota BM, Nota English, Nota Nahu (Arab), Nota Nahu (BM), Nota Nahu (English), Nota Sarf (Arab), Nota Sarf (BM), Nota Sarf (English)`
