/**
 * Integration tests: full pipeline from ignore text + tree text through
 * parser, matcher and evaluation, including the built-in example.
 */
import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/history';
import { compileRules } from '../src/matcher';
import { parseIgnoreFiles, ROOT_IGNORE_FILE } from '../src/parser';
import { DEFAULT_RULES, defaultTree } from '../src/tree';
import { parseFolderText } from '../src/treeParser';
import type { Platform } from '../src/types';

function evaluateText(rulesText: string, platform: Platform = 'linux') {
  const parsed = parseIgnoreFiles(new Map([[ROOT_IGNORE_FILE, rulesText]]), { platform });
  const set = compileRules(parsed.rules, platform);
  return { parsed, result: evaluate(defaultTree(), set) };
}

describe('built-in example', () => {
  it('parses without errors', () => {
    const { parsed } = evaluateText(DEFAULT_RULES);
    expect(parsed.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(parsed.rules).toHaveLength(7);
  });

  it('produces the documented final states', () => {
    const { result } = evaluateText(DEFAULT_RULES);
    const state = (path: string) => result.files.get(path)?.finalState;

    // Kept by the leading negation (first match wins).
    expect(state('important.tmp')).toBe('included');
    // Ignored by *.tmp.
    expect(state('temp.tmp')).toBe('ignored');
    // cache/ (trailing slash): contents ignored, directory itself synced.
    expect(state('cache')).toBe('included');
    expect(state('cache/index.db')).toBe('ignored');
    expect(state('cache/temp.dat')).toBe('ignored');
    // build (no slash): directory and contents ignored.
    expect(state('build')).toBe('ignored');
    expect(state('build/app.exe')).toBe('ignored');
    // **/backup/ ignores contents at any depth, not the dir itself.
    expect(state('backup')).toBe('included');
    expect(state('backup/old')).toBe('ignored');
    expect(state('backup/old/archive.zip')).toBe('ignored');
    // (?d).DS_Store — ignored and deletable.
    expect(state('images/.DS_Store')).toBe('ignored');
    expect(result.files.get('images/.DS_Store')?.deletable).toBe(true);
    // (?i)readme.md matches README.md case-insensitively.
    expect(state('README.md')).toBe('ignored');
    // Untouched files stay included.
    expect(state('notes.txt')).toBe('included');
    expect(state('src/main.ts')).toBe('included');
    expect(state('images/logo.png')).toBe('included');
  });

  it('records the shadowed match for important.tmp on rule 1', () => {
    const { result } = evaluateText(DEFAULT_RULES);
    expect(result.steps[1]?.shadowed).toContain('important.tmp');
    const important = result.files.get('important.tmp');
    expect(important?.records[1]).toEqual(
      expect.objectContaining({ matched: true, applied: false }),
    );
  });

  it('matches snapshot of all final states', () => {
    const { result } = evaluateText(DEFAULT_RULES);
    const states = Object.fromEntries(
      [...result.files.values()].map((f) => [
        f.path,
        `${f.finalState}${f.deletable ? ' (deletable)' : ''}${
          f.decidingRule === null ? '' : ` by rule ${f.decidingRule}`
        }`,
      ]),
    );
    expect(states).toMatchInlineSnapshot(`
      {
        "README.md": "ignored by rule 6",
        "backup": "included",
        "backup/old": "ignored by rule 4",
        "backup/old/archive.zip": "ignored by rule 4",
        "build": "ignored by rule 3",
        "build/app.exe": "ignored by rule 3",
        "build/app.pdb": "ignored by rule 3",
        "cache": "included",
        "cache/index.db": "ignored by rule 2",
        "cache/temp.dat": "ignored by rule 2",
        "images": "included",
        "images/.DS_Store": "ignored (deletable) by rule 5",
        "images/background.jpg": "included",
        "images/logo.png": "included",
        "important.tmp": "included by rule 0",
        "notes.txt": "included",
        "report.docx": "included",
        "src": "included",
        "src/main.ts": "included",
        "src/utils.ts": "included",
        "temp.tmp": "ignored by rule 1",
      }
    `);
  });
});

describe('imported tree → evaluation workflow', () => {
  it('evaluates rules against a tree imported from Windows tree /F output', () => {
    const treeText = [
      'C:.',
      '│   app.log',
      '│   readme.md',
      '├───node_modules',
      '│       package.json',
      '└───src',
      '        index.ts',
    ].join('\n');
    const imported = parseFolderText(treeText);
    expect(imported.warnings).toEqual([]);

    const parsed = parseIgnoreFiles(new Map([[ROOT_IGNORE_FILE, 'node_modules\n*.log\n']]), {
      platform: 'windows',
    });
    const result = evaluate(imported.root, compileRules(parsed.rules, 'windows'));

    expect(result.files.get('node_modules')?.finalState).toBe('ignored');
    expect(result.files.get('node_modules/package.json')?.finalState).toBe('ignored');
    expect(result.files.get('app.log')?.finalState).toBe('ignored');
    expect(result.files.get('src/index.ts')?.finalState).toBe('included');
    expect(result.files.get('readme.md')?.finalState).toBe('included');
  });

  it('platform switch changes case sensitivity of the same rules', () => {
    const files = new Map([[ROOT_IGNORE_FILE, 'readme.md\n']]);
    const linux = compileRules(parseIgnoreFiles(files, { platform: 'linux' }).rules, 'linux');
    const macos = compileRules(parseIgnoreFiles(files, { platform: 'macos' }).rules, 'macos');
    const result = (set: typeof linux) => evaluate(defaultTree(), set);
    expect(result(linux).files.get('README.md')?.finalState).toBe('included');
    expect(result(macos).files.get('README.md')?.finalState).toBe('ignored');
  });

  it('supports a full #include workflow', () => {
    const parsed = parseIgnoreFiles(
      new Map([
        [ROOT_IGNORE_FILE, '#include shared-patterns.txt\n!cache/keep.db\ncache/\n'],
        ['shared-patterns.txt', '*.bak\n'],
      ]),
      { platform: 'linux' },
    );
    expect(parsed.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const set = compileRules(parsed.rules, 'linux');
    const tree = parseFolderText('cache/keep.db\ncache/drop.db\nnotes.bak\n');
    const result = evaluate(tree.root, set);
    expect(result.files.get('notes.bak')?.finalState).toBe('ignored');
    expect(result.files.get('cache/keep.db')?.finalState).toBe('included');
    expect(result.files.get('cache/drop.db')?.finalState).toBe('ignored');
  });
});
