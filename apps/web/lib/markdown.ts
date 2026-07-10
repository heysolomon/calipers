/** Minimal markdown → HTML renderer for static doc pages. */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linkHtml(label: string, href: string): string {
  const external = href.startsWith('http');
  const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${href}"${attrs}>${label}</a>`;
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => linkHtml(label, href))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith('|');
}

function parseTable(lines: string[]): string {
  const rows = lines
    .filter((line) => !/^\|[-| :]+\|$/.test(line.trim()))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim()),
    );

  if (!rows.length) return '';

  const [head, ...body] = rows;
  if (!head) return '';

  const thead = `<thead><tr>${head.map((cell) => `<th scope="col">${inlineMarkdown(cell)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;

  return `<table>${thead}${tbody}</table>`;
}

function parseList(lines: string[], ordered: boolean): string {
  const tag = ordered ? 'ol' : 'ul';
  const items = lines.map((line) => {
    const content = ordered ? line.replace(/^\d+\.\s+/, '') : line.replace(/^[-*]\s+/, '');
    return `<li>${inlineMarkdown(content)}</li>`;
  });
  return `<${tag}>${items.join('')}</${tag}>`;
}

export function renderMarkdown(md: string): string {
  const lines = md.trim().split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) {
      i += 1;
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && lines[i] !== undefined && !lines[i]!.startsWith('```')) {
        codeLines.push(lines[i]!);
        i += 1;
      }
      i += 1;
      blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    if (/^#{1,3} /.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = line.replace(/^#+\s+/, '');
      blocks.push(`<h${level}>${inlineMarkdown(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i] !== undefined && isTableRow(lines[i]!)) {
        tableLines.push(lines[i]!);
        i += 1;
      }
      blocks.push(parseTable(tableLines));
      continue;
    }

    if (/^[-*] /.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length && lines[i] !== undefined && /^[-*] /.test(lines[i]!)) {
        listLines.push(lines[i]!);
        i += 1;
      }
      blocks.push(parseList(listLines, false));
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length && lines[i] !== undefined && /^\d+\. /.test(lines[i]!)) {
        listLines.push(lines[i]!);
        i += 1;
      }
      blocks.push(parseList(listLines, true));
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const current = lines[i];
      if (
        current === undefined ||
        !current.trim() ||
        current.startsWith('```') ||
        /^#{1,3} /.test(current) ||
        /^[-*] /.test(current) ||
        /^\d+\. /.test(current) ||
        isTableRow(current)
      ) {
        break;
      }
      paragraphLines.push(current);
      i += 1;
    }

    blocks.push(`<p>${inlineMarkdown(paragraphLines.join(' '))}</p>`);
  }

  return blocks.join('\n');
}
