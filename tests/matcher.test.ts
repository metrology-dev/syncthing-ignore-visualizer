import { describe, expect, it } from 'vitest';
import { compileRules, expandRule, isInternal, matchPath } from '../src/matcher';
import { parseIgnoreFiles, ROOT_IGNORE_FILE } from '../src/parser';
import type { Platform } from '../src/types';

function setFor(text: string, platform: Platform = 'linux', extra: Record<string, string> = {}) {
  const files = new Map<string, string>([[ROOT_IGNORE_FILE, text], ...Object.entries(extra)]);
  const parsed = parseIgnoreFiles(files, { platform });
  return compileRules(parsed.rules, platform);
}

function ignored(text: string, path: string, platform: Platform = 'linux'): boolean {
  const result = matchPath(setFor(text, platform), path);
  return result?.ignored ?? false;
}

describe('pattern expansion (Syncthing lib/ignore parity)', () => {
  const rule = (text: string, platform: Platform = 'linux') => {
    const parsed = parseIgnoreFiles(new Map([[ROOT_IGNORE_FILE, text]]), { platform });
    const first = parsed.rules[0];
    if (first === undefined) throw new Error('no rule parsed');
    return first;
  };

  it('plain patterns match at any depth and swallow directory contents', () => {
    expect(expandRule(rule('foo'))).toEqual(['foo', 'foo/**', '**/foo', '**/foo/**']);
  });

  it('rooted patterns only get the root variants', () => {
    expect(expandRule(rule('/foo'))).toEqual(['foo', 'foo/**']);
  });

  it('**/ prefixed patterns also match at the root', () => {
    expect(expandRule(rule('**/foo'))).toEqual(['**/foo', '**/foo/**', 'foo', 'foo/**']);
  });

  it('trailing slash matches contents only', () => {
    expect(expandRule(rule('foo/'))).toEqual(['foo/**', '**/foo/**']);
  });

  it('patterns already ending in /** are not expanded again', () => {
    expect(expandRule(rule('foo/**'))).toEqual(['foo/**', '**/foo/**']);
  });
});

describe('matchPath', () => {
  it('non-rooted literal matches at any level (docs: foo, subdir/foo)', () => {
    expect(ignored('foo', 'foo')).toBe(true);
    expect(ignored('foo', 'subdir/foo')).toBe(true);
    expect(ignored('foo', 'subdir/bar')).toBe(false);
  });

  it('a matched directory ignores everything under it', () => {
    expect(ignored('build', 'build')).toBe(true);
    expect(ignored('build', 'build/app.exe')).toBe(true);
    expect(ignored('build', 'build/deep/nested/file')).toBe(true);
  });

  it('rooted patterns do not match in subdirectories (docs: /foo)', () => {
    expect(ignored('/foo', 'foo')).toBe(true);
    expect(ignored('/foo', 'subdir/foo')).toBe(false);
    expect(ignored('/foo', 'foo/inner')).toBe(true);
  });

  it('trailing slash ignores contents but not the directory itself', () => {
    expect(ignored('cache/', 'cache')).toBe(false);
    expect(ignored('cache/', 'cache/index.db')).toBe(true);
    expect(ignored('cache/', 'sub/cache/data')).toBe(true);
    expect(ignored('cache/', 'sub/cache')).toBe(false);
  });

  it('first match wins — negation must precede broader rules', () => {
    const set = setFor('!important.tmp\n*.tmp\n');
    expect(matchPath(set, 'important.tmp')).toEqual(
      expect.objectContaining({ ruleIndex: 0, ignored: false }),
    );
    expect(matchPath(set, 'other.tmp')).toEqual(
      expect.objectContaining({ ruleIndex: 1, ignored: true }),
    );
  });

  it('negation AFTER an ignore rule is shadowed (unlike .gitignore)', () => {
    const set = setFor('*.tmp\n!important.tmp\n');
    expect(matchPath(set, 'important.tmp')).toEqual(
      expect.objectContaining({ ruleIndex: 0, ignored: true }),
    );
  });

  it('returns null when nothing matches (default: included)', () => {
    expect(matchPath(setFor('*.tmp\n'), 'notes.txt')).toBeNull();
  });

  it('(?i) enables case-insensitive matching on Linux', () => {
    expect(ignored('(?i)readme.md', 'README.md')).toBe(true);
    expect(ignored('readme.md', 'README.md')).toBe(false);
  });

  it('matching is always case-insensitive on Windows and macOS', () => {
    expect(ignored('readme.md', 'README.md', 'windows')).toBe(true);
    expect(ignored('readme.md', 'README.md', 'macos')).toBe(true);
  });

  it('(?d) marks matches deletable', () => {
    const set = setFor('(?d).DS_Store\n');
    expect(matchPath(set, 'images/.DS_Store')).toEqual(
      expect.objectContaining({ ignored: true, deletable: true }),
    );
  });

  it('** patterns cross directory boundaries', () => {
    expect(ignored('**/backup/', 'a/b/backup/old/archive.zip')).toBe(true);
    expect(ignored('**/backup/', 'backup/x')).toBe(true);
    expect(ignored('**/backup/', 'backup')).toBe(false);
  });

  it('invalid rules never match and do not block later rules', () => {
    const set = setFor('file[0-9.txt\n*.log\n');
    expect(matchPath(set, 'file[0-9.txt')).toBeNull();
    expect(matchPath(set, 'app.log')).toEqual(expect.objectContaining({ ignored: true }));
  });

  it('rules from #include participate in evaluation order', () => {
    const set = setFor('#include extra.txt\n*.tmp\n', 'linux', { 'extra.txt': '!keep.tmp\n' });
    expect(matchPath(set, 'keep.tmp')).toEqual(
      expect.objectContaining({ ruleIndex: 0, ignored: false }),
    );
    expect(matchPath(set, 'other.tmp')).toEqual(
      expect.objectContaining({ ruleIndex: 1, ignored: true }),
    );
  });

  it('escaped wildcards match literally', () => {
    expect(ignored('\\*.txt', '*.txt')).toBe(true);
    expect(ignored('\\*.txt', 'a.txt')).toBe(false);
  });

  it('windows escape character | works via platform default', () => {
    expect(ignored('|*.txt', '*.txt', 'windows')).toBe(true);
    expect(ignored('|*.txt', 'a.txt', 'windows')).toBe(false);
  });
});

describe('isInternal', () => {
  it('always ignores Syncthing marker files at the root', () => {
    expect(isInternal('.stfolder')).toBe(true);
    expect(isInternal('.stignore')).toBe(true);
    expect(isInternal('.stversions')).toBe(true);
    expect(isInternal('.stversions/old/file.txt')).toBe(true);
  });

  it('does not treat nested marker-named files as internal', () => {
    expect(isInternal('sub/.stignore')).toBe(false);
  });

  it('ignores temporary files at any depth', () => {
    expect(isInternal('a/~syncthing~file.txt.tmp')).toBe(true);
    expect(isInternal('a/.syncthing.file.txt.tmp')).toBe(true);
    expect(isInternal('a/normal.tmp')).toBe(false);
  });
});
