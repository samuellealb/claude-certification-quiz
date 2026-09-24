---
name: "Build and Content Workflow"
description: "Use when editing quiz logic, study modules, generated module pages, the Markdown parser, item references, or Node tests."
applyTo:
  - "index.html"
  - "module-*.md"
  - "module-*.html"
  - "scripts/**/*.mjs"
---

# Build and Content Workflow

## Source Boundaries

- Edit `module-N.md` for study content. Regenerate `module-N.html`; never patch a
  generated module page directly.
- Edit `scripts/build-modules.mjs` for generated-page layout, styling, navigation,
  or shared behavior.
- Treat `index.html` as hand-maintained source for the quiz and `ITEM_BANK`.
- `scripts/build-references.mjs` audits curated local references and labels. It
  does not generate or modify them.

## Build and Validation

- After changing a module, the Markdown parser, or the module template, run
  `node scripts/build-modules.mjs` and include the regenerated HTML.
- After changing module headings, slugs, or item references, run
  `node scripts/build-references.mjs`.
- After changing quiz behavior, item data, or `index.html`, run
  `node scripts/quiz.test.mjs`.
- Use direct Node commands; this repository has no `package.json` or install step.

## Content and UI Conventions

- Use one `#` module title, `##` for primary table-of-contents sections, `###`
  for subsections, and `####` for details.
- Confirm syntax is supported by `scripts/lib/markdown.mjs` before introducing a
  new Markdown construct.
- Preserve semantic landmarks, keyboard navigation, visible focus, readable
  contrast in both themes, and VoiceOver-friendly labels when changing UI.
- Preserve the results-to-module return flow that uses `?from=results` and saved
  result state.

## Structural Constraints

- The module count is fixed at five in both build scripts; update both when
  adding or removing a module.
- The quiz tests execute the final inline script from `index.html` in a Node VM.
  Keep that extraction model in mind when reorganizing scripts or browser APIs.