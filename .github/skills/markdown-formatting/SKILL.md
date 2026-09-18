---
name: markdown-formatting
description: 'Format and polish Markdown files for readability and consistency. Use when cleaning up headings, paragraphs, lists, code blocks, tables, links, whitespace, or instructional documentation while preserving meaning and content.'
argument-hint: 'Specify the Markdown file to format and any repository-specific style constraints.'
---

# Markdown Formatting

## Purpose

Apply consistent Markdown conventions to an existing file without changing its meaning, technical accuracy, or intended audience.

## When to Use

- Format an existing `.md` or `.markdown` file.
- Normalize headings, paragraphs, lists, code blocks, tables, links, and whitespace.
- Improve scanability of instructional or technical documentation.
- Clean up inconsistent Markdown while preserving the author's wording and structure.

## Procedure

1. Identify the target Markdown file and read enough surrounding content to understand its purpose, audience, and existing style.
2. Check nearby documentation and repository instructions for local conventions before changing the file.
3. Preserve the document's meaning, terminology, examples, links, code behavior, and intentional emphasis.
4. Apply the formatting standards below.
5. Review the complete edited file for hierarchy, consistency, readability, and accidental content changes.
6. Run the narrowest available Markdown linter, formatter, or documentation check. If no automated check exists, perform a structural review of the file.
7. Report the file changed and any checks that were run or unavailable.

## Formatting Standards

### Headings

- Use one level-one heading for the document title when the file has a title.
- Keep heading levels sequential. Do not skip from `##` to `####`.
- Use sentence case unless the repository consistently uses another convention.
- Keep headings descriptive and concise.
- Do not use bold text as a substitute for a heading.

### Paragraphs and Line Breaks

- Keep one idea per paragraph and separate paragraphs with one blank line.
- Wrap prose only when required by the repository's formatter or line-length convention.
- Use a hard line break only when the rendered layout requires it.
- Remove trailing whitespace and unnecessary blank lines.

### Lists

- Use `-` for unordered lists unless the repository uses another marker consistently.
- Use numbered lists for ordered procedures or sequences.
- Keep list markers and indentation consistent within each list.
- Indent nested content consistently, including nested lists and code blocks.
- Keep parallel items grammatically consistent where practical.

### Code

- Use fenced code blocks with a language identifier whenever the language is known.
- Use inline code for commands, filenames, paths, symbols, settings, and short code references.
- Keep code unchanged unless the task explicitly includes correcting or updating it.
- Use four-space indentation only when an indented code block is required by existing style.
- Do not place explanatory prose inside a code block unless it is part of the example.

### Links and Images

- Use descriptive link text rather than exposing a raw URL when the destination is clear.
- Keep link destinations intact unless a broken or incorrect link is part of the task.
- Use meaningful alt text for images.
- Avoid link-only headings and ambiguous text such as "click here".

### Tables

- Include a header row and a separator row.
- Keep the number of cells consistent across rows.
- Align columns for source readability when practical, but do not change table meaning.
- Use lists or paragraphs instead of forcing long prose into a table cell.
- Escape pipe characters inside cell content when needed.

### Emphasis and Quotes

- Use `**bold**` for important terms and `*italics*` sparingly for emphasis.
- Use blockquotes for quoted material, notes, or clearly distinguished callouts.
- Do not combine emphasis markers inconsistently or use them as decoration.

### Content Preservation

- Do not rewrite, summarize, expand, or fact-check content unless explicitly requested.
- Do not change code, commands, identifiers, URLs, or examples merely to make formatting easier.
- Preserve intentional HTML, Mermaid blocks, frontmatter, admonitions, and raw Markdown constructs.
- If a structural issue is ambiguous, keep the existing content and call out the ambiguity instead of guessing.

## Completion Checklist

- [ ] The target file and repository instructions were identified.
- [ ] Heading hierarchy is valid and easy to scan.
- [ ] Paragraphs, lists, and indentation are consistent.
- [ ] Code blocks have appropriate fences and language identifiers.
- [ ] Tables have valid, consistent columns.
- [ ] Links, images, frontmatter, and special blocks were preserved.
- [ ] Trailing whitespace and accidental blank-line noise were removed.
- [ ] A focused Markdown check was run, or its absence was reported.
- [ ] Meaning and technical content were not changed unintentionally.
