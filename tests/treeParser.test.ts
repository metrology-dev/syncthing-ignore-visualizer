import { describe, expect, it } from 'vitest';
import { parseFolderText } from '../src/treeParser';
import { flattenTree } from '../src/tree';

function paths(text: string): string[] {
  return flattenTree(parseFolderText(text).root).map((n) => `${n.path}${n.isDir ? '/' : ''}`);
}

describe('parseFolderText — Windows tree /F', () => {
  const sample = [
    'Folder PATH listing',
    'Volume serial number is 0000-0000',
    'C:.',
    '│   notes.txt',
    '│   README.md',
    '│',
    '├───cache',
    '│       index.db',
    '│',
    '├───src',
    '│   │   main.ts',
    '│   │',
    '│   └───nested',
    '│           deep.txt',
    '│',
    '└───build',
    '        app.exe',
  ].join('\r\n');

  it('detects the format and parses the hierarchy', () => {
    const result = parseFolderText(sample);
    expect(result.format).toBe('windows-tree');
    expect(result.warnings).toEqual([]);
    expect(paths(sample)).toEqual([
      'build/',
      'build/app.exe',
      'cache/',
      'cache/index.db',
      'src/',
      'src/nested/',
      'src/nested/deep.txt',
      'src/main.ts',
      'notes.txt',
      'README.md',
    ]);
  });

  it('handles ASCII graphics from tree /A /F', () => {
    const ascii = ['C:.', '|   root.txt', '|', '+---sub', '|       file.txt', '\\---last', '        end.txt'].join(
      '\n',
    );
    const result = parseFolderText(ascii);
    expect(result.format).toBe('windows-tree');
    expect(paths(ascii)).toEqual(['last/', 'last/end.txt', 'sub/', 'sub/file.txt', 'root.txt']);
  });

  it('warns about lines it cannot place', () => {
    const bad = ['C:.', '├───ok', '      strange-indent.txt'].join('\n');
    const result = parseFolderText(bad);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('parseFolderText — Unix tree', () => {
  const sample = [
    '.',
    '├── notes.txt',
    '├── cache',
    '│   └── index.db',
    '└── src',
    '    ├── main.ts',
    '    └── nested',
    '        └── deep.txt',
    '',
    '3 directories, 4 files',
  ].join('\n');

  it('detects the format and infers directories from children', () => {
    const result = parseFolderText(sample);
    expect(result.format).toBe('unix-tree');
    expect(result.warnings).toEqual([]);
    expect(paths(sample)).toEqual([
      'cache/',
      'cache/index.db',
      'src/',
      'src/nested/',
      'src/nested/deep.txt',
      'src/main.ts',
      'notes.txt',
    ]);
  });

  it('honors explicit directory slashes from tree -F', () => {
    const text = ['.', '├── empty-dir/', '└── file.txt'].join('\n');
    const result = parseFolderText(text);
    expect(flattenTree(result.root).find((n) => n.name === 'empty-dir')?.isDir).toBe(true);
  });
});

describe('parseFolderText — plain path list', () => {
  it('parses one path per line, with \\ or / separators', () => {
    const text = 'src/main.ts\nsrc\\utils.ts\n./docs/readme.md\nassets/\n';
    const result = parseFolderText(text);
    expect(result.format).toBe('path-list');
    expect(paths(text)).toEqual([
      'assets/',
      'docs/',
      'docs/readme.md',
      'src/',
      'src/main.ts',
      'src/utils.ts',
    ]);
  });

  it('rejects traversal and empty segments with warnings', () => {
    const result = parseFolderText('../evil.txt\na//b.txt\ngood.txt\n');
    expect(result.warnings.length).toBe(2);
    expect(result.entries).toEqual([{ path: 'good.txt', isDir: false }]);
  });

  it('reports when nothing can be parsed', () => {
    const result = parseFolderText('\n\n');
    expect(result.warnings.some((w) => w.includes('no files or folders'))).toBe(true);
  });
});
