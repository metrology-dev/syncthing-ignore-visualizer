# Architecture (stable facts)

Two layers, one-way data flow:

- Engine (pure, DOM-free, unit-tested): `glob.ts` → `parser.ts` → `matcher.ts` →
  `history.ts`; plus `tree.ts`, `treeParser.ts`, `timeline.ts`, `explain.ts`, `types.ts`.
- UI (browser): `renderer.ts` (SVG tree), `editor.ts` (textarea-overlay editor),
  `explainPanel.ts`, `importDialog.ts`, `ui.ts` (widgets), `app.ts` (single state owner).

Pipeline on every change: `parseIgnoreFiles` → `compileRules` → `evaluate` → panels.
Timeline scrubbing re-derives view state via `stateAtPosition`/`matchedAtPosition` — it
never re-evaluates and never rebuilds DOM (class toggles only).

Rules keep global evaluation order across `#include` files (`ParsedRule.index`).
Diagnostics carry `(source file, 1-based line)`.

Full diagram + rationale: docs/Architecture.md. Decisions: DECISIONS.md (ADR-003/005/006).
