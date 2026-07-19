# DECISIONS.md — architectural decision log

## ADR-001: Reproduce Syncthing semantics, not gitignore semantics

- **Context:** Users (and the original brief) tend to assume gitignore rules. Syncthing
  differs in several load-bearing ways: first-match-wins, `//` comments, `**` expansion
  behavior, escape characters, `#include`.
- **Options:** (a) gitignore-flavored approximation, (b) faithful Syncthing model,
  (c) configurable hybrid.
- **Decision:** (b) — faithful model, derived from docs.syncthing.net/users/ignoring.html
  and `lib/ignore/ignore.go`. A gitignore comparison mode may come later as an explicit
  teaching toggle (FutureIdeas).
- **Consequences:** The app can serve as a reference implementation; some users will be
  surprised (which is the point — the UI explains the differences).

## ADR-002: Correct the brief's example rule ordering

- **Context:** `prompt.md` ships `*.tmp` before `!important.tmp` and expects
  `important.tmp` to end up included, and asks the visualization to show "later rules
  override earlier ones". That is last-match-wins thinking; in Syncthing the first match
  wins, so the negation must precede `*.tmp` — and later rules never override earlier ones.
  The same brief explicitly demands faithful Syncthing behavior, which takes precedence.
- **Options:** (a) implement the brief literally (wrong semantics), (b) reorder the example
  and teach first-match-wins, (c) implement both modes.
- **Decision:** (b). `!important.tmp` comes first in `DEFAULT_RULES`; the `*.tmp` step then
  displays `important.tmp` as "matched, but already decided — first match wins", turning
  the brief's example into a teaching moment. Also added `images/.DS_Store` to the example
  tree so `(?d)` visibly matches.
- **Consequences:** Deviation from the literal brief, documented here and in
  docs/KnownLimitations.md; snapshot test pins the behavior.

## ADR-003: No framework, no runtime dependencies

- **Context:** Brief requires HTML/CSS/TypeScript + SVG, lightweight and modular.
- **Options:** (a) vanilla TS modules, (b) lit/preact-class micro-framework, (c) React.
- **Decision:** (a). One state owner (`app.ts`), unidirectional updates, direct SVG/DOM
  manipulation with incremental class updates.
- **Consequences:** ~14 kB gzipped bundle, no dependency churn; some hand-written DOM
  wiring; renderer performance is fully under our control (needed for class-only timeline
  updates).

## ADR-004: Keep invalid rules inert instead of failing the file

- **Context:** Real Syncthing refuses to load a folder whose `.stignore` doesn't parse. In
  a live sandbox the file is mid-edit constantly.
- **Decision:** Rules with glob errors stay in the list (never match) with an error
  diagnostic; missing `#include` targets error but don't stop parsing. Diagnostics state
  what real Syncthing would do.
- **Consequences:** Sandbox stays responsive while typing; slight deviation documented in
  KnownLimitations.

## ADR-005: Evaluate everything once; derive timeline views

- **Context:** Timeline scrubbing must be smooth on trees with thousands of files.
- **Options:** (a) re-evaluate per step, (b) store full per-step state maps, (c) evaluate
  once, derive state at position from `decidingRule`.
- **Decision:** (c). `FileEvaluation.decidingRule` + `records[]` make state at any position
  O(1) per node; renderer applies class changes only.
- **Consequences:** O(files×rules) memory for records (fine at target scale); no
  re-computation on scrub; play/pause logic is pure view state.

## ADR-006: Vite + Vitest toolchain, engine kept DOM-free

- **Context:** Brief allows Node-based build tooling but no runtime Node; requires a
  serious test suite.
- **Decision:** Vite (build/dev), Vitest (node-env tests), TS strict with
  `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`. The engine never imports DOM
  types so tests need no browser/jsdom; UI modules are excluded from coverage and verified
  by a manual checklist.
- **Consequences:** Fast, dependency-light CI story; renderer/editor logic is not
  unit-tested (accepted trade-off, revisit if UI bugs recur).

## ADR-007: Windows `tree /F` parsing by 4-column math

- **Context:** `tree /F` output has no explicit depth markers for files, only indentation
  built from `│   ` groups (or spaces in last branches).
- **Decision:** Depth = prefix-length / 4; directories push a depth-indexed stack; files
  attach to `stack[depth − 1]`. Graphics-only lines skipped; unplaceable lines produce
  per-line warnings instead of aborting.
- **Consequences:** Robust across Unicode and `/A` ASCII output; tabs or hand-mangled
  indentation degrade to warnings (graceful).
