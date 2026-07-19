# UI (stable facts)

- Layout: 3-panel grid (tree | editor | explanation) + full-width timeline bar; responsive
  breakpoints at 1180 px and 760 px. Material 3-inspired tokens in `styles/base.css`
  (`:root` + `:root[data-theme='dark']`), theme persisted in localStorage key
  `stignore-viz-theme`.
- State colors are semantic and shared everywhere (tree, chips, legend): included green,
  ignored red, matched yellow, unaffected dimmed. Never encode state by color alone —
  status dot + text chips accompany it.
- Tree renderer: one SVG `<g class="node">` per visible row; ROW_HEIGHT 26, INDENT 18.
  Structural changes rebuild rows; timeline changes toggle classes only
  (`included/ignored/matched-now/decided-now/dimmed/internal/deletable`). Auto-collapse to
  depth 1 above 600 nodes. Zoom = CSS-size scaling vs fixed viewBox (0.4–2.5×).
- Editor: transparent textarea over highlighted `<pre>` + gutter; scroll sync is manual —
  keep all three aligned. Line metadata comes from `ParseResult.lines` per file tab.
- Keyboard: ←/→ step, Space play, Home/End, `/` search, +/- zoom, Ctrl+wheel zoom.
- app.ts owns: files map (`.stignore` + include tabs), platform, tree, selection, timeline.
