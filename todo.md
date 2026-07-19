# todo.md — prioritized task list

Statuses: `todo` | `in-progress` | `done` | `blocked`

## P1 — high value, near-term

| Task | Status | Depends on | Notes |
|---|---|---|---|
| Import a real `.stignore` file into the editor | todo | — | drop/pick straight into editor tab; parser unchanged |
| Rule statistics (matched/decided/shadowed per rule) | todo | — | data already in `EvaluationStep`; add panel section + dead-rule hint |
| CI workflow (test + build) | todo | — | GitHub Actions: npm ci, test, build |

## P2 — medium

| Task | Status | Depends on | Notes |
|---|---|---|---|
| SVG export of the tree view | todo | — | serialize `#tree-svg` + inline computed styles |
| PNG export | todo | SVG export | canvas draw of serialized SVG |
| JSON export of EvaluationResult | todo | — | plain data already; add download |
| Shareable URL state (rules+tree in fragment) | todo | — | compress (e.g. deflate+base64url) |
| What-if rule hover (preview matches without moving timeline) | todo | — | hover a rule line → temporary matched-now classes |

## P3 — later / bigger

| Task | Status | Depends on | Notes |
|---|---|---|---|
| Row virtualization for 10k+ trees | todo | — | render viewport window only; keep class-update model |
| Gitignore comparison mode (last-match-wins toggle) | todo | — | engine variant + UI toggle; strong teaching feature |
| Side-by-side rule-set comparison | todo | — | two rule sets, diff of final states |
| Guided tour of the built-in example | todo | — | scripted timeline + highlighted panels |
| Matcher benchmarking harness | todo | — | synthetic trees, perf regression tracking |

## Done (session 1, 2026-07-19)

- Research Syncthing semantics; document decisions — done
- Engine: glob/parser/matcher/tree/treeParser/history/timeline/explain — done
- UI: renderer/editor/explain panel/import dialog/theme/platform/tabs/shortcuts — done
- 102-test suite (unit/integration/snapshot) — done
- README + docs/ (10 files) — done
- AI memory structure (CLAUDE/HANDOFF/DECISIONS/ROADMAP/.claude) — done
