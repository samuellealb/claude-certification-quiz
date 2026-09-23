// Audits curated ITEM_BANK references without modifying index.html.
// Run: node scripts/build-references.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseMarkdown } from './lib/markdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const MODULE_COUNT = 5;

function loadModuleSections() {
  const byDomain = {};
  for (let n = 1; n <= MODULE_COUNT; n += 1) {
    const domain = `d${n}`;
    const markdown = readFileSync(path.join(ROOT, `module-${n}.md`), 'utf8');
    const { sections } = parseMarkdown(markdown);
    const candidates = sections
      .filter((s) => s.level === 2 || s.level === 3)
      .map((s) => ({
        moduleNum: n,
        slug: s.slug,
        title: s.title,
      }));
    byDomain[domain] = { candidates };
  }
  return byDomain;
}

// Splits the ITEM_BANK array source into individual `{ ... }` item substrings,
// tracking brace depth and skipping braces that appear inside string literals.
function splitTopLevelItems(arraySrc) {
  const items = [];
  let depth = 0;
  let start = -1;
  let inString = null;
  for (let i = 0; i < arraySrc.length; i += 1) {
    const ch = arraySrc[i];
    const prev = arraySrc[i - 1];
    if (inString) {
      if (ch === inString && prev !== '\\') inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        items.push({ start, end: i + 1, text: arraySrc.slice(start, i + 1) });
        start = -1;
      }
    }
  }
  return items;
}

function evalItem(itemSrc) {
  // Safe: itemSrc is our own trusted local file content, a plain object literal.
  // eslint-disable-next-line no-new-func
  return new Function(`return (${itemSrc});`)();
}

function main() {
  const modulesByDomain = loadModuleSections();
  const html = readFileSync(INDEX_PATH, 'utf8');

  const startMarker = 'const ITEM_BANK = [';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) throw new Error('Could not find ITEM_BANK start');
  const arrayOpenIdx = startIdx + startMarker.length - 1; // index of the opening '['
  const closeMarker = '\n      ];';
  const closeIdx = html.indexOf(closeMarker, arrayOpenIdx);
  if (closeIdx === -1) throw new Error('Could not find ITEM_BANK end');

  const arraySrc = html.slice(arrayOpenIdx, closeIdx + 1); // includes outer [ ... ]
  const items = splitTopLevelItems(arraySrc);

  const errors = [];

  for (const item of items) {
    const parsed = evalItem(item.text);
    if (!Array.isArray(parsed.references) || !parsed.references.some((ref) => ref.type === 'local')) {
      errors.push(`${parsed.id}: missing local reference`);
      continue;
    }
    for (const ref of parsed.references) {
      if (ref.type !== 'local') continue;
      const match = /^module-([1-5])\.html#([a-z0-9-]+)$/.exec(ref.href);
      const moduleInfo = match && modulesByDomain[`d${match[1]}`];
      const section = moduleInfo?.candidates.find((candidate) => candidate.slug === match[2]);
      if (!section) errors.push(`${parsed.id}: broken section link ${ref.href}`);
      else if (ref.label !== `Module ${match[1]} — ${section.title}`) {
        errors.push(`${parsed.id}: label does not match ${ref.href}`);
      }
    }
  }

  console.log(`Checked ${items.length} items; ${errors.length} structural errors.`);
  errors.forEach((error) => console.error(error));
  if (errors.length) process.exitCode = 1;
}

main();
