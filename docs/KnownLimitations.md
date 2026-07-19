# Known limitations & documented decisions

This tool aims to reproduce Syncthing's matcher behavior faithfully, but it is a teaching
model, not the real scanner. Differences and judgment calls are recorded here.

## Deliberate deviations / interpretations

1. **The project brief's example rule order was corrected.** The brief showed
   `*.tmp` … `!important.tmp` and expected `important.tmp` to survive — that is `.gitignore`
   (last-match) thinking. Real Syncthing applies the **first** matching rule, so the
   built-in example places `!important.tmp` *before* `*.tmp`, and the old ordering is shown
   as a teaching moment (the negation appears as "shadowed"). See DECISIONS.md (ADR-002).
2. **`images/.DS_Store` was added to the brief's example tree** so the `(?d).DS_Store` rule
   visibly matches something.
3. **Rules with glob syntax errors** are kept in the rule list (inert, with an error
   diagnostic) instead of aborting the whole file. Real Syncthing refuses to load the folder
   until the file parses; stopping everything would make the sandbox unusable while typing.
4. **Missing `#include` targets** produce an error diagnostic; evaluation continues with the
   remaining rules. Real Syncthing stops the folder with an error (the diagnostic says so).
5. **`#include` resolution is by exact name** within the app's virtual file tabs; real
   Syncthing resolves relative to the including file's directory on disk.
6. **Internal files**: `.stfolder`, `.stignore`, `.stversions` are treated as internal only
   at the folder root; temp-file patterns (`~syncthing~*.tmp`, `.syncthing.*.tmp`) at any
   depth. Versioning paths configured elsewhere are not modeled.

## Modeling limits (matcher vs. real scanner)

- **Per-path matching only.** The real scanner walks the filesystem and may skip entire
  ignored directories (unless negations force traversal). The matcher here evaluates every
  path independently — which is exactly what Syncthing's `Matcher.Match` does — so results
  agree, but scan-performance effects are only *described* (info diagnostics, callouts), not
  simulated.
- **A kept file inside an ignored directory** is shown as included (matching `Match`
  semantics) with a callout explaining that Syncthing recreates parent directories and what
  it costs. Edge cases around deleting-then-recreating such directories are not modeled.
- **`(?d)`** is shown as a flag on ignored files; the actual deletion behavior (only when
  blocking directory removal) is explained in text, not simulated.
- **No filesystem watching, versioning, or sync conflicts** — out of scope.

## Glob-level notes

- `gobwas/glob` quirks are matched for the documented cases (see tests), but exotic corners
  (e.g. `[` ranges that include `/`, pathological nested braces) may differ; character
  classes here never match `/` implicitly only if the range excludes it — same as gobwas.
- Trailing escape characters are treated as a literal escape char (gobwas behavior).
- `#escape=` accepts any single character; real Syncthing is effectively limited to `\` and
  `|` in practice. A diagnostic hints at the convention but the parser is permissive.

## UI limits

- Very large trees (≫ 5–10k nodes) render fully (no virtualization yet); initial render
  auto-collapses to the top level above 600 nodes. See FutureIdeas.md.
- The editor is a plain textarea overlay: no multi-cursor, no undo grouping beyond the
  browser's native behavior.
- Search filters the tree by substring on names (not full paths, not regex).
