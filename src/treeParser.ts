/**
 * Folder-structure importer. Understands three text formats:
 *
 *  1. Windows `tree /F` output (Unicode `├───` / ASCII `+---` graphics)
 *  2. Unix/macOS `tree` output (`├── name`, `└── name`)
 *  3. Plain path lists, one relative path per line (e.g. `find` output)
 *
 * Returns a tree plus human-readable warnings for lines it could not place.
 */

import { buildTree, type TreeEntry } from './tree';
import type { TreeNode } from './types';

export interface ImportResult {
  root: TreeNode;
  entries: TreeEntry[];
  warnings: string[];
  format: 'windows-tree' | 'unix-tree' | 'path-list';
}

const WINDOWS_MARKER = /(?:[├└+\\])[─-]{3}/;
const UNIX_MARKER = /(?:[├└`|+])[─-]{2} /;

export function parseFolderText(text: string): ImportResult {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.some((l) => WINDOWS_MARKER.test(l))) return parseWindowsTree(lines);
  if (lines.some((l) => UNIX_MARKER.test(l))) return parseUnixTree(lines);
  return parsePathList(lines);
}

/**
 * Windows `tree /F`: every nesting level is exactly 4 columns wide.
 * Directories appear as `├───name` / `└───name`; files are listed beneath
 * their directory, indented with `│   ` / spaces.
 */
function parseWindowsTree(lines: string[]): ImportResult {
  const entries: TreeEntry[] = [];
  const warnings: string[] = [];
  // dirStack[d] = path of the directory at depth d (0 = imported root).
  const dirStack: string[] = [''];

  for (const [i, rawLine] of lines.entries()) {
    const line = rawLine.replace(/\s+$/, '');
    if (line === '' || /^[│|\s]+$/.test(line)) continue;
    if (/^(Folder PATH listing|Volume serial number)/i.test(line)) continue;
    if (/^[A-Za-z]:\.?$/.test(line.trim()) || line.trim() === '.') continue;

    const dirMatch = line.match(/^((?:[│| ]   )*)[├└+\\][─-]{3}(.+)$/);
    if (dirMatch !== null) {
      const depth = (dirMatch[1] as string).length / 4 + 1;
      const name = (dirMatch[2] as string).trim();
      const parent = dirStack[depth - 1];
      if (parent === undefined || name === '') {
        warnings.push(`line ${i + 1}: cannot place directory "${line.trim()}"`);
        continue;
      }
      const path = parent === '' ? name : `${parent}/${name}`;
      entries.push({ path, isDir: true });
      dirStack.length = depth;
      dirStack.push(path);
      continue;
    }

    const fileMatch = line.match(/^((?:[│| ]   |    )*)(\S.*)$/);
    if (fileMatch !== null && (fileMatch[1] as string).length % 4 === 0) {
      const depth = (fileMatch[1] as string).length / 4;
      const name = (fileMatch[2] as string).trim();
      const parent = dirStack[depth - 1];
      if (parent === undefined) {
        warnings.push(`line ${i + 1}: cannot place file "${name}" (unexpected indentation)`);
        continue;
      }
      entries.push({ path: parent === '' ? name : `${parent}/${name}`, isDir: false });
      continue;
    }

    warnings.push(`line ${i + 1}: unrecognized tree line "${line.trim()}"`);
  }

  return finishImport(entries, warnings, 'windows-tree');
}

/**
 * Unix `tree`: entries appear as `├── name` / `└── name` with `│   ` or
 * 4-space continuation prefixes. Directories are detected either by a
 * trailing `/` (tree -F) or by having children on the following lines.
 */
function parseUnixTree(lines: string[]): ImportResult {
  interface Row {
    depth: number;
    name: string;
    explicitDir: boolean;
    lineNo: number;
  }
  const rows: Row[] = [];
  const warnings: string[] = [];

  for (const [i, rawLine] of lines.entries()) {
    const line = rawLine.replace(/\s+$/, '');
    if (line === '' || line.trim() === '.' || /^[│|\s]+$/.test(line)) continue;
    if (/^\d+ director(y|ies)(, \d+ files?)?$/.test(line.trim())) continue;

    const m = line.match(/^((?:[│| ]   |    )*)[├└`|+][─-]{2} (.+)$/);
    if (m === null) {
      warnings.push(`line ${i + 1}: unrecognized tree line "${line.trim()}"`);
      continue;
    }
    const depth = (m[1] as string).length / 4 + 1;
    let name = (m[2] as string).trim();
    // `tree -F` decorations: strip symlink arrows and classification suffixes.
    name = name.replace(/ -> .*$/, '');
    const explicitDir = name.endsWith('/');
    if (explicitDir) name = name.slice(0, -1);
    rows.push({ depth, name, explicitDir, lineNo: i + 1 });
  }

  const entries: TreeEntry[] = [];
  const dirStack: string[] = [''];
  rows.forEach((row, idx) => {
    const parent = dirStack[row.depth - 1];
    if (parent === undefined || row.name === '') {
      warnings.push(`line ${row.lineNo}: cannot place "${row.name}" (unexpected indentation)`);
      return;
    }
    const path = parent === '' ? row.name : `${parent}/${row.name}`;
    const next = rows[idx + 1];
    const isDir = row.explicitDir || (next !== undefined && next.depth > row.depth);
    entries.push({ path, isDir });
    dirStack.length = row.depth;
    if (isDir) dirStack.push(path);
  });

  return finishImport(entries, warnings, 'unix-tree');
}

/** Plain list of relative paths; a trailing `/` marks an explicit directory. */
function parsePathList(lines: string[]): ImportResult {
  const entries: TreeEntry[] = [];
  const warnings: string[] = [];
  for (const [i, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (line === '' || line === '.' || line.startsWith('#')) continue;
    const normalized = line.replaceAll('\\', '/').replace(/^\.?\//, '');
    const isDir = normalized.endsWith('/');
    const path = isDir ? normalized.replace(/\/+$/, '') : normalized;
    if (path === '' || path.split('/').some((part) => part === '' || part === '..')) {
      warnings.push(`line ${i + 1}: invalid path "${line}"`);
      continue;
    }
    entries.push({ path, isDir });
  }
  return finishImport(entries, warnings, 'path-list');
}

function finishImport(
  entries: TreeEntry[],
  warnings: string[],
  format: ImportResult['format'],
): ImportResult {
  if (entries.length === 0) {
    warnings.push('no files or folders could be parsed from the input');
  }
  return { root: buildTree(entries), entries, warnings, format };
}
