# Folder importer

`treeParser.ts` converts pasted/dropped text into the internal tree. Format detection is
automatic, in this order:

## 1. Windows `tree /F`

Detected by `├───` / `└───` (or ASCII `+---` / `\---` from `tree /A /F`). The format is
column-based: every nesting level is exactly 4 columns.

- Header lines (`Folder PATH listing`, `Volume serial number`, `C:.`) are skipped.
- Directory lines: `(prefix)[├└+\]───name` → depth = prefix/4 + 1; pushed on a depth-indexed
  directory stack.
- File lines: `(prefix)name` where the prefix is `│   `/4-space groups → parent is
  `stack[prefix/4 − 1]`.
- Pure-graphics lines (`│`) are skipped; anything unplaceable produces a warning with its
  line number.

## 2. Unix/macOS `tree`

Detected by `├── ` / `└── `. Entries are `(prefix)[├└]── name` with `│   `/4-space
continuation groups. Directories are recognized by a trailing `/` (from `tree -F`) **or** by
having children on following lines; symlink arrows (`-> target`) are stripped; the trailing
`N directories, M files` report line is skipped.

## 3. Plain path list

Fallback: one relative path per line (`find`-style). `\` and `/` separators both work,
leading `./` is stripped, a trailing `/` marks explicit directories. `..` segments and empty
segments are rejected with warnings.

## Output & error reporting

All formats produce `TreeEntry { path, isDir }[]`; `buildTree` creates implicit parents,
deduplicates, upgrades files to directories if children appear, and sorts
directories-first/natural order. The result includes the detected `format` and a `warnings`
list; the import dialog shows a live preview ("Detected Windows tree /F: 12 files,
4 folders.") and the first 20 warnings before the user applies anything. Malformed input
never throws — worst case is an empty tree plus warnings.
