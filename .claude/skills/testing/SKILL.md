---
name: testing
description: How to write and run tests for the visualizer — suite layout, conventions, snapshot policy, and the manual UI checklist.
---

# Testing workflow

## Commands

```bash
npm test            # full suite, must be green before hand-off
npm run test:watch  # during development
npm run coverage    # engine coverage (UI excluded by config)
```

## Writing engine tests

- File per module: `tests/<module>.test.ts`. Node environment — never import DOM there.
- AAA structure; test names state behavior ("rooted patterns do not match in
  subdirectories").
- Prefer canonical examples from https://docs.syncthing.net/users/ignoring.html
  (`te*ne`, `te??st`, `{banana,pineapple}`, `/foo`, trailing slash…).
- Cover both polarities: what matches AND what must not match.
- New rule-type behavior → also add a case to `tests/integration.test.ts` and, if final
  states change, update the inline snapshot **by hand-verifying every changed line**.

## Semantic anchors — do not "fix" these tests

- `matcher.test.ts` → "negation AFTER an ignore rule is shadowed (unlike .gitignore)".
- `integration.test.ts` → built-in example snapshot (ADR-002 ordering).
If they fail, the engine regressed.

## Manual UI checklist (after UI changes)

`npm run dev`, then: load example → step through all 7 rules watching flashes/dimming →
click `important.tmp` (file history shows kept-then-shadowed) → break a rule (`file[0-9`)
and check diagnostics → import a `tree /F` sample → toggle theme → platform to Windows
(README.md ignored without `(?i)`) → keyboard shortcuts (←/→, Space, /, +/-).
