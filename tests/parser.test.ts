import { describe, expect, it } from 'vitest';
import { parseIgnoreFiles, ROOT_IGNORE_FILE } from '../src/parser';
import type { Platform } from '../src/types';

function parse(text: string, platform: Platform = 'linux', extra: Record<string, string> = {}) {
  const files = new Map<string, string>([[ROOT_IGNORE_FILE, text], ...Object.entries(extra)]);
  return parseIgnoreFiles(files, { platform });
}

describe('parseIgnoreFiles', () => {
  it('skips blank lines and // comments', () => {
    const result = parse('// a comment\n\nfoo\n');
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]?.pattern).toBe('foo');
    expect(result.lines.get(ROOT_IGNORE_FILE)?.map((l) => l.kind)).toEqual([
      'comment',
      'blank',
      'rule',
      'blank',
    ]);
  });

  it('trims surrounding whitespace but keeps inner spaces', () => {
    const result = parse('  my file.txt  \n');
    expect(result.rules[0]?.pattern).toBe('my file.txt');
  });

  it('parses ! (?i) (?d) prefixes in any order', () => {
    const result = parse('!(?i)foo\n(?d)(?i)bar\n(?i)!baz\n');
    const [a, b, c] = result.rules;
    expect(a?.flags).toEqual({ negated: true, caseInsensitive: true, deletable: false });
    expect(b?.flags).toEqual({ negated: false, caseInsensitive: true, deletable: true });
    expect(c?.flags).toEqual({ negated: true, caseInsensitive: true, deletable: false });
  });

  it('each prefix applies only once; a repeat belongs to the pattern', () => {
    const result = parse('!!foo\n');
    expect(result.rules[0]?.flags.negated).toBe(true);
    expect(result.rules[0]?.pattern).toBe('!foo');
  });

  it('warns about combined prefixes like (?di)', () => {
    const result = parse('(?di)foo\n');
    expect(result.diagnostics.some((d) => d.message.includes('(?d)(?i)'))).toBe(true);
    // Treated as a literal pattern, matching Syncthing.
    expect(result.rules[0]?.pattern).toBe('(?di)foo');
  });

  it('detects rooted patterns and strips the slash', () => {
    const result = parse('/foo\n');
    expect(result.rules[0]?.rooted).toBe(true);
    expect(result.rules[0]?.pattern).toBe('foo');
  });

  it('detects trailing-slash contents-only patterns', () => {
    const result = parse('cache/\n');
    expect(result.rules[0]?.contentsOnly).toBe(true);
  });

  it('rejects an empty pattern such as a bare !', () => {
    const result = parse('!\n');
    expect(result.rules).toHaveLength(0);
    expect(result.diagnostics.some((d) => d.message === 'empty pattern')).toBe(true);
  });

  it('flags invalid globs as errors and keeps the rule inert', () => {
    const result = parse('file[0-9.txt\n');
    expect(result.rules[0]?.error).toMatch(/unterminated/);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  describe('#include', () => {
    it('inlines rules from an included file at the directive position', () => {
      const result = parse('a\n#include extra.txt\nb\n', 'linux', { 'extra.txt': 'x\ny\n' });
      expect(result.rules.map((r) => r.pattern)).toEqual(['a', 'x', 'y', 'b']);
      expect(result.rules.map((r) => r.index)).toEqual([0, 1, 2, 3]);
      expect(result.rules[1]?.source).toBe('extra.txt');
    });

    it('errors when the include target is missing', () => {
      const result = parse('#include missing.txt\n');
      expect(result.diagnostics.some((d) => d.severity === 'error' && d.message.includes('not found'))).toBe(true);
    });

    it('rejects including the same file twice (like Syncthing)', () => {
      const result = parse('#include extra.txt\n#include extra.txt\n', 'linux', {
        'extra.txt': 'x\n',
      });
      expect(result.rules.map((r) => r.pattern)).toEqual(['x']);
      expect(result.diagnostics.some((d) => d.message.includes('more than once'))).toBe(true);
    });

    it('rejects include cycles', () => {
      const result = parse('#include a.txt\n', 'linux', {
        'a.txt': '#include b.txt\n',
        'b.txt': '#include a.txt\n',
      });
      expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    });
  });

  describe('#escape=', () => {
    it('overrides the escape character when first line', () => {
      const result = parse('#escape=\\\n\\*.txt\n', 'windows');
      expect(result.rules[0]?.escapeChar).toBe('\\');
    });

    it('is rejected after other content', () => {
      const result = parse('foo\n#escape=\\\n', 'linux');
      expect(result.diagnostics.some((d) => d.message.includes('first line'))).toBe(true);
    });

    it('applies per file, not globally', () => {
      const result = parse('#escape=@\n#include extra.txt\n', 'linux', { 'extra.txt': 'x\n' });
      expect(result.rules[0]?.escapeChar).toBe('\\');
    });
  });

  it('warns on # lines that are not directives', () => {
    const result = parse('#not-a-comment\n');
    expect(result.rules).toHaveLength(1);
    expect(result.diagnostics.some((d) => d.message.includes('// for comments'))).toBe(true);
  });

  it('converts backslashes to slashes on Windows', () => {
    const result = parse('build\\output\n', 'windows');
    expect(result.rules[0]?.pattern).toBe('build/output');
  });

  it('keeps backslashes as escapes on Linux', () => {
    const result = parse('build\\output\n', 'linux');
    expect(result.rules[0]?.pattern).toBe('build\\output');
  });

  it('warns that (?d) on a negated pattern has no effect', () => {
    const result = parse('!(?d)foo\n');
    expect(result.diagnostics.some((d) => d.message.includes('no effect'))).toBe(true);
  });
});
