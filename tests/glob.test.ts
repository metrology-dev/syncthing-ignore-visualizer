import { describe, expect, it } from 'vitest';
import { globToRegExp } from '../src/glob';

function matches(pattern: string, path: string, escapeChar = '\\'): boolean {
  const { source, error } = globToRegExp(pattern, escapeChar);
  expect(error).toBeUndefined();
  return new RegExp(source).test(path);
}

describe('globToRegExp', () => {
  it('matches literal names exactly', () => {
    expect(matches('foo', 'foo')).toBe(true);
    expect(matches('foo', 'foobar')).toBe(false);
    expect(matches('foo', 'bar/foo')).toBe(false);
  });

  it('* matches within a single path component (docs: te*ne)', () => {
    expect(matches('te*ne', 'telephone')).toBe(true);
    expect(matches('te*ne', 'tele/phone')).toBe(false);
    expect(matches('*.tmp', 'file.tmp')).toBe(true);
    expect(matches('*.tmp', 'dir/file.tmp')).toBe(false);
    expect(matches('*', 'anything')).toBe(true);
    expect(matches('*', 'a/b')).toBe(false);
  });

  it('** matches across path separators (docs: te**ne)', () => {
    expect(matches('te**ne', 'telephone')).toBe(true);
    expect(matches('te**ne', 'tele/sub/dir/phone')).toBe(true);
    expect(matches('**', 'a/b/c')).toBe(true);
  });

  it('? matches a single non-separator character (docs: te??st)', () => {
    expect(matches('te??st', 'tebest')).toBe(true);
    expect(matches('te??st', 'teb/st')).toBe(false);
    expect(matches('te??st', 'test')).toBe(false);
  });

  it('character classes and ranges', () => {
    expect(matches('file[0-9].txt', 'file5.txt')).toBe(true);
    expect(matches('file[0-9].txt', 'filex.txt')).toBe(false);
    expect(matches('file[!0-9].txt', 'filex.txt')).toBe(true);
    expect(matches('file[!0-9].txt', 'file5.txt')).toBe(false);
    expect(matches('file[^0-9].txt', 'filex.txt')).toBe(true);
  });

  it('brace alternatives (docs: {banana,pineapple})', () => {
    expect(matches('{banana,pineapple}', 'banana')).toBe(true);
    expect(matches('{banana,pineapple}', 'pineapple')).toBe(true);
    expect(matches('{banana,pineapple}', 'apple')).toBe(false);
    expect(matches('*.{jpg,png}', 'photo.png')).toBe(true);
    expect(matches('*.{jpg,png}', 'photo.gif')).toBe(false);
  });

  it('nested braces and wildcards inside alternatives', () => {
    expect(matches('{a{b,c},d}x', 'abx')).toBe(true);
    expect(matches('{a{b,c},d}x', 'acx')).toBe(true);
    expect(matches('{a{b,c},d}x', 'dx')).toBe(true);
    expect(matches('{foo*,bar}', 'foosball')).toBe(true);
  });

  it('backslash escaping on Unix (docs: \\{banana\\})', () => {
    expect(matches('\\{banana\\}', '{banana}')).toBe(true);
    expect(matches('\\*.txt', '*.txt')).toBe(true);
    expect(matches('\\*.txt', 'a.txt')).toBe(false);
  });

  it('pipe escaping on Windows (docs: |{banana|})', () => {
    expect(matches('|{banana|}', '{banana}', '|')).toBe(true);
    expect(matches('|*.txt', '*.txt', '|')).toBe(true);
    expect(matches('|*.txt', 'a.txt', '|')).toBe(false);
  });

  it('regex metacharacters in patterns are literal', () => {
    expect(matches('file(1).txt', 'file(1).txt')).toBe(true);
    expect(matches('a+b.txt', 'a+b.txt')).toBe(true);
    expect(matches('a+b.txt', 'aab.txt')).toBe(false);
    expect(matches('a.b', 'a.b')).toBe(true);
    expect(matches('a.b', 'axb')).toBe(false);
  });

  it('reports unterminated character class', () => {
    const { error } = globToRegExp('file[0-9.txt', '\\');
    expect(error).toMatch(/unterminated character class/);
  });

  it('reports unterminated alternative group', () => {
    const { error } = globToRegExp('{a,b', '\\');
    expect(error).toMatch(/unterminated alternative/);
  });

  it('trailing escape character is treated as a literal', () => {
    expect(matches('foo\\', 'foo\\')).toBe(true);
  });
});
