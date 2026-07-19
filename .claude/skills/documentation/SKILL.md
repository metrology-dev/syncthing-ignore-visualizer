---
name: documentation
description: How to keep this project's documentation and AI memory in sync after changes — which file owns which fact, and the update checklist per change type.
---

# Documentation & memory maintenance

## Ownership map (update the owner, link from elsewhere)

| Fact | Owner |
|---|---|
| Ignore semantics implemented | docs/Matcher.md |
| Parser/diagnostics behavior | docs/Parser.md |
| Import formats | docs/FolderParser.md |
| Rendering/editor internals | docs/Rendering.md |
| Timeline model | docs/Timeline.md |
| Test layout & manual checklist | docs/Testing.md |
| Visual language/a11y | docs/Design.md |
| Deviations from real Syncthing | docs/KnownLimitations.md |
| Decisions + rationale | DECISIONS.md (append-only ADRs) |
| Phases | ROADMAP.md · Tasks: todo.md · History: CHANGELOG.md |
| Stable AI facts | .claude/knowledge/* (no session notes there) |
| Session state | HANDOFF.md (overwrite each session) |

## Checklist by change type

- **Semantics change:** Matcher.md (+KnownLimitations if deviating), new ADR, tests note in
  Testing.md if suite shape changed, CHANGELOG entry, knowledge/matcher.md if the cheat
  sheet is affected.
- **New feature:** README usage table, relevant docs/ file, CHANGELOG, todo.md status,
  ROADMAP phase tick, HANDOFF.
- **Refactor:** Architecture.md diagram/table, knowledge/architecture.md, coverage exclude
  list in vite.config.ts if UI files were added/renamed.
- **End of every session:** rewrite HANDOFF.md (completed / status / next steps / context),
  update todo.md, add CHANGELOG entries for user-visible changes.

## Style

Concise, factual, present tense. Docs describe what IS; ideas go to FutureIdeas.md.
Cite Syncthing docs for semantic claims. Keep CLAUDE.md short — it is read every session.
