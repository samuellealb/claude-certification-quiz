---
name: question-bank-review
description: 'Audit the quiz question bank for duplicate or near-duplicate questions and answers, factual accuracy, answer quality, explanations, and reference integrity. Use when reviewing, validating, checking duplicates, or auditing quiz questions.'
argument-hint: 'Optionally specify item IDs, domains, or audit dimensions.'
---

# Question Bank Review

## Purpose

Produce an evidence-based review of the quiz bank without changing files. Cover duplicate content, answer correctness and quality, and whether references are both valid and relevant. Make edits only when the user explicitly asks for fixes.

## Repository Context

- The curated `ITEM_BANK` is in `index.html`; each item has an `id`, `domain`, `difficulty`, `question`, `options`, numeric `answer`, `explanation`, and `references`.
- Study-source content is in `module-1.md` through `module-5.md`. Prefer these over generated HTML when checking claims.
- `node scripts/build-references.mjs` structurally checks that items have local references and that local anchors and labels match module `##` or `###` headings. It does not assess factual accuracy or semantic relevance and does not modify files.
- `node scripts/quiz.test.mjs` covers quiz behavior; passing it is not a substitute for reviewing question quality.
- Follow [build and content workflow](../../instructions/build-content.instructions.md) for repository-specific source and validation rules.

## Procedure

1. **Set scope.** Review the whole bank unless the user names item IDs, domains, or dimensions. Do not modify files during an audit.
2. **Check structure.** Run `node scripts/build-references.mjs`. Record structural failures, including missing local references, broken anchors, or labels that do not match their headings. Do not treat a successful run as proof that a reference supports the question.
3. **Check duplicates.** Compare normalized question text for exact duplicates. Then inspect likely near-duplicates for the same tested fact, reasoning path, or scenario, even when wording differs. Check repeated options within an item, repeated option sets across items, and copied explanations. Treat similarity matches as leads for manual review, not automatic findings; explain why each flagged pair is or is not duplicative.
4. **Check answer validity and quality.** Confirm each answer index selects an existing option. Verify the selected answer is factually correct against the relevant module source and, for time-sensitive or disputed claims, an authoritative current primary source. Check that the stem is clear and sufficiently constrained, there is one defensible best answer, distractors are plausible but demonstrably wrong, and wording does not reveal the key through length, grammar, or absolutes. Check that difficulty and any badge are consistent with the reasoning required.
5. **Check explanations.** Confirm each explanation supports the keyed answer, explains the underlying distinction, and does not introduce unsupported claims or contradict the study source. Note explanations that merely repeat the answer or omit a useful clarification.
6. **Check reference integrity.** For each audited item, verify that local hrefs target an existing supported module heading and that the referenced section actually contains or directly supports the claim. Check that external sources are authoritative and relevant. A broad `##` or `###` anchor can be appropriate when the supporting detail is nested below it and no narrower supported heading exists; judge the section contents, not just its title. Distinguish structural validity from semantic relevance.
7. **Report findings.** Give a short scope and checks-run summary, then list findings by severity with item IDs and evidence. Include false-positive near-duplicate pairs when useful, and state explicitly when no issues were found in a category. Separate confirmed defects from suggestions and uncertainty. Do not claim factual verification beyond the sources actually checked.
8. **Offer a repair pass only when appropriate.** If the user asked for fixes, make the smallest targeted changes, regenerate module pages only when module Markdown or its template changed, rerun `node scripts/build-references.mjs` for reference or heading changes, and run `node scripts/quiz.test.mjs` after quiz-bank or `index.html` changes.

## Review Criteria

- **Critical:** keyed answer is wrong or the item has no defensible correct answer in a consequential way.
- **High:** materially ambiguous stem, multiple defensible answers, broken or misleading reference, or a duplicate that meaningfully overweights a concept.
- **Medium:** weak distractors, misleading explanation, near-duplicate coverage, or a reference that is structurally valid but only loosely supports the claim.
- **Low:** minor clarity, style, or difficulty/badge mismatch that does not change the answer.

Do not inflate severity for stylistic preferences. State the evidence and impact for every finding.
