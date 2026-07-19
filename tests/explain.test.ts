import { describe, expect, it } from 'vitest';
import { explainRule, stepEffect } from '../src/explain';
import { parseIgnoreFiles, ROOT_IGNORE_FILE } from '../src/parser';
import type { ParsedRule } from '../src/types';

function rule(text: string): ParsedRule {
  const parsed = parseIgnoreFiles(new Map([[ROOT_IGNORE_FILE, text]]), { platform: 'linux' });
  const first = parsed.rules[0];
  if (first === undefined) throw new Error(`no rule parsed from ${text}`);
  return first;
}

describe('explainRule', () => {
  it('explains a simple wildcard ignore', () => {
    const text = explainRule(rule('*.tmp'));
    expect(text).toContain('any file or directory');
    expect(text).toContain('ignored');
    expect(text).toContain('* matches any characters within a single name');
  });

  it('explains exact-name patterns', () => {
    expect(explainRule(rule('notes.txt'))).toContain('named exactly');
  });

  it('explains negation and first-match-wins', () => {
    const text = explainRule(rule('!important.tmp'));
    expect(text).toContain('KEPT');
    expect(text).toContain('first matching rule');
  });

  it('explains root anchoring', () => {
    expect(explainRule(rule('/foo'))).toContain('folder root only');
  });

  it('explains trailing-slash contents-only patterns', () => {
    const text = explainRule(rule('cache/'));
    expect(text).toContain('INSIDE');
    expect(text).toContain('not the directory itself');
  });

  it('explains (?i) and (?d)', () => {
    expect(explainRule(rule('(?i)readme.md'))).toContain('case-insensitive');
    expect(explainRule(rule('(?d).DS_Store'))).toContain('deletable');
  });

  it('explains ** recursion', () => {
    expect(explainRule(rule('**/backup/'))).toContain('directory boundaries');
  });

  it('explains invalid rules', () => {
    expect(explainRule(rule('file[0-9.txt'))).toContain('never matches');
  });

  it('does not claim wildcards when they are escaped', () => {
    expect(explainRule(rule('\\*.txt'))).toContain('named exactly');
  });
});

describe('stepEffect', () => {
  it('describes new ignores', () => {
    expect(stepEffect(2, 0, 0)).toBe('2 items became ignored.');
  });
  it('describes kept files', () => {
    expect(stepEffect(0, 1, 0)).toBe('1 item is now permanently kept.');
  });
  it('describes shadowed-only steps', () => {
    expect(stepEffect(0, 0, 3)).toContain('already decided');
  });
  it('describes no-match steps', () => {
    expect(stepEffect(0, 0, 0)).toBe('no files matched this rule.');
  });
  it('combines outcomes', () => {
    const text = stepEffect(2, 0, 1);
    expect(text).toContain('2 items became ignored');
    expect(text).toContain('first match wins');
  });
});
