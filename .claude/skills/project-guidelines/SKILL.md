---
name: project-guidelines
description: Workflow for implementing any feature or fix in the Syncthing Ignore Pattern Visualizer — where code goes, what invariants to protect, and the definition of done.
---

# Implementing features in this project

## Before writing code

1. Read `CLAUDE.md` (short) — especially the first-match-wins invariant.
2. Locate the change: engine (`glob/parser/matcher/tree/treeParser/history/timeline/
   explain`) or UI (`renderer/editor/explainPanel/importDialog/ui/app`). Engine code must
   stay DOM-free.
3. If the change touches matching semantics, check docs/Matcher.md and the Syncthing docs
   first; never guess semantics — real Syncthing behavior wins over intuition.

## While implementing

- Add types to `types.ts` if shared; keep files <400 lines; no new runtime dependencies.
- Follow `.claude/knowledge/coding-standards.md` (strict TS patterns, immutability,
  conditional spread for optional props).
- Engine change → write the test first in `tests/<module>.test.ts`, prefer examples from
  the Syncthing docs.
- UI change → keep the class-toggle update model in the renderer (no DOM rebuilds on
  timeline changes); reuse design tokens, both themes, reduced-motion.

## Definition of done

1. `npm test` green (add/adjust tests; update the integration snapshot only deliberately).
2. `npm run build` green (strict tsc + vite).
3. UI touched → run the manual checklist in docs/Testing.md via `npm run dev`.
4. Semantics decided under ambiguity → record in docs/KnownLimitations.md + DECISIONS.md.
5. Update memory: HANDOFF.md (session summary), todo.md (status), CHANGELOG.md (if
   user-visible), ROADMAP.md (if a phase item completed).
