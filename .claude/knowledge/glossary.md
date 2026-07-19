# Glossary

- **Rule** — one effective pattern line after parsing (`ParsedRule`); comments/blank lines
  are not rules. Rules keep a global evaluation `index` across includes.
- **Prefix** — `!` (negate/keep), `(?i)` (case-insensitive), `(?d)` (deletable).
- **Rooted** — pattern starting `/`: matches relative to the folder root only.
- **Contents-only** — pattern ending `/`: matches a directory's contents, not the dir.
- **Variant** — one expanded glob a rule compiles to (e.g. `foo` → 4 variants). The
  matching variant is reported in `MatchResult.variant`.
- **Deciding rule** — the first rule matching a file; fixes its final state.
- **Shadowed match** — a rule matches a file that an earlier rule already decided; shown
  in yellow lists to teach first-match-wins.
- **Position** — timeline value 0…n; position p = "rules 0…p−1 applied". Position 0 =
  initial state (everything included).
- **Step** — what one rule did: `decided[]` + `shadowed[]` paths (`EvaluationStep`).
- **Internal file** — always-ignored Syncthing file (`.stfolder`, `.stignore`,
  `.stversions` at root; temp files anywhere).
- **Platform preset** — linux/macos/windows; controls default case sensitivity and escape
  character (`\` vs `|`).
- **Deletable** — ignored by a `(?d)` rule; Syncthing may delete it to allow directory
  removal.
