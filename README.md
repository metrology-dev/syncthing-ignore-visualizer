# Syncthing Ignore Pattern Visualizer

An interactive, completely client-side web application that teaches, visualizes, and lets you
experiment with Syncthing's `.stignore` ignore pattern engine.

Unlike a plain pattern tester, this tool **shows the evaluation happening**: step through the
rules on a timeline and watch each rule claim the files it matches, see why every file ends up
included or ignored, and inspect the complete evaluation history of any file.

## Key concepts it demonstrates

- **First match wins** — Syncthing applies the *first* matching rule, top-down (unlike
  `.gitignore`, where the last match wins). Negations must come *before* the broader rules
  they carve exceptions out of.
- **Wildcards** — `*` and `?` never cross `/`; `**` does; `[a-z]` and `{a,b}` work too.
- **Root anchoring** — `/foo` matches only at the folder root; `foo` matches at any depth.
- **Directory semantics** — `build` ignores the folder and its contents; `cache/` (trailing
  slash) ignores only the *contents*, keeping the folder itself synced.
- **Negation** (`!`), **case-insensitive** (`(?i)`), and **delete-only** (`(?d)`) prefixes.
- **`#include`** files and the **`#escape=`** directive, with platform-correct escape
  characters (`\` on Unix, `|` on Windows).
- Syncthing's always-ignored internals (`.stfolder`, `.stignore`, `.stversions`, temp files).

## Quick start

```bash
npm install
npm run dev        # development server with hot reload
```

Open the printed URL. The app ships with a built-in example tree and rule set that exercises
every rule type.

## Build & test

```bash
npm run build      # type-check + production bundle in dist/
npm run preview    # serve the production build
npm test           # run the full unit + integration test suite (Vitest)
npm run coverage   # test coverage for the core engine
```

The built `dist/` folder is fully static — host it anywhere (or open via any static server).
No backend, no runtime dependencies.

## Using the app

| Panel | What it does |
|---|---|
| **Folder Tree** | SVG rendering of the folder hierarchy. Green = included, red = ignored, yellow = matched by the current rule, dimmed = unaffected this step. Click a file for its full history; double-click or use the caret to collapse folders. Search and zoom in the toolbar. |
| **.stignore editor** | Live editor with syntax highlighting, line numbers, diagnostics (errors/warnings/hints), current-rule highlighting and prefix/directive autocomplete. Tabs let you add `#include` files. Every change re-evaluates instantly. |
| **Explanation** | Plain-English narration of the current step (what the rule means, what it matched, what was shadowed), or the full per-rule evaluation history of a selected file. |
| **Timeline** | Step, play/pause, reset, jump-to-final, and a scrubbing slider across the rule list. |

**Importing a real tree:** click *Import tree…* and paste (or drop a file with) the output of
`tree /F` (Windows), `tree` (Linux/macOS), or a plain list of relative paths.

**Platform selector:** switches default case sensitivity (Windows/macOS are case-insensitive)
and the escape character, mirroring real Syncthing behavior per OS.

### Keyboard shortcuts

`←`/`→` step · `Space` play/pause · `Home`/`End` first/final · `/` search · `+`/`-` zoom ·
`Ctrl`+wheel zoom

## Architecture

```
src/
  types.ts        shared type definitions
  glob.ts         glob → RegExp translation (gobwas/glob semantics)
  parser.ts       .stignore text → rules + diagnostics (#include, #escape=, prefixes)
  matcher.ts      Syncthing pattern expansion + first-match-wins matching
  tree.ts         immutable folder-tree model + built-in example
  treeParser.ts   tree /F, Unix tree, and path-list importers
  history.ts      evaluation engine: per-file history, per-rule steps
  timeline.ts     playback controller
  explain.ts      plain-English rule/step explanations
  renderer.ts     SVG tree renderer (incremental state updates)
  editor.ts       highlighted editor with diagnostics + autocomplete
  explainPanel.ts step + file-detail views
  importDialog.ts import dialog
  ui.ts           theme, tabs, diagnostics list, timeline bar, shortcuts
  app.ts          state owner and wiring
```

The core engine (`glob` → `parser` → `matcher` → `history`) is pure, DOM-free TypeScript,
fully unit-tested, and usable as a standalone reference implementation of Syncthing ignore
evaluation. See [docs/Architecture.md](docs/Architecture.md) for the full picture and
[docs/Matcher.md](docs/Matcher.md) for the exact semantics implemented.

## Accuracy

Semantics were derived from the [official ignoring documentation]
(https://docs.syncthing.net/users/ignoring.html) and Syncthing's `lib/ignore` source. Known
deviations and ambiguities are documented in
[docs/KnownLimitations.md](docs/KnownLimitations.md).

## License

GPL-3.0-or-later — see [LICENSE](LICENSE).
