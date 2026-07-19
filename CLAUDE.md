# CLAUDE.md — AI project memory

## What this is

A production-quality, fully client-side web app that teaches and visualizes how Syncthing
evaluates `.stignore` files. Three panels (SVG folder tree, highlighted rule editor,
plain-English explanation) plus a playback timeline that steps through rule evaluation.
Also a clean-room reference implementation of Syncthing's ignore matcher in TypeScript.

Original brief: `prompt.md`. Session continuity: `HANDOFF.md`. Task list: `todo.md`.

## The one fact you must not forget

**Syncthing ignore evaluation is FIRST-match-wins** (top-down), *not* gitignore's
last-match-wins. Negations (`!pattern`) must appear **before** the broader ignore rules they
punch holes in. The whole app is built around teaching this. Never "fix" the built-in
example by moving `!important.tmp` after `*.tmp` — that ordering is wrong for Syncthing
(see DECISIONS.md ADR-002, docs/Matcher.md).

## Commands

```bash
npm run dev        # dev server
npm run build      # tsc --noEmit + vite build → dist/
npm test           # vitest run (all engine tests, ~100+)
npm run coverage   # engine coverage (UI modules excluded, see vite.config.ts)
npm run typecheck  # tsc only
```

## Architecture (docs/Architecture.md has the diagram)

- **Engine (pure, DOM-free, fully tested):** `glob.ts` → `parser.ts` → `matcher.ts` →
  `history.ts`; `tree.ts`/`treeParser.ts` for the folder model; `timeline.ts` playback;
  `explain.ts` English text. All types in `types.ts`.
- **UI (browser-only, tested manually):** `renderer.ts` (SVG tree), `editor.ts` (overlay
  editor), `explainPanel.ts`, `importDialog.ts`, `ui.ts` (widgets), `app.ts` (state owner).
- One-way data flow: `app.ts` recomputes parse→compile→evaluate on any change; timeline
  scrubbing only re-derives view state (`stateAtPosition`) — never re-evaluates.

## Semantics cheat sheet (full detail: docs/Matcher.md)

- Expansion mirrors `lib/ignore`: `foo` → `foo, foo/**, **/foo, **/foo/**`; `/foo` roots it;
  `foo/` = contents only; `**/` prefix also matches at root.
- `*`/`?` don't cross `/`; `**` does; `{a,b}` and `[a-z]` supported.
- Prefixes `!` `(?i)` `(?d)`, any order, once each; `(?di)` is a literal pattern + warning.
- Comments are `//` (a bare `#` line is a PATTERN — parser warns).
- Escape char: `\` Unix, `|` Windows (backslashes → `/` on Windows); `#escape=` first line,
  per file. Case-insensitive always on Windows/macOS platform presets.
- `.stfolder`/`.stignore`/`.stversions` (root) + `~syncthing~*.tmp`/`.syncthing.*.tmp`
  always ignored (`isInternal`).

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` — build
  fails on type errors (`build` runs tsc first).
- Engine stays DOM-free; anything importing `document` lives in the UI list in
  `vite.config.ts` coverage excludes.
- Immutable data models (`TreeNode`, results); UI-local mutable state (expanded set, zoom)
  stays inside its class.
- No runtime dependencies. Keep it that way without a strong reason.
- Files small and focused (<400 lines); comments only for non-obvious semantics, usually
  citing the Syncthing docs/source behavior they mirror.

## Known pitfalls

- Windows `tree /F` parsing is column-math based (4 cols/level); file parent index is
  `prefix/4 − 1` — off-by-one here silently misplaces files (tests cover it).
- The editor is a textarea overlay: highlight `<pre>` and gutter must stay scroll-synced.
- `expandRule` order matters for matching *and* for the `variant` shown in explanations.
- Diagnostics carry (source file, 1-based line); the editor shows only the active tab's.
- `exactOptionalPropertyTypes` is on: spread-conditionals (`...(x ? {k: v} : {})`) are used
  to avoid `undefined` assignment — don't "simplify" them away.

## Testing rules

Every engine change needs a test; prefer examples from the official docs. Ambiguity →
decide, test it, and record it in docs/KnownLimitations.md + DECISIONS.md. UI changes →
manual checklist in docs/Testing.md.

## Where things are heading

ROADMAP.md phases; concrete ideas in docs/FutureIdeas.md (export, rule stats, gitignore
comparison mode, virtualization).
