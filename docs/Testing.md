# Testing

Test runner: **Vitest** (`npm test`, `npm run test:watch`, `npm run coverage`).
All tests run in Node — the entire engine layer is DOM-free by design.

## Suite layout (tests/)

| File | Covers |
|---|---|
| `glob.test.ts` | every wildcard from the docs (`te*ne`, `te**ne`, `te??st`, classes, braces), both escape characters, literal regex metacharacters, error cases |
| `parser.test.ts` | comments/blanks/trimming, prefix combinations and repeats, `(?di)` warning, rooted/trailing-slash detection, empty & invalid patterns, `#include` (position, missing, duplicate, cycle), `#escape=` (first-line rule, per-file scope), Windows backslash conversion, advisory diagnostics |
| `matcher.test.ts` | Syncthing pattern-expansion parity (all four expansion branches), any-depth matching, rooted matching, contents-only, **first-match-wins and the gitignore-order counterexample**, case sensitivity per platform + `(?i)`, `(?d)` deletable, `**` recursion, inert invalid rules, include ordering, escapes, internal files |
| `tree.test.ts` | implicit parents, sorting, dir-upgrade, dedup, built-in example shape |
| `treeParser.test.ts` | Windows Unicode + ASCII graphics, deep last-branch files, Unix format with inferred and explicit dirs, path lists, warning paths, empty input |
| `history.test.ts` | per-file records, decided/shadowed steps, internal files, deletable propagation, timeline state derivation (`stateAtPosition` / `matchedAtPosition`), step summaries |
| `timeline.test.ts` | stepping/clamping, listener notifications, play/pause/restart with fake timers |
| `explain.test.ts` | rule explanations for every rule type, escaped-wildcard phrasing, step-effect strings |
| `integration.test.ts` | full pipeline on the built-in example (including an **inline snapshot of all final states**), imported-tree workflow, platform switching, `#include` end-to-end |

102 tests at the time of writing. Every rule type documented by Syncthing (negation,
recursion, includes, escaping, delete-only, root anchoring, case-insensitivity) has at least
one dedicated test, most sourced directly from examples in the official docs.

## Coverage

`npm run coverage` reports on the engine modules only; DOM-bound modules (`app`, `ui`,
`editor`, `renderer`, `explainPanel`, `importDialog`) are excluded in `vite.config.ts` and
verified manually in the browser (see below). Engine coverage target: ≥ 80% lines — the
pure modules sit well above that.

## Manual browser checks

After UI changes run `npm run dev` and verify:

1. Built-in example loads; stepping shows the `important.tmp` shadowed-match story.
2. Editing a rule updates tree + diagnostics instantly; breaking a rule (e.g. `file[0-9`)
   shows an error and the rule stops matching.
3. Import dialog with a real `tree /F` capture; light/dark toggle; platform switch flips
   `(?i)`-less case matching; keyboard shortcuts.

## Adding tests

Put engine tests next to the module name in `tests/`. Prefer examples straight from the
Syncthing docs; when behavior is ambiguous, document the decision in
[KnownLimitations.md](KnownLimitations.md) and pin it with a test.
