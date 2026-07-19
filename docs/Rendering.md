# Rendering

## Folder tree (renderer.ts)

The tree is rendered as SVG: one `<g class="node">` row per visible node containing a
background rect (state tint), a caret (directories), a folder/file icon, the name text and a
status dot. Rows are laid out top-to-bottom (`ROW_HEIGHT` = 26 px) with 18 px indent per
depth level.

### Update strategy

- **Structural changes** (new tree, expand/collapse, search) rebuild the row list.
- **Timeline changes** only toggle CSS classes (`included`, `ignored`, `matched-now`,
  `decided-now`, `dimmed`, `internal`, `deletable`) on existing groups — no DOM creation —
  so scrubbing stays smooth on large trees.
- State colors/opacities transition via CSS (`--transition-state`, 420 ms); the
  "decided this step" flash is a CSS keyframe animation.

### Class semantics (matches the legend)

| Class | Meaning |
|---|---|
| `included` / `ignored` | state at the current timeline position |
| `matched-now` | the rule at this step matches the node (yellow outline) |
| `decided-now` | this step's rule is the node's first match (flash) |
| `dimmed` | unaffected by the current step (position > 0) |
| `deletable` | decided by a `(?d)` rule (ring on the status dot) |
| `internal` | Syncthing internal file (italic) |

### Zoom, search, large trees

Zoom (0.4–2.5×) scales the SVG's CSS size against a fixed viewBox; buttons, `+`/`-` keys and
`Ctrl`+wheel drive it; *Fit* matches the panel width. Search filters rows to matches plus
ancestors and highlights the matched substring with a `<tspan>`. Trees above 600 nodes start
with only the top level expanded to keep the first render light.

## Editor (editor.ts)

Classic overlay editor: a transparent `<textarea>` (input, caret, selection) stacked on a
`<pre>` with tokenized HTML (colors), plus a gutter with line numbers, diagnostic dots and
current-rule markers. Scroll positions are synced manually.

Tokens: comments, `#include`/`#escape=` directives, prefixes (`!`, `(?i)`, `(?d)`), root and
trailing `/`, wildcards (`* ? [ ] { } ,`), and escape pairs. The current rule (from the
timeline) gets a full-line highlight in both gutter and text.

Autocomplete is intentionally minimal: typing `(` or `(?` offers the two prefixes; a leading
`#` offers the two directives. Arrow keys/Enter/Tab/Escape or mouse to use.

## Theming

Two token sets on `:root` (`data-theme="light" | "dark"`), Material 3-inspired: surfaces,
outline, primary, and four state colors with translucent `-bg` variants used for row tints.
The toggle persists to `localStorage` and defaults to `prefers-color-scheme`. All animations
respect `prefers-reduced-motion`.
