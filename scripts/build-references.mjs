// Adds a `references` field to every item in index.html's ITEM_BANK, linking
// each explanation to the module section (and, where verifiable, official
// docs) that supports it. Run: node scripts/build-references.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseMarkdown } from './lib/markdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const MODULE_COUNT = 5;

const STOPWORDS = new Set(('the a an of to in on for and or is are was were be been being '
  + 'this that these those it its as by with from at into over under between when where which who '
  + 'what how why not no do does did can could should would will shall may might must than then so '
  + 'if because while your you their they he she we i but each every any all one two three same different '
  + 'a.').split(/\s+/));

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9_]+/g) || []).filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// Loads each module's sections (## and ###) with tokenized heading + body text for matching.
function loadModuleSections() {
  const byDomain = {};
  for (let n = 1; n <= MODULE_COUNT; n += 1) {
    const domain = `d${n}`;
    const markdown = readFileSync(path.join(ROOT, `module-${n}.md`), 'utf8');
    const { sections } = parseMarkdown(markdown);
    const h1 = sections.find((s) => s.level === 1);
    const candidates = sections
      .filter((s) => s.level === 2 || s.level === 3)
      .map((s) => ({
        moduleNum: n,
        slug: s.slug,
        title: s.title,
        rawText: s.text,
        tokens: new Set([...tokenize(s.title), ...tokenize(s.title), ...tokenize(s.text)]),
        headingTokens: new Set(tokenize(s.title)),
      }));
    byDomain[domain] = { moduleNum: n, moduleTitle: h1 ? h1.title : `Module ${n}`, candidates };
  }
  return byDomain;
}

function scoreSection(itemTokens, section) {
  let score = 0;
  for (const t of itemTokens) {
    if (section.headingTokens.has(t)) score += 3;
    else if (section.tokens.has(t)) score += 1;
  }
  return score;
}

function bestSectionFor(item, moduleInfo) {
  const itemTokens = new Set([...tokenize(item.question || ''), ...tokenize(item.explanation || ''), ...tokenize(item.docsNote || '')]);
  let best = null;
  let bestScore = 0;
  for (const candidate of moduleInfo.candidates) {
    const s = scoreSection(itemTokens, candidate);
    if (s > bestScore) {
      bestScore = s;
      best = candidate;
    }
  }
  return bestScore >= 3 ? best : null;
}

function webReferenceFor(item, section) {
  const haystack = `${item.explanation || ''} ${item.docsNote || ''} ${section ? section.rawText : ''}`.toLowerCase();
  if (haystack.includes('trust.anthropic.com')) {
    return { type: 'web', href: 'https://trust.anthropic.com', label: 'Anthropic Trust Center' };
  }
  if (haystack.includes('platform.claude.com')) {
    return { type: 'web', href: 'https://platform.claude.com/docs', label: 'Anthropic docs (platform.claude.com)' };
  }
  return null;
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

function formatReferences(refs) {
  const lines = refs.map((r) => `{ type: '${r.type}', href: '${r.href}', label: ${JSON.stringify(r.label)} }`);
  return `[ ${lines.join(', ')} ]`;
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

  let rebuilt = arraySrc;
  let offset = 0;
  let refCount = 0;
  let localOnlyCount = 0;
  let webCount = 0;
  let unmatchedCount = 0;

  for (const item of items) {
    const parsed = evalItem(item.text);
    if (Object.prototype.hasOwnProperty.call(parsed, 'references')) {
      throw new Error(
        `Item "${parsed.id}" already has a references field — index.html looks already patched. `
        + 'Restore from a backup before re-running this script to avoid duplicate fields.'
      );
    }
    const moduleInfo = modulesByDomain[parsed.domain];
    if (!moduleInfo) continue;

    const section = bestSectionFor(parsed, moduleInfo);
    const references = [];
    if (section) {
      references.push({
        type: 'local',
        href: `module-${section.moduleNum}.html#${section.slug}`,
        label: `Module ${section.moduleNum} — ${section.title}`,
      });
    } else {
      unmatchedCount += 1;
      references.push({
        type: 'local',
        href: `module-${moduleInfo.moduleNum}.html`,
        label: `Module ${moduleInfo.moduleNum} — ${moduleInfo.moduleTitle}`,
      });
    }
    const web = webReferenceFor(parsed, section);
    if (web) {
      references.push(web);
      webCount += 1;
    } else {
      localOnlyCount += 1;
    }
    refCount += 1;

    // Insert `references: [...]` right before the item's closing brace.
    const insertion = `,\n          references: ${formatReferences(references)} `;
    const insertPos = item.end - 1 + offset; // position of the closing '}' in `rebuilt`
    rebuilt = `${rebuilt.slice(0, insertPos)}${insertion}${rebuilt.slice(insertPos)}`;
    offset += insertion.length;
  }

  const newHtml = html.slice(0, arrayOpenIdx) + rebuilt + html.slice(closeIdx + 1);
  writeFileSync(INDEX_PATH, newHtml, 'utf8');

  console.log(`Patched ${refCount} items: ${refCount - localOnlyCount - webCount + webCount ? '' : ''}`);
  console.log(`  local+web references: ${webCount}`);
  console.log(`  local-only references: ${localOnlyCount}`);
  console.log(`  section match found: ${refCount - unmatchedCount}`);
  console.log(`  fell back to module-level (no section match): ${unmatchedCount}`);
}

main();
