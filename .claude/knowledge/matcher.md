# Matcher semantics (stable facts)

Authoritative doc: docs/Matcher.md. The essentials:

- FIRST match wins, top-down. Unmatched files default to included.
- Expansion (mirrors Syncthing lib/ignore):
  - `foo` → `foo`, `foo/**`, `**/foo`, `**/foo/**`
  - `/foo` → `foo`, `foo/**` (rooted)
  - `**/foo` → itself (+`/**`) plus root variants without `**/`
  - `foo/` → `foo/**` variants only (contents, not the dir itself)
- `*`/`?` never match `/`; `**` does; `[a-z]`/`[!a-z]`; `{a,b}` may nest.
- Prefixes `!`, `(?i)`, `(?d)` — any order, once each; `(?di)` = literal pattern + warning.
- Comments `//`; a bare `#` line is a pattern (warn). `#include` inlines at position;
  `#escape=` first line, per file. Escape char: `\` Unix, `|` Windows (patterns'
  backslashes become `/` on Windows).
- Case-insensitive ALWAYS on Windows/macOS presets; `(?i)` per rule elsewhere.
- Always ignored: root `.stfolder`/`.stignore`/`.stversions`; `~syncthing~*.tmp` /
  `.syncthing.*.tmp` at any depth. Nested `.stignore` files are ordinary files.
- Invalid globs: rule kept but inert + error diagnostic (ADR-004).
