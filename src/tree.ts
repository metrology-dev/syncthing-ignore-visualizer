/**
 * Immutable folder-tree model plus helpers to build trees from path lists.
 */

import { compareNames } from './utils';
import type { TreeNode } from './types';

export interface TreeEntry {
  /** '/'-separated relative path, no leading or trailing slash. */
  path: string;
  isDir: boolean;
}

/**
 * Build a tree from entries. Parent directories are created implicitly.
 * Children are sorted directories-first, then by natural name order.
 */
export function buildTree(entries: readonly TreeEntry[]): TreeNode {
  interface MutableNode {
    name: string;
    path: string;
    isDir: boolean;
    children: Map<string, MutableNode>;
  }
  const root: MutableNode = { name: '', path: '', isDir: true, children: new Map() };

  for (const entry of entries) {
    const parts = entry.path.split('/').filter((p) => p !== '');
    let node = root;
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const childPath = node.path === '' ? part : `${node.path}/${part}`;
      let child = node.children.get(part);
      if (child === undefined) {
        child = {
          name: part,
          path: childPath,
          isDir: isLast ? entry.isDir : true,
          children: new Map(),
        };
        node.children.set(part, child);
      } else if (!isLast || entry.isDir) {
        // Anything that has children (or is re-declared as one) is a directory.
        child.isDir = true;
      }
      node = child;
    });
  }

  const freeze = (node: MutableNode): TreeNode => {
    const children = [...node.children.values()]
      .sort((a, b) => Number(b.isDir) - Number(a.isDir) || compareNames(a.name, b.name))
      .map(freeze);
    return { name: node.name, path: node.path, isDir: node.isDir, children };
  };
  return freeze(root);
}

/** All nodes in depth-first order, excluding the root itself. */
export function flattenTree(root: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  const visit = (node: TreeNode): void => {
    for (const child of node.children) {
      out.push(child);
      visit(child);
    }
  };
  visit(root);
  return out;
}

export function countNodes(root: TreeNode): { files: number; dirs: number } {
  let files = 0;
  let dirs = 0;
  for (const node of flattenTree(root)) {
    if (node.isDir) dirs += 1;
    else files += 1;
  }
  return { files, dirs };
}

export function findNode(root: TreeNode, path: string): TreeNode | undefined {
  if (path === '') return root;
  return flattenTree(root).find((n) => n.path === path);
}

/** The built-in demonstration tree from the project brief (plus .DS_Store). */
export function defaultTree(): TreeNode {
  return buildTree([
    { path: 'notes.txt', isDir: false },
    { path: 'report.docx', isDir: false },
    { path: 'README.md', isDir: false },
    { path: 'important.tmp', isDir: false },
    { path: 'temp.tmp', isDir: false },
    { path: 'cache/index.db', isDir: false },
    { path: 'cache/temp.dat', isDir: false },
    { path: 'build/app.exe', isDir: false },
    { path: 'build/app.pdb', isDir: false },
    { path: 'src/main.ts', isDir: false },
    { path: 'src/utils.ts', isDir: false },
    { path: 'images/logo.png', isDir: false },
    { path: 'images/background.jpg', isDir: false },
    { path: 'images/.DS_Store', isDir: false },
    { path: 'backup/old/archive.zip', isDir: false },
  ]);
}

/**
 * The built-in demonstration rules. Order matters: Syncthing applies the
 * FIRST matching rule, so the negation for `important.tmp` must come before
 * the general `*.tmp` rule (unlike .gitignore, where later rules win).
 */
export const DEFAULT_RULES = `// Syncthing evaluates rules top-down: the FIRST match wins.
// Keep important.tmp — this must come BEFORE *.tmp to have any effect.
!important.tmp

// Ignore all other .tmp files, anywhere in the tree.
*.tmp

// Trailing slash: ignore the CONTENTS of cache/, but sync the folder itself.
cache/

// No trailing slash: ignore the build folder and everything in it.
build

// ** crosses folder boundaries: any backup directory's contents, at any depth.
**/backup/

// (?d): still ignored, but Syncthing may delete it to remove its directory.
(?d).DS_Store

// (?i): case-insensitive — matches README.md, readme.MD, Readme.md, ...
(?i)readme.md
`;
