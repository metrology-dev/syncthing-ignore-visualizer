import { describe, expect, it } from 'vitest';
import { buildTree, countNodes, defaultTree, findNode, flattenTree } from '../src/tree';

describe('buildTree', () => {
  it('creates implicit parent directories', () => {
    const root = buildTree([{ path: 'a/b/c.txt', isDir: false }]);
    const flat = flattenTree(root).map((n) => `${n.path}${n.isDir ? '/' : ''}`);
    expect(flat).toEqual(['a/', 'a/b/', 'a/b/c.txt']);
  });

  it('sorts directories before files, names naturally', () => {
    const root = buildTree([
      { path: 'z.txt', isDir: false },
      { path: 'file10.txt', isDir: false },
      { path: 'file2.txt', isDir: false },
      { path: 'alpha', isDir: true },
    ]);
    expect(root.children.map((n) => n.name)).toEqual(['alpha', 'file2.txt', 'file10.txt', 'z.txt']);
  });

  it('upgrades a file entry to a directory when children appear', () => {
    const root = buildTree([
      { path: 'thing', isDir: false },
      { path: 'thing/child.txt', isDir: false },
    ]);
    expect(root.children[0]?.isDir).toBe(true);
  });

  it('deduplicates repeated entries', () => {
    const root = buildTree([
      { path: 'a/b.txt', isDir: false },
      { path: 'a/b.txt', isDir: false },
    ]);
    expect(countNodes(root)).toEqual({ files: 1, dirs: 1 });
  });
});

describe('defaultTree', () => {
  it('contains the documented example structure', () => {
    const root = defaultTree();
    expect(findNode(root, 'cache/index.db')).toBeDefined();
    expect(findNode(root, 'backup/old/archive.zip')).toBeDefined();
    expect(findNode(root, 'build')?.isDir).toBe(true);
    expect(countNodes(root)).toEqual({ files: 15, dirs: 6 });
  });
});
