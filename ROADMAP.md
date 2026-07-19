# ROADMAP.md

## Phase 1 — Core matcher ✅ (done, 2026-07-19)

Faithful Syncthing ignore engine: glob, parser (includes/escapes/prefixes/diagnostics),
first-match-wins matcher with lib/ignore expansion, evaluation history. Fully unit-tested.

## Phase 2 — Visualization ✅ (done, 2026-07-19)

SVG folder tree with state colors/legend, `.stignore` editor with highlighting +
diagnostics, explanation panel, file detail history, search, zoom, themes.

## Phase 3 — Animation & playback ✅ (done, 2026-07-19)

Timeline (play/pause/step/scrub/jump), per-step flashes and dimming, shadowed-match
storytelling, current-rule highlight in the editor.

## Phase 4 — Import/Export ◐ (import done)

- ✅ Import: Windows `tree /F`, Unix `tree`, path lists (paste/drop/file, preview,
  warnings).
- ☐ Import real `.stignore` files directly.
- ☐ Export: SVG, PNG, JSON evaluation report.
- ☐ Shareable URL state.

## Phase 5 — Advanced educational features ☐

- Rule statistics + dead-rule detection.
- What-if hover previews.
- Gitignore comparison mode (last-match-wins toggle).
- Side-by-side rule-set comparison; guided tour.
- Virtualized rendering + benchmarking for very large trees.

Details and effort notes: docs/FutureIdeas.md · Current tasks: todo.md
