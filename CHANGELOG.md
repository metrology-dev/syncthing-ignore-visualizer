# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); versions follow semver once released.

## [0.1.0] — 2026-07-19

Initial implementation.

### Added

- Syncthing-faithful ignore engine: glob translation (gobwas semantics), `.stignore`
  parser (`//` comments, `#include`, `#escape=`, `!`/`(?i)`/`(?d)` prefixes, root and
  trailing-slash handling, per-platform escape chars, Windows backslash conversion),
  first-match-wins matcher with `lib/ignore` pattern expansion, always-ignored internals.
- Evaluation history engine: per-file per-rule records, decided/shadowed steps, timeline
  state derivation.
- Folder tree model + importers for Windows `tree /F` (Unicode + ASCII), Unix `tree`, and
  plain path lists, with warnings for malformed input.
- UI: SVG folder tree (state colors, flash animations, zoom, search, tooltips,
  expand/collapse, auto-collapse for large trees), overlay `.stignore` editor (syntax
  highlighting, line numbers, diagnostics, current-rule highlight, prefix/directive
  autocomplete, include-file tabs), explanation panel (per-step narration + per-file
  history table), playback timeline (play/pause/step/scrub/jump), import dialog
  (paste/drop/file + preview), dark/light themes, platform selector, keyboard shortcuts.
- Built-in example tree + rules demonstrating every rule type (with first-match-correct
  ordering).
- Test suite: 102 Vitest tests incl. integration + inline snapshot of the example's final
  states.
- Documentation set under `docs/` and README; AI project memory (CLAUDE.md, HANDOFF.md,
  DECISIONS.md, ROADMAP.md, todo.md, `.claude/knowledge`, `.claude/skills`).
