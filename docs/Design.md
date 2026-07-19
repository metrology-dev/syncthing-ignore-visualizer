# Design language

## Goals

Teach by showing. Every visual choice should make the evaluation model — top-down,
first-match-wins — legible at a glance, in a Material 3-inspired, information-dense,
desktop-first layout.

## Layout

Three panels + a persistent timeline bar:

- **Folder Tree** (left, widest): the subject being explained.
- **.stignore editor** (center): the cause.
- **Explanation** (right): the narration; tabs switch between the current step and a
  selected file's history.
- **Timeline** (bottom, full width): the temporal control everything follows.

Under 1180 px the tree spans the top row; under 760 px everything stacks.

## Color system

Semantic state colors are the core vocabulary, identical in tree, chips, and legend:

| State | Light | Dark | Used for |
|---|---|---|---|
| Included | `#1e8e3e` | `#5bd97e` | kept/synced items |
| Ignored | `#d93025` | `#ff6b5e` | ignored items |
| Matched | `#b8860b` / `#f9ab00` | `#ffd257` | current-rule matches, flashes, current editor line |
| Neutral | `#7a7580` | `#8d8794` | dimmed/unaffected, comments |

Row fills use ~13% alpha variants so text contrast stays AA in both themes. Primary
(`#5d5591` / `#c9bfff`) is reserved for chrome: selection, folder icons, controls.

## Motion

CSS only. State changes cross-fade over 420 ms with a standard-decelerate curve; the
"decided this step" flash is a 700 ms keyframe. Motion always encodes meaning (state
changed here) and is fully disabled under `prefers-reduced-motion`.

## Typography

UI: system stack (Segoe UI/Roboto). Everything path- or pattern-shaped is monospace
(Cascadia/JetBrains/Consolas) — file names, rules, chips in lists — so patterns and the
paths they match read as the same alphabet.

## Accessibility

- Full keyboard support (timeline, search, zoom, editor, dialog) with visible focus rings.
- ARIA: panels are labeled regions; tabs, tree, tooltip and timeline controls carry roles
  and labels; live regions announce explanation/diagnostic updates.
- State is never color-only: the status dot + row tint pair with explicit chips
  ("included"/"ignored") in the explanation panel and tooltips.
