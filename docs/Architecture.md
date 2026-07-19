# Architecture

## Overview

The application is a strictly client-side TypeScript app with two layers:

```
┌────────────────────────── UI layer (DOM/SVG) ──────────────────────────┐
│  app.ts ──┬── editor.ts        (highlighted .stignore editor)          │
│           ├── renderer.ts      (SVG folder tree)                       │
│           ├── explainPanel.ts  (step narration + file history)         │
│           ├── importDialog.ts  (tree import)                           │
│           └── ui.ts            (theme, tabs, diagnostics, timeline bar)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ pure data (types.ts)
┌──────────────────────── Engine layer (DOM-free) ───────────────────────┐
│  parser.ts ──► matcher.ts ──► history.ts ──► timeline.ts               │
│      │             │                                                   │
│   glob.ts      tree.ts ◄── treeParser.ts        explain.ts             │
└────────────────────────────────────────────────────────────────────────┘
```

The **engine layer** has no DOM dependencies; every module is pure and unit-tested in Node.
The **UI layer** renders engine output and forwards user input back to `app.ts`.

## Data flow

1. `app.ts` owns the state: ignore file contents (a `Map<string, string>`), the folder tree,
   the platform preset, the timeline position and the selection.
2. On any change: `parseIgnoreFiles()` → `compileRules()` → `evaluate()` produces an
   `EvaluationResult` containing per-file histories and per-rule steps.
3. Panels are updated from that single result. Timeline changes do **not** re-evaluate —
   they only re-derive view state via `stateAtPosition()` / `matchedAtPosition()`.

Editor input is debounced (160 ms); a full pipeline run for a few-thousand-file tree with a
dozen rules stays well under a frame budget of ~100 ms.

## Key types (types.ts)

- `ParsedRule` — one effective rule: pattern, prefixes, rooted/contentsOnly flags, source
  file + line, escape char, optional compile error.
- `ParseResult` — rules + diagnostics + per-line classifications for editor highlighting.
- `TreeNode` — immutable tree; `path` is `/`-separated relative to the folder root.
- `FileEvaluation` — per-file: `records[]` (one per rule: matched/applied/stateAfter),
  `finalState`, `decidingRule`, `deletable`, `internal`.
- `EvaluationStep` — per-rule: `decided[]` (first-matched here) and `shadowed[]` (matched
  but already decided earlier).

## Module responsibilities

| Module | Responsibility | Docs |
|---|---|---|
| `glob.ts` | Translate one glob to a RegExp source | [Matcher.md](Matcher.md) |
| `parser.ts` | Lines → rules + diagnostics; `#include`, `#escape=`, prefixes | [Parser.md](Parser.md) |
| `matcher.ts` | Syncthing variant expansion; first-match-wins matching; internal files | [Matcher.md](Matcher.md) |
| `tree.ts` | Tree building/flattening; built-in example | — |
| `treeParser.ts` | `tree /F`, Unix `tree`, path-list importers | [FolderParser.md](FolderParser.md) |
| `history.ts` | Full evaluation; timeline state derivation | [Matcher.md](Matcher.md) |
| `timeline.ts` | Playback state machine | [Timeline.md](Timeline.md) |
| `explain.ts` | Plain-English rule/step text | — |
| `renderer.ts` | SVG rows, zoom, search, incremental class updates | [Rendering.md](Rendering.md) |
| `editor.ts` | Overlay editor, tokenizer, diagnostics, autocomplete | [Rendering.md](Rendering.md) |

## Why no framework

The state graph is small (one owner, unidirectional updates), the hot path is custom SVG
manipulation that a virtual DOM would only slow down, and the project brief calls for
lightweight, dependency-free output. Total production JS is ~43 kB (14 kB gzipped).
