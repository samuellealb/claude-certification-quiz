// Minimal Markdown -> HTML converter tailored to this repo's module files.
// Not a general CommonMark implementation: handles headings, fenced code,
// ordered/unordered lists, GFM pipe tables, bold, inline code, escaped chars,
// and paragraphs.

const ESCAPE_PLACEHOLDER = { '\\*': '\u0001', '\\_': '\u0002', '\\`': '\u0003', '\\\\': '\u0004' };
const ESCAPE_RESTORE = { '\u0001': '*', '\u0002': '_', '\u0003': '`', '\u0004': '\\' };

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slugify(text, seen) {
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  if (!slug) slug = 'section';
  if (seen) {
    let unique = slug;
    let n = 2;
    while (seen.has(unique)) {
      unique = `${slug}-${n}`;
      n += 1;
    }
    seen.add(unique);
    slug = unique;
  }
  return slug;
}

// Applies inline formatting (bold, inline code, escapes) to already HTML-escaped text.
function renderInline(rawText) {
  let text = rawText;
  for (const [needle, token] of Object.entries(ESCAPE_PLACEHOLDER)) {
    text = text.split(needle).join(token);
  }
  text = escapeHtml(text);
  // Inline code spans (after escaping so `<` inside code renders literally).
  text = text.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  // Bold.
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  for (const [token, literal] of Object.entries(ESCAPE_RESTORE)) {
    text = text.split(token).join(literal);
  }
  return text;
}

function isFenceLine(line) {
  return /^```/.test(line.trim());
}

function isOrderedItem(line) {
  return /^\d+\.\s+/.test(line);
}

function isUnorderedItem(line) {
  return /^[-*]\s+/.test(line);
}

function isTableRow(line) {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|') && t.length > 1;
}

// Splits a `| a | b |` row into trimmed cells, honoring `\|` as a literal pipe.
function splitTableRow(line) {
  let t = line.trim().slice(1, -1);
  const cells = [];
  let current = '';
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] === '\\' && t[i + 1] === '|') {
      current += '|';
      i += 1;
    } else if (t[i] === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += t[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

function isTableSeparatorRow(line) {
  if (!isTableRow(line)) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

// Parses markdown into { html, sections } where sections is a flat list of
// { level, title, slug, text } used for anchor generation and reference matching.
export function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const seenSlugs = new Set();
  const sections = [];
  const htmlParts = [];
  let currentSection = null;

  const paragraphBuffer = [];
  function flushParagraph() {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join('\n').trim();
    paragraphBuffer.length = 0;
    if (!text) return;
    const rendered = text.split('\n').map(renderInline).join('<br>');
    htmlParts.push(`<p>${rendered}</p>`);
    if (currentSection) currentSection.text += ` ${text}`;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (isFenceLine(line)) {
      flushParagraph();
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i += 1;
      while (i < lines.length && !isFenceLine(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      const codeText = escapeHtml(codeLines.join('\n'));
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      htmlParts.push(`<pre><code${langClass}>${codeText}</code></pre>`);
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const slug = slugify(title, seenSlugs);
      currentSection = { level, title, slug, text: title };
      sections.push(currentSection);
      const tag = `h${level}`;
      htmlParts.push(`<${tag} id="${slug}">${renderInline(title)}</${tag}>`);
      i += 1;
      continue;
    }

    if (line.trim() === '---') {
      flushParagraph();
      htmlParts.push('<hr>');
      i += 1;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSeparatorRow(lines[i + 1])) {
      flushParagraph();
      const headerCells = splitTableRow(line);
      i += 2; // skip header row + separator row
      const bodyRows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        bodyRows.push(splitTableRow(lines[i]));
        i += 1;
      }
      const headerRowHtml = headerCells.map((c) => `<th>${renderInline(c)}</th>`).join('');
      const bodyRowsHtml = bodyRows
        .map((row) => row.map((c) => `<td>${renderInline(c)}</td>`).join(''))
        .map((cellsHtml) => `<tr>${cellsHtml}</tr>`)
        .join('');
      const theadHtml = `<thead><tr>${headerRowHtml}</tr></thead>`;
      const tbodyHtml = `<tbody>${bodyRowsHtml}</tbody>`;
      htmlParts.push(`<div class="table-wrap"><table>${theadHtml}${tbodyHtml}</table></div>`);
      if (currentSection) {
        const flatText = [headerCells, ...bodyRows].map((row) => row.join(' ')).join(' ');
        currentSection.text += ` ${flatText}`;
      }
      continue;
    }

    if (isUnorderedItem(line) || isOrderedItem(line)) {
      flushParagraph();
      const ordered = isOrderedItem(line);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (i < lines.length && (isUnorderedItem(lines[i]) || isOrderedItem(lines[i]) || (lines[i].trim() !== '' && /^\s/.test(lines[i]) && items.length))) {
        const itemLine = lines[i];
        if (isUnorderedItem(itemLine) || isOrderedItem(itemLine)) {
          const content = itemLine.replace(/^\s*(?:[-*]|\d+\.)\s+/, '');
          items.push([content]);
        } else {
          items[items.length - 1].push(itemLine.trim());
        }
        i += 1;
      }
      const itemsHtml = items.map((parts) => `<li>${renderInline(parts.join(' ').trim())}</li>`).join('');
      htmlParts.push(`<${tag}>${itemsHtml}</${tag}>`);
      if (currentSection) currentSection.text += ` ${items.map((p) => p.join(' ')).join(' ')}`;
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      i += 1;
      continue;
    }

    paragraphBuffer.push(line);
    i += 1;
  }
  flushParagraph();

  return { html: htmlParts.join('\n'), sections };
}

export { slugify };
