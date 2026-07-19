# Timeline

`timeline.ts` is a small playback state machine, deliberately decoupled from evaluation.

## Positions

For `n` rules there are `n + 1` positions:

- **0** — initial state, nothing applied, everything included.
- **p** — rules `0 … p-1` have been applied.
- **n** — final state.

Position is *view state only*: evaluation always runs to completion (`history.ts`), and the
renderer derives what to show via `stateAtPosition` / `matchedAtPosition`. This makes
scrubbing O(rows) and keeps play/pause trivially interruptible.

## API

`next / previous / reset / jumpToFinal / seek(p)` — all pause playback first.
`play()` advances one step per tick (default 1100 ms) and stops at the end; playing from the
end restarts at 0. `toggle()` flips play/pause. `setRuleCount(n)` clamps the position when
the rule list changes (e.g. while typing in the editor).

Listeners subscribe with `onChange((state) => …)`; state is `{ position, ruleCount,
playing }`. The UI bar (`ui.ts` → `TimelineBar`) renders buttons, the range slider, and the
current rule text; `app.ts` fans updates out to the renderer, editor (current-line
highlight) and explanation panel.

## What a step shows

At position `p > 0`, rule `p-1` is "current": nodes it matches get `matched-now` (yellow),
nodes it *decided* (their first match) also get `decided-now` (flash) and transition
green↔red; every other node is dimmed. The explanation panel lists newly ignored / kept /
shadowed paths for exactly this step.
