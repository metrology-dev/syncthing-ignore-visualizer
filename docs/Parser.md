# Parser

`parser.ts` turns a set of ignore files (`Map<fileName, content>`, rooted at `.stignore`)
into an ordered rule list, diagnostics, and per-line classifications for the editor.

## Line handling

Per file, in order:

1. Lines are trimmed (docs: leading/trailing spaces are trimmed; inner spaces are literal).
2. Empty lines → `blank`; lines starting `//` → `comment`.
3. `#escape=<char>` → sets the file's escape character. Only valid as the first effective
   line; exactly one character; otherwise an error diagnostic.
4. `#include <file>` → recursively parses the named file, **inlining its rules at the
   directive's position** (evaluation order is depth-first, as in Syncthing). Errors:
   missing target ("folder stops with an error" in real Syncthing), duplicate include,
   include cycles.
5. Other lines starting with `#` are *patterns*, not comments — a warning diagnostic points
   the user to `//`.
6. Everything else → a rule line.

## Rule line parsing

1. On the Windows platform preset, backslashes are converted to `/` (mirrors
   `filepath.ToSlash`) with an info diagnostic.
2. Prefixes `!`, `(?i)`, `(?d)` are consumed in any order, each at most once.
   `(?xy)`-style groups after prefix parsing trigger a "cannot combine prefixes" warning
   (the line still becomes a literal pattern, as in Syncthing).
3. A leading `/` sets `rooted`; a trailing `/` sets `contentsOnly`.
4. The pattern is validated through the glob compiler; syntax errors produce an error
   diagnostic and an inert rule (kept so line numbering and the timeline stay stable).

## Diagnostics

Severities: `error` (rule/directive is broken), `warning` (probably a mistake), `info`
(educational nudge). Notable advisories:

- `*` / `**` alone: "ignores everything".
- `(?d)` on a negated pattern: no effect.
- Non-rooted negations: force scanning inside ignored directories (performance note from
  the docs).

Diagnostics carry `source` + 1-based `line`, so the UI can jump to the offending line even
inside include files.

## Output

- `rules: ParsedRule[]` — global evaluation order across all files (`index` is the order).
- `diagnostics: Diagnostic[]`.
- `lines: Map<file, LineInfo[]>` — per-line kind (`blank | comment | rule | include |
  escape | invalid`) plus the rule index for rule lines; drives editor highlighting and
  current-rule tracking.
