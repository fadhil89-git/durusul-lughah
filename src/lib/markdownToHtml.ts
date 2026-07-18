function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(value: string): string {
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
      return part.replace(/([\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u064b-\u065f\u0670\u06d6-\u06ed][\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u064b-\u065f\u0670\u06d6-\u06ed\s،؛؟ـ]*)/g, '<span class="arabic-inline" dir="rtl" lang="ar">$1</span>');
    })
    .join("");
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

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];
  let i = 0;

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
      chunks.push(`<pre class="lesson-diagram"><code>${escapeHtml(code.join("\n"))}</code></pre>`);
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
      chunks.push(`<h${level} id="${headingToId(heading[2])}">${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^- /.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i].trim())) {
        const item = lines[i].trim().slice(2);
        const className = item.startsWith("✅") || item.startsWith("✓")
          ? ' class="example-correct"'
          : item.startsWith("❌") || item.startsWith("✕")
            ? ' class="example-wrong"'
            : "";
        items.push(`<li${className}>${renderInline(item)}</li>`);
        i++;
      }
      chunks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (trimmed.startsWith("✅") || trimmed.startsWith("✓")) {
      chunks.push(`<p class="example-correct">${renderInline(trimmed)}</p>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("❌") || trimmed.startsWith("✕")) {
      chunks.push(`<p class="example-wrong">${renderInline(trimmed)}</p>`);
      i++;
      continue;
    }

    if (/^> /.test(trimmed)) {
      const quote: string[] = [];
      while (i < lines.length && /^> /.test(lines[i].trim())) {
        quote.push(renderInline(lines[i].trim().slice(2)));
        i++;
      }
      chunks.push(`<blockquote>${quote.join("<br />")}</blockquote>`);
      continue;
    }

    const paragraph: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^- /.test(lines[i].trim()) &&
      !/^> /.test(lines[i].trim()) &&
      !/^\s*\|/.test(lines[i]) &&
      !isAllowedHtmlLine(lines[i].trim())
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }
    chunks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return chunks.join("\n");
}
