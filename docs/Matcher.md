# Matcher — Syncthing ignore semantics

This document records the exact semantics implemented by `glob.ts`, `matcher.ts` and
`history.ts`, and where they come from. Primary sources: the official
[ignoring documentation](https://docs.syncthing.net/users/ignoring.html) and Syncthing's
`lib/ignore/ignore.go` (which delegates glob matching to `gobwas/glob` with `/` as separator).

## Evaluation model: FIRST match wins

> "The *first* pattern that matches will decide the fate of a given file." — Syncthing docs

Rules are evaluated top-down; the first rule whose pattern matches a path decides whether it
is ignored (normal rule) or kept (`!` rule). Later matches are recorded as **shadowed** but
have no effect. Files matched by no rule default to **included**.

This is the single biggest difference from `.gitignore` (where the last match wins) and the
core teaching point of the visualizer.

## Glob syntax (glob.ts)

| Token | Meaning |
|---|---|
| `*` | any run of characters within one path component (never `/`) |
| `?` | one character, not `/` |
| `**` | any run of characters including `/` |
| `[a-z]`, `[!a-z]`, `[^a-z]` | character class / negated class |
| `{a,b}` | alternatives; may nest and contain wildcards |
| `\x` (Unix) / `\|x` (Windows) | escape: next character is literal |

Implementation: single-pass translation to an anchored RegExp (`^(?:…)$`). `*` → `[^/]*`,
`?` → `[^/]`, runs of 2+ stars → `.*`. Unterminated `[` or `{` is a compile error; the rule
is kept for display but never matches, and a diagnostic is emitted (Syncthing similarly
refuses invalid patterns).

## Pattern expansion (matcher.ts)

Mirrors `lib/ignore` exactly. For a parsed pattern `p`:

```
rooted (/p):        expand(p)
starts with **/:    expand(p) + expand(p minus "**/")
otherwise:          expand(p) + expand("**/" + p)

expand(x):
  x ends in "/**"   → [x]
  x ends in "/"     → [x + "**"]        (contents only)
  otherwise         → [x, x + "/**"]    (item itself + everything inside it)
```

Consequences, all verified by tests:

- `foo` matches `foo`, `subdir/foo`, and everything inside a matched directory.
- `/foo` matches only at the root (and its contents via `foo/**`).
- `cache/` ignores `cache/…` contents but **not** the `cache` directory itself, so the empty
  directory keeps syncing — straight from the docs' trailing-slash rule.
- `**/backup/` ignores contents of any `backup` directory at any depth, not the directory.

## Prefixes

`!` (negate → keep), `(?i)` (case-fold), `(?d)` (deletable). Parsed in any order, each at
most once; a repeated prefix character belongs to the pattern (matching Syncthing's
`seenPrefix` logic). `(?di)`-style combinations are **not** prefixes — Syncthing treats the
line as a literal pattern; we do the same and emit a warning diagnostic.

`(?d)` does not change ignore status: matches are still ignored, but flagged deletable so
Syncthing may remove them when they block directory deletion.

## Case sensitivity

Matching is case-sensitive by default on Linux, and **always case-insensitive on Windows and
macOS** (docs: "On Mac OS and Windows, patterns are always case-insensitive"). `(?i)` forces
insensitivity per rule on any platform. The UI's platform selector switches this.

## Escape characters

`\` on Unix; `|` on Windows (because `\` is the path separator — patterns containing `\` are
converted to `/` on Windows, mirroring `filepath.ToSlash`). A `#escape=<char>` directive on
the **first line** of a file overrides it, per file (included files need their own).

## Always-ignored internals

`.stfolder`, `.stignore`, `.stversions` (top-level only) and Syncthing temp files
(`~syncthing~*.tmp`, `.syncthing.*.tmp`, any depth) are ignored before patterns run.
A `.stignore` nested in a subdirectory is an ordinary file.

## Evaluation history (history.ts)

`evaluate(tree, ruleSet)` walks every node and every rule, recording per file:
`matched`, `applied` (first match), `stateAfter`; and per rule: `decided[]` + `shadowed[]`.
Timeline positions `0…n` are derived, not stored: position `p` means "rules `0…p-1` applied",
so `stateAtPosition(file, p)` is `finalState` iff `decidingRule < p`, else `included`.

Complexity: O(files × rules × variants) regex tests per full evaluation; scrubbing the
timeline is O(visible rows) class updates only.
