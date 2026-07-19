# HANDOFF.md — session continuity

_Last updated: 2026-07-19 (session 1 — initial implementation)_

## Completed work

- Researched Syncthing ignore semantics (docs + `lib/ignore` source); recorded in
  docs/Matcher.md and DECISIONS.md.
- Full project implemented from scratch per `prompt.md`:
  - Engine: glob translator, parser (#include/#escape/prefixes/diagnostics), matcher with
    Syncthing pattern expansion, tree model, `tree /F` + Unix `tree` + path-list importer,
    evaluation history engine, timeline controller, English explanation generator.
  - UI: SVG tree renderer (states, zoom, search, tooltips, expand/collapse), overlay editor
    (highlighting, line numbers, diagnostics, current-rule, autocomplete), explanation
    panel (step + file-history tabs), import dialog (paste/drop/pick + preview), theme
    toggle, platform selector, include-file tabs, timeline bar, keyboard shortcuts.
  - 102 Vitest tests, all passing; production build clean (tsc strict + vite).
  - Docs: README + 10 files under docs/. Memory: CLAUDE.md, DECISIONS.md, ROADMAP.md,
    todo.md, CHANGELOG.md, .claude/knowledge + .claude/skills.
- Browser smoke test done (Chrome via DevTools MCP): initial load, stepping, shadowed-match
  display, final state, file details, light theme, Windows-tree import all verified
  visually.

## Current status

**Working MVP, all four panels functional.** `npm test` green, `npm run build` green.
No known bugs.

## Unfinished / not started

- Export features (SVG/PNG/JSON), rule statistics, shareable URLs — designed but not built
  (docs/FutureIdeas.md).
- No row virtualization for very large trees (>10k nodes) — auto-collapse mitigates.
- Editor autocomplete is minimal by design; no undo-history management.
- No CI workflow file.

## Active problems

None known. Watch-outs: see "Known pitfalls" in CLAUDE.md.

## Recommended next steps

1. Real `.stignore` file import (drop onto editor) — small win, high value.
2. Rule statistics panel (matched/decided/shadowed counts per rule) — engine already
   collects the data in `EvaluationStep`.
3. SVG/PNG export.
4. Consider a CI workflow (npm ci && npm test && npm run build).

## Files modified this session

Everything — initial commit. See `git log`.

## Context for the next session

- Read CLAUDE.md first (especially the first-match-wins warning).
- `prompt.md` is the original brief; its example rule ordering was deliberately corrected
  (ADR-002) — don't "restore" it.
- The dev loop: `npm run dev`, edit, `npm test` before finishing. Browser smoke checklist
  in docs/Testing.md.
