// Generates accessible, static module-N.html pages from module-N.md.
// Run: node scripts/build-modules.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseMarkdown } from './lib/markdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULE_COUNT = 5;

function buildToc(sections) {
  // Only ## and ### show up in the table of contents; #### is fine-grained detail.
  const items = sections.filter((s) => s.level === 2 || s.level === 3);
  const lines = [];
  let topLiOpen = false;
  let subListOpen = false;
  for (const item of items) {
    if (item.level === 2) {
      if (subListOpen) {
        lines.push('</ul>');
        subListOpen = false;
      }
      if (topLiOpen) lines.push('</li>');
      lines.push(`<li><a href="#${item.slug}">${item.title}</a>`);
      topLiOpen = true;
    } else {
      if (!subListOpen) {
        lines.push('<ul class="toc-sub">');
        subListOpen = true;
      }
      lines.push(`<li><a href="#${item.slug}">${item.title}</a></li>`);
    }
  }
  if (subListOpen) lines.push('</ul>');
  if (topLiOpen) lines.push('</li>');
  return `<ul class="toc">${lines.join('')}</ul>`;
}

function pageTemplate({ moduleNum, h1Title, tocHtml, bodyHtml, prevHref, nextHref }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Module ${moduleNum}: ${h1Title} | Claude Certification Study Material</title>
    <style>
      :root {
        --bg: #fbfbfa;
        --panel: #ffffff;
        --border: #e3e5ea;
        --border-strong: #c8cdd6;
        --text: #14161a;
        --muted: #6b7280;
        --muted-2: #9aa1ac;
        --accent: #2563eb;
        --accent-bg: #eef4ff;
        --accent-border: #93b4f5;
        --radius: 10px;
      }
      :root[data-theme="dark"] {
        --bg: #0f1115;
        --panel: #181b21;
        --border: #2a2e37;
        --border-strong: #3d434f;
        --text: #e8eaed;
        --muted: #a7aeb8;
        --muted-2: #7d8590;
        --accent: #86b6ff;
        --accent-bg: #16223d;
        --accent-border: #4d75b8;
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        min-height: 100%;
        background: var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
      }
      .skip-link {
        position: absolute;
        left: -9999px;
        top: 0;
        background: var(--accent);
        color: #fff;
        padding: 10px 16px;
        z-index: 100;
        border-radius: 0 0 8px 0;
      }
      .skip-link:focus { left: 0; }
      .theme-toggle {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 50;
        border: 1px solid var(--border-strong);
        background: var(--panel);
        color: var(--text);
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
      }
      .theme-toggle:hover { border-color: var(--accent-border); }
      .layout {
        max-width: 1080px;
        margin: 0 auto;
        padding: 48px 24px 80px;
        display: grid;
        grid-template-columns: 240px minmax(0, 1fr);
        gap: 40px;
      }
      @media (max-width: 860px) {
        .layout { grid-template-columns: 1fr; }
      }
      .back-link {
        display: inline-block;
        margin-bottom: 20px;
        color: var(--accent);
        font-size: 0.85rem;
        font-weight: 600;
        text-decoration: none;
      }
      .back-link:hover { text-decoration: underline; }
      nav.toc-nav {
        border-right: 1px solid var(--border);
        padding-right: 24px;
        align-self: start;
        position: sticky;
        top: 24px;
      }
      @media (max-width: 860px) {
        nav.toc-nav { border-right: none; border-bottom: 1px solid var(--border); padding: 0 0 20px; position: static; }
      }
      nav.toc-nav h2 {
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted-2);
        font-weight: 700;
        margin: 0 0 12px;
      }
      ul.toc, ul.toc-sub { list-style: none; margin: 0; padding: 0; }
      ul.toc > li { margin-bottom: 8px; }
      ul.toc-sub { margin: 6px 0 6px 14px; }
      ul.toc-sub > li { margin-bottom: 6px; }
      .toc a {
        color: var(--text);
        text-decoration: none;
        font-size: 0.86rem;
        line-height: 1.4;
      }
      .toc-sub a { color: var(--muted); font-size: 0.82rem; }
      .toc a:hover, .toc a:focus { color: var(--accent); text-decoration: underline; }
      .toc a[aria-current="location"] {
        color: var(--accent);
        font-weight: 700;
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 3px;
      }
      main#content h1 { font-size: clamp(1.6rem, 3vw, 2.1rem); margin: 0 0 24px; letter-spacing: -0.01em; }
      main#content h2 { font-size: 1.35rem; margin: 40px 0 14px; border-top: 1px solid var(--border); padding-top: 28px; }
      main#content h2:first-of-type { border-top: none; padding-top: 0; }
      main#content h3 { font-size: 1.1rem; margin: 28px 0 10px; }
      main#content h4 { font-size: 0.95rem; margin: 20px 0 8px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
      main#content p { line-height: 1.7; color: var(--text); margin: 0 0 16px; max-width: 74ch; }
      main#content ul, main#content ol { line-height: 1.7; margin: 0 0 16px; padding-left: 1.4em; max-width: 74ch; }
      main#content li { margin-bottom: 6px; }
      main#content code { background: var(--accent-bg); border-radius: 4px; padding: 0.1em 0.4em; font-size: 0.9em; }
      main#content pre { background: #14161a; color: #e8eaed; border-radius: var(--radius); padding: 16px; overflow-x: auto; margin: 0 0 20px; }
      main#content pre code { background: none; padding: 0; }
      main#content hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
      .table-wrap { overflow-x: auto; margin: 0 0 20px; border: 1px solid var(--border); border-radius: var(--radius); }
      main#content table { border-collapse: collapse; width: 100%; font-size: 0.88rem; }
      main#content th, main#content td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--border); vertical-align: top; }
      main#content th { background: var(--accent-bg); color: var(--text); font-weight: 700; white-space: nowrap; }
      main#content tbody tr:last-child th, main#content tbody tr:last-child td { border-bottom: none; }
      main#content :target { scroll-margin-top: 20px; background: var(--accent-bg); }
      .module-nav { display: flex; justify-content: space-between; gap: 16px; margin-top: 48px; border-top: 1px solid var(--border); padding-top: 20px; }
      .module-nav a { color: var(--accent); text-decoration: none; font-size: 0.85rem; font-weight: 600; }
      .module-nav a:hover { text-decoration: underline; }
      .sr-only {
        position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
        overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
      }
    </style>
  </head>
  <body>
    <a class="skip-link" href="#content">Skip to content</a>
    <button id="themeToggle" class="theme-toggle" type="button" aria-label="Toggle dark mode"></button>
    <div class="layout">
      <nav class="toc-nav" aria-label="Table of contents">
        <a id="backLink" class="back-link" href="index.html">&larr; Back to quiz</a>
        <h2 id="toc-heading">On this page</h2>
        ${tocHtml}
      </nav>
      <main id="content" tabindex="-1">
        ${bodyHtml}
        <div class="module-nav">
          ${prevHref ? `<a href="${prevHref}">&larr; Previous module</a>` : '<span></span>'}
          ${nextHref ? `<a href="${nextHref}">Next module &rarr;</a>` : '<span></span>'}
        </div>
      </main>
    </div>
    <script>
      const THEME_KEY = 'devFoundationPractice.theme.v1';
      function getPreferredTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'dark' || saved === 'light') return saved;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(THEME_KEY, theme);
        const btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = theme === 'dark' ? '\u2600\ufe0f Light' : '\ud83c\udf19 Dark';
      }
      applyTheme(getPreferredTheme());
      document.getElementById('themeToggle').addEventListener('click', () => {
        const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
      // Arrived here from a results-page reference link: send "Back to quiz" back to those results.
      if (new URLSearchParams(location.search).get('from') === 'results') {
        document.getElementById('backLink').href = 'index.html?view=results';
      }

      const tocLinks = [...document.querySelectorAll('.toc a[href^="#"]')];
      const tocLinksById = new Map(tocLinks.map((link) => [link.hash.slice(1), link]));
      const headings = [...document.querySelectorAll('main#content h2[id], main#content h3[id]')];
      let activeHeadingId = '';

      function setActiveTocLink(headingId) {
        if (headingId === activeHeadingId || !tocLinksById.has(headingId)) return;
        const previousLink = tocLinksById.get(activeHeadingId);
        if (previousLink) previousLink.removeAttribute('aria-current');
        tocLinksById.get(headingId).setAttribute('aria-current', 'location');
        activeHeadingId = headingId;
      }

      function updateActiveTocLink() {
        const visibleHeading = headings.find((heading) => {
          const bounds = heading.getBoundingClientRect();
          return bounds.top >= 0 && bounds.top < window.innerHeight * 0.45;
        });
        const passedHeading = [...headings].reverse().find((heading) => heading.getBoundingClientRect().top <= 0);
        const activeHeading = visibleHeading || passedHeading || headings[0];
        if (activeHeading) setActiveTocLink(activeHeading.id);
      }

      let scrollFrame;
      window.addEventListener('scroll', () => {
        cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(updateActiveTocLink);
      }, { passive: true });
      window.addEventListener('resize', updateActiveTocLink);
      updateActiveTocLink();
    </script>
  </body>
</html>
`;
}

function buildModule(moduleNum) {
  const mdPath = path.join(ROOT, `module-${moduleNum}.md`);
  const markdown = readFileSync(mdPath, 'utf8');
  const { html, sections } = parseMarkdown(markdown);
  const h1 = sections.find((s) => s.level === 1);
  const h1Title = h1 ? h1.title : `Module ${moduleNum}`;
  const tocHtml = buildToc(sections);
  const prevHref = moduleNum > 1 ? `module-${moduleNum - 1}.html` : null;
  const nextHref = moduleNum < MODULE_COUNT ? `module-${moduleNum + 1}.html` : null;
  const outHtml = pageTemplate({ moduleNum, h1Title, tocHtml, bodyHtml: html, prevHref, nextHref });
  const outPath = path.join(ROOT, `module-${moduleNum}.html`);
  writeFileSync(outPath, outHtml, 'utf8');
  return { moduleNum, sections, h1Title };
}

const results = [];
for (let n = 1; n <= MODULE_COUNT; n += 1) {
  results.push(buildModule(n));
}

for (const r of results) {
  console.log(`module-${r.moduleNum}.html: "${r.h1Title}" (${r.sections.length} sections)`);
}
