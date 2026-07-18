function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(value: string): string {
  const arabicChars = "\\u0600-\\u06ff\\u0750-\\u077f\\u08a0-\\u08ff\\u064b-\\u065f\\u0670\\u06d6-\\u06ed";
  const arabicRun = new RegExp(`([${arabicChars}][${arabicChars}،؛؟ـ]*(?:\\s+[${arabicChars}][${arabicChars}،؛؟ـ]*)*)`, "g");
  let html = escapeHtml(value);
  html = html.replace(/&lt;span class=&quot;(lesson-term|lesson-focus|wrong)&quot;&gt;([\s\S]*?)&lt;\/span&gt;/g, '<span class="$1">$2</span>');
  html = html.replace(/&lt;(\/?)(div|header|section|p|ul|li|span)([\s\S]*?)&gt;/g, (_match, slash, tag, attrs) => {
    return `<${slash}${tag}${attrs.replace(/&quot;/g, '"')}>`;
  });
  html = html.replace(/&lt;div class=&quot;arabic-example&quot; dir=&quot;rtl&quot; lang=&quot;ar&quot;&gt;/g, '<div class="arabic-example" dir="rtl" lang="ar">');
  html = html.replace(/&lt;\/div&gt;/g, "</div>");
  html = html.replace(/&lt;span class=&quot;wrong&quot;&gt;([\s\S]*?)&lt;\/span&gt;/g, '<span class="wrong">$1</span>');
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="lesson-term">$1</span>');
  html = html.replace(/\(\(([^)]+)\)\)/g, '<span class="lesson-focus">$1</span>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith("<")) return part;
      return part.replace(arabicRun, '<span class="arabic-inline" dir="rtl" lang="ar">$1</span>');
    })
    .join("");
}

export function cleanTopicTitle(value: string): string {
  return topicTitleParts(value).title;
}

const topicTitleOverrides: Record<string, string> = {
  "لَيْسَ BERSAMA ḌAMĪR": "لَيْسَ مَعَ الضَّمِيرِ",
};

function withNumberedOverride(title: string, overrides: Record<string, string>): string {
  const number = title.match(/^(\d+\.\s*)/);
  const bareTitle = title.replace(/^\d+\.\s*/, "");
  const override = overrides[bareTitle];
  return override ? `${number?.[1] ?? ""}${override}` : title;
}

export function topicTitleParts(value: string): { title: string; translation: string; transliteration: string } {
  const plain = value
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\(\(([^)]+)\)\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
  const parts = plain.split(/\s+—\s+/);
  const titleSource = parts[0]?.trim() ?? plain;
  const transliteration = titleSource.match(/\(([^()]*[A-Za-z][^()]*)\)/)?.[1]?.trim() ?? "";

  const title = titleSource.replace(/\s*\([^()]*[A-Za-z][^()]*\)/g, "").trim();

  return {
    title: withNumberedOverride(title, topicTitleOverrides),
    translation: parts.slice(1).join(" — ").trim(),
    transliteration,
  };
}

const topicTranslationOverrides: Record<string, string> = {
  "التَّاءُ الْمَرْبُوطَةُ مَعَ الضَّمِيرِ": "Ta Marbutah bersama Dhamir",
  "أَبٌ وَأَخٌ عِنْدَ الْإِضَافَةِ": "Asma’ Khamsah: أَبٌ dan أَخٌ ketika Iḍāfah",
  "أَبٌ وَأَخٌ مِنَ الْأَسْمَاءِ الْخَمْسَةِ": "Asma’ Khamsah: أَبٌ dan أَخٌ",
  "عِنْدَ وَلِـ": "Cara Menyatakan “Mempunyai” dengan عِنْدَ dan لِـ",
  "مَعَ": "Huruf Jarr, Bersama",
  "مَا النَّافِيَةُ": "مَا untuk Penafian",
  "الضَّمَائِرُ الْمُتَّصِلَةُ بِالِاسْمِ": "Dhamir Bersambung pada Isim",
  "لَيْسَ مَعَ الضَّمِيرِ": "لَيْسَ bersama Dhamir",
  "اسْمُ الْفَاعِلِ مِنَ الْمَهْمُوزِ وَالْمُضَعَّفِ": "Isim Fā‘il daripada Bentuk Fi‘il Mahmūz dan Muḍa‘‘af",
  "الْفَرْقُ بَيْنَ اسْمِ الْفَاعِلِ وَاسْمِ الْمَفْعُولِ": "Perbezaan Antara Pelaku (Isim Fā‘il) dan Penerima Perbuatan (Isim Maf‘ūl)",
};

export function topicTitleHint(value: string): string {
  const parts = topicTitleParts(value);
  return topicTranslationOverrides[parts.title.replace(/^\d+\.\s*/, "")] ?? parts.translation;
}

function renderCode(value: string): string {
  return escapeHtml(value)
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="lesson-term">$1</span>')
    .replace(/\(\(([^)]+)\)\)/g, '<span class="lesson-focus">$1</span>')
    .replace(/(?:├──|└──)\s*([^:\n]+)(:)/g, '<span class="diagram-marker">•</span> <span class="lesson-term">$1</span>$2');
}

function stripTrailingPunctuation(value: string): string {
  return value.trim().replace(/[.،؛،。]+$/g, "").trim();
}

function renderListItem(item: string): string {
  const answerMatch = item.match(/^(.+?)\s+✅\s+(.+?)\s+❌\s+(.+)$/);
  if (answerMatch) {
    return [
      '<li class="answer-check">',
      `<span class="answer-prompt">${renderInline(stripTrailingPunctuation(answerMatch[1]))}</span>`,
      '<span class="answer-options">',
      `<span class="answer-option answer-option-correct">${renderInline(stripTrailingPunctuation(answerMatch[2]))} ✅</span>`,
      `<span class="answer-option answer-option-wrong">${renderInline(stripTrailingPunctuation(answerMatch[3]))} ❌</span>`,
      '</span>',
      '</li>',
    ].join("");
  }

  const className = item.startsWith("✅") || item.startsWith("✓")
    ? ' class="example-correct"'
    : item.startsWith("❌") || item.startsWith("✕")
      ? ' class="example-wrong"'
      : "";
  return `<li${className}>${renderInline(item)}</li>`;
}

export function headingToId(value: string): string {
  const plain = value
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  const latin = plain
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return latin || "section";
}

function isTableSeparator(line: string): boolean {
  const cells = parseTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isAllowedHtmlLine(line: string): boolean {
  return /^<\/?(div|header|section|p|ul|li|span)(\s|>|$)/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(lines: string[], start: number): { html: string; next: number } {
  const headers = parseTableRow(lines[start]);
  let i = start + 2;
  const rows: string[][] = [];
  while (i < lines.length && /^\s*\|/.test(lines[i])) {
    rows.push(parseTableRow(lines[i]));
    i++;
  }

  const thead = `<thead><tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead>`;
  const tbody = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("");
  return { html: `<div class="lesson-table-wrap"><table>${thead}<tbody>${tbody}</tbody></table></div>`, next: i };
}

type MarkdownToHtmlOptions = {
  showTopicHints?: boolean;
};

export function markdownToHtml(markdown: string, options: MarkdownToHtmlOptions = {}): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];
  let i = 0;
  let pendingQuoteTone: "correct" | "wrong" | undefined;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (isAllowedHtmlLine(trimmed)) {
      chunks.push(trimmed);
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      chunks.push(`<pre class="lesson-diagram"><code>${renderCode(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      chunks.push("<hr />");
      i++;
      continue;
    }

    if (/^\s*\|/.test(line) && lines[i + 1] && isTableSeparator(lines[i + 1])) {
      const table = renderTable(lines, i);
      chunks.push(table.html);
      i = table.next;
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const displayHeading = level === 2 ? cleanTopicTitle(heading[2]) : heading[2];
      const hint = level === 2 && options.showTopicHints ? topicTitleHint(heading[2]) : "";
      const headingInner = hint
        ? `<span class="lesson-heading-title">${renderInline(displayHeading)}</span><span class="lesson-heading-hint">${renderInline(hint)}</span>`
        : renderInline(displayHeading);
      chunks.push(`<h${level} id="${headingToId(heading[2])}">${headingInner}</h${level}>`);
      pendingQuoteTone = undefined;
      i++;
      continue;
    }

    if (/^- /.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i].trim())) {
        const item = lines[i].trim().slice(2);
        items.push(renderListItem(item));
        i++;
      }
      chunks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInline(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      chunks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (trimmed.startsWith("✅") || trimmed.startsWith("✓")) {
      chunks.push(`<p class="example-correct">${renderInline(trimmed)}</p>`);
      pendingQuoteTone = undefined;
      i++;
      continue;
    }

    if (trimmed.startsWith("❌") || trimmed.startsWith("✕")) {
      chunks.push(`<p class="example-wrong">${renderInline(trimmed)}</p>`);
      pendingQuoteTone = undefined;
      i++;
      continue;
    }

    if (/^> /.test(trimmed)) {
      const quote: string[] = [];
      while (i < lines.length && /^> /.test(lines[i].trim())) {
        quote.push(renderInline(lines[i].trim().slice(2)));
        i++;
      }
      const className = pendingQuoteTone ? ` class="quote-${pendingQuoteTone}"` : "";
      chunks.push(`<blockquote${className}>${quote.join("<br />")}</blockquote>`);
      pendingQuoteTone = undefined;
      continue;
    }

    const paragraph: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^- /.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^> /.test(lines[i].trim()) &&
      !/^\s*\|/.test(lines[i]) &&
      !isAllowedHtmlLine(lines[i].trim())
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }
    const paragraphText = paragraph.join(" ");
    const plainParagraph = paragraphText.replace(/\*/g, "").trim().toLowerCase();
    if (/^(salah|wrong)\s*:?\s*$/.test(plainParagraph)) {
      pendingQuoteTone = "wrong";
    } else if (/^(betul|correct)\s*:?\s*$/.test(plainParagraph)) {
      pendingQuoteTone = "correct";
    } else {
      pendingQuoteTone = undefined;
    }
    chunks.push(`<p>${renderInline(paragraphText)}</p>`);
  }

  return chunks.join("\n");
}
