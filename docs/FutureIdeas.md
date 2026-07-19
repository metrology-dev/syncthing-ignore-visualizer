# Future ideas

Roughly ordered by value/effort. The architecture was designed so all of these slot in
without core rewrites (engine is pure and serializable; renderer updates are incremental).

## Export & sharing

- **SVG export** — serialize `#tree-svg` with inlined computed styles.
- **PNG export** — draw the serialized SVG to a canvas.
- **JSON export** — `EvaluationResult` is already plain data; add a download button.
- **Evaluation report** — printable HTML/Markdown: per-rule stats + per-file decisions.
- **Shareable URLs** — compress rules + tree into the URL fragment for one-click sharing.

## Import

- **Real `.stignore` import** — file picker/drop directly into the editor (trivial).
- **Directory picker import** — `showDirectoryPicker()` / `webkitdirectory` to read a real
  folder structure client-side.
- **`syncthing cli` output / REST snapshots** — import ignores + file lists from a running
  instance.

## Education & analysis

- **Rule statistics** — per rule: matched / decided / shadowed counts; dead-rule detection
  ("this rule never decides anything — everything it matches is already decided").
- **Side-by-side rule comparison** — two rule sets, same tree, diffed final states.
- **Gitignore mode** — toggle last-match-wins to contrast the two models interactively.
- **Guided tour** — scripted walkthrough of the built-in example.
- **What-if hover** — hover a rule to preview its matches without moving the timeline.

## Performance

- **Row virtualization** for 10k+ node trees (render only the scrolled viewport).
- **Matcher benchmarking harness** — time evaluate() on synthetic trees; regression-track.
- **Incremental re-evaluation** — only re-run files whose first `k` rule matches changed.

## Multiple views

- **Synchronized views** — e.g. tree + flat list + sunburst sharing selection/timeline.
- **Mini-map** of the tree for orientation at high zoom.
