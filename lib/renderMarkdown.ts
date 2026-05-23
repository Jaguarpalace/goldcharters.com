/**
 * Minimal, dependency-free markdown → HTML renderer for blog posts.
 *
 * Supports:
 *   - Headings:    ## H2, ### H3
 *   - Paragraphs:  text blocks separated by blank lines
 *   - Bold:        **text**
 *   - Italic:      *text*
 *   - Links:       [text](url)
 *   - Unordered:   lines starting with "- "
 *   - Ordered:     lines starting with "1." (any number)
 *
 * The blog admin is the only writer (RLS-protected) so XSS-from-content is
 * not a concern in this app's threat model, but we still HTML-escape every
 * piece of text before applying the inline replacements. Anything we don't
 * understand renders as plain text.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(s: string): string {
  let out = escapeHtml(s);
  // [text](url) — must come before bold/italic so brackets aren't eaten
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text: string, url: string) => {
    const safeUrl = /^(https?:|mailto:|\/)/.test(url) ? url : '#';
    return `<a href="${safeUrl}" class="prose-link">${text}</a>`;
  });
  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // *italic*
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out;
}

export function renderMarkdown(input: string): string {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // skip blank lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // heading
    const h3 = line.match(/^###\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    if (h3) {
      blocks.push(`<h3>${inline(h3[1])}</h3>`);
      i++;
      continue;
    }
    if (h2) {
      blocks.push(`<h2>${inline(h2[1])}</h2>`);
      i++;
      continue;
    }

    // unordered list
    if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) {
        items.push(`<li>${inline(lines[i].slice(2))}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\.\s/, ''))}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // paragraph — consume consecutive non-blank lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^###?\s/.test(lines[i]) &&
      !/^- /.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(`<p>${inline(paraLines.join(' '))}</p>`);
  }

  return blocks.join('\n');
}
