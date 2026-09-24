# Claude Certification Study Material

This is a dependency-free static quiz application with five study modules. Run
the Node.js ESM scripts directly; there is no package manager setup.

## Architecture

- `index.html` contains the quiz UI, state, and curated `ITEM_BANK` data.
- `module-1.md` through `module-5.md` are the study-content sources.
- `module-1.html` through `module-5.html` are generated artifacts. Do not edit
	them by hand.
- `scripts/lib/markdown.mjs` is the repository's intentionally limited Markdown
	parser; do not assume full CommonMark support.

## Workflow

- Follow the [build and content workflow](instructions/build-content.instructions.md)
	when changing quiz logic, module content, generated pages, references, or tests.
- Run `node scripts/quiz.test.mjs` after changing quiz behavior or `index.html`.
- Keep changes accessible and preserve the existing light/dark theme and
	local-storage behavior.

<!-- mermaid-ai-skills:start -->
## Mermaid Diagrams

When creating, editing, or visualizing a diagram, follow the
[Mermaid instructions](instructions/mermaid.instructions.md).
<!-- mermaid-ai-skills:end -->

For Markdown-only cleanup that must preserve meaning, use the
[Markdown formatting skill](skills/markdown-formatting/SKILL.md).
