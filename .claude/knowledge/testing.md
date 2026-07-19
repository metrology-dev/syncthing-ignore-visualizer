# Testing strategy (stable facts)

- Vitest, node environment, tests in `tests/*.test.ts` mirroring engine module names.
  `npm test` must pass before any hand-off.
- Coverage measured for engine only (UI excluded in vite.config.ts); target ≥80% on engine
  lines.
- Style: docs-derived examples (te*ne, te??st, {banana,pineapple}…), AAA structure,
  descriptive names stating behavior. Integration tests exercise
  parse→compile→evaluate on the built-in example, including an inline snapshot of every
  file's final state — update it deliberately, never blindly.
- The first-match-wins counterexample test (`negation AFTER an ignore rule is shadowed`)
  is the semantic anchor of the project; if it starts failing, the engine is wrong, not
  the test.
- UI verification is a manual checklist in docs/Testing.md (load example, step through,
  edit rules, break a rule, import tree, themes, shortcuts).
