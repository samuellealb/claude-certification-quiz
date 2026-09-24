---
name: review-content-data-base
description: "Review Claude Certification study-module content for mismatches between interactive cues and static Markdown, missing promised content, dense comparison formatting, and broken references. Use when auditing module content, reviewing study materials, checking tabs/cards/steps, or improving module scanability."
argument-hint: "Specify the module files or content section to review."
---

# Review Content Data Base

## Purpose

Audit the study-module source files for content and presentation gaps. Repair formatting when the surrounding source already contains the promised material. Report genuine authoring gaps precisely rather than inventing technical content.

## Use When

- Reviewing `module-*.md` for content completeness or scanability.
- Auditing text that refers to tabs, cards, clicking, expanding, flipping, or selecting.
- Converting complete prose comparisons into tables supported by the local Markdown parser.
- Checking whether a generated module page accurately represents its Markdown source.

## Boundaries

- Read [.github/instructions/build-content.instructions.md](../../instructions/build-content.instructions.md) before editing a module source.
- Treat `module-N.md` as source and `module-N.html` as generated output. Never hand-edit generated pages.
- Preserve meaning, technical claims, examples, identifiers, URLs, and references. Do not fill a content gap from general knowledge without the user's approval.
- Use only syntax supported by `scripts/lib/markdown.mjs`: headings, paragraphs, fenced code, ordered and unordered lists, and GFM pipe tables.

## Procedure

1. Identify the module scope. For a broad audit, review all `module-*.md` files.
2. Search the sources for static-document mismatches, including phrases such as `select each tab`, `click each step`, `flip each card`, `expand`, `accordion`, `choose an option`, and `hover`.
3. For every cue, read the cue and its immediate surrounding section. Determine which case applies:
   - **Content present, formatting mismatch:** The promised concepts already have descriptions, headings, lists, or prose nearby. Reorganize that material into a supported static structure.
   - **Content genuinely missing:** The cue promises details for named items, but one or more items have no corresponding explanation in the source. Do not fabricate details. Record the section, the cue, and the exact missing items.
   - **No issue:** The language is metaphorical or the source already matches the cue.
4. Inspect dense repeated-label blocks and parallel comparisons even when they lack interaction wording. Use a table when all of these are true:
   - Rows compare the same dimensions.
   - All cells can be populated from existing text.
   - A table makes the decision or comparison faster to scan.
   Keep prose or headings when the content is sequential, explanatory, or too detailed for readable table cells.
5. Make formatting-only repairs in the Markdown source:
   - Replace unsupported interactive instructions with static wording that describes the rendered structure.
   - Convert complete comparisons into a GFM pipe table with consistent cells and descriptive headers.
   - Add a summary table only when its contents can be drawn directly from surrounding prose.
   - Keep headings when they are needed as stable navigation anchors. If a heading must be removed, check quiz references before proceeding.
6. For each genuine gap, report:
   - Module and section heading.
   - The interaction cue or promise.
   - The named items that lack content.
   - The information needed to complete the section.
7. Regenerate module pages with:

   ```sh
   node scripts/build-modules.mjs
   ```

8. Run diagnostics on edited Markdown files. Search generated HTML to confirm repaired tables or lists render as the intended structure.
9. If headings or slugs changed, run:

   ```sh
   node scripts/build-references.mjs
   ```

   Resolve every broken local reference before completion.

## Completion Criteria

- Each reviewed interaction cue is classified as repaired, genuinely missing, or intentionally unchanged.
- No unsupported interaction instruction remains when a static structure now presents the content.
- Every new table has a header, separator row, and consistent number of cells.
- Generated `module-N.html` pages are rebuilt after every source edit.
- Edited Markdown files have no diagnostics.
- If headings or slugs changed, the reference audit reports zero structural errors.
- The final report lists changed modules and any exact content the author still needs to supply.

## Example Prompts

- `Review all module Markdown files for content gaps and tab/card formatting mismatches.`
- `Audit module-3.md for promises of interactive content that do not exist in the static page.`
- `Make the available comparison content in modules 2 and 4 easier to scan, and flag anything missing.`