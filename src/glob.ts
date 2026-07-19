/**
 * Glob → RegExp translation reproducing the semantics Syncthing gets from
 * the gobwas/glob library with '/' as the separator:
 *
 *   `*`      any run of characters within one path component (never '/')
 *   `?`      a single character, but not '/'
 *   `**`     any run of characters, including '/'
 *   `[a-z]`  character class; `[!a-z]` or `[^a-z]` negates it
 *   `{a,b}`  comma-separated alternatives (may nest, may contain wildcards)
 *
 * The escape character (`\` on Unix, `|` on Windows, or whatever `#escape=`
 * selects) makes the next character literal.
 */

import { escapeRegExp } from './utils';

export interface GlobResult {
  /** Regex source anchored as a full match, without flags. */
  source: string;
  error?: string;
}

interface Ctx {
  pattern: string;
  escapeChar: string;
  pos: number;
}

export function globToRegExp(pattern: string, escapeChar: string): GlobResult {
  const ctx: Ctx = { pattern, escapeChar, pos: 0 };
  try {
    const body = translate(ctx, new Set());
    return { source: `^(?:${body})$` };
  } catch (err) {
    return { source: '^\\b$', error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Translate until end of input or an unescaped character in `stopAt`
 * (used for `{}` alternatives). Leaves `ctx.pos` on the stop character.
 */
function translate(ctx: Ctx, stopAt: ReadonlySet<string>): string {
  let out = '';
  while (ctx.pos < ctx.pattern.length) {
    const ch = ctx.pattern[ctx.pos] as string;
    if (stopAt.has(ch)) return out;
    if (ch === ctx.escapeChar) {
      out += translateEscape(ctx);
    } else if (ch === '*') {
      out += translateStars(ctx);
    } else if (ch === '?') {
      out += '[^/]';
      ctx.pos += 1;
    } else if (ch === '[') {
      out += translateClass(ctx);
    } else if (ch === '{') {
      out += translateAlternatives(ctx);
    } else if (ch === '}') {
      throw new Error("unmatched '}' — escape it to match a literal brace");
    } else {
      out += escapeRegExp(ch);
      ctx.pos += 1;
    }
  }
  return out;
}

function translateEscape(ctx: Ctx): string {
  const next = ctx.pattern[ctx.pos + 1];
  if (next === undefined) {
    // Trailing escape character: treat it as a literal, like gobwas does.
    ctx.pos += 1;
    return escapeRegExp(ctx.escapeChar);
  }
  ctx.pos += 2;
  return escapeRegExp(next);
}

function translateStars(ctx: Ctx): string {
  let count = 0;
  while (ctx.pattern[ctx.pos] === '*') {
    count += 1;
    ctx.pos += 1;
  }
  return count >= 2 ? '.*' : '[^/]*';
}

function translateClass(ctx: Ctx): string {
  const { pattern, escapeChar } = ctx;
  let i = ctx.pos + 1; // past '['
  let body = '';
  let negated = false;
  if (pattern[i] === '!' || pattern[i] === '^') {
    negated = true;
    i += 1;
  }
  // A ']' immediately after '[' or '[!' is a literal member of the class.
  if (pattern[i] === ']') {
    body += '\\]';
    i += 1;
  }
  while (i < pattern.length && pattern[i] !== ']') {
    const ch = pattern[i] as string;
    if (ch === escapeChar && i + 1 < pattern.length) {
      body += escapeClassChar(pattern[i + 1] as string);
      i += 2;
    } else if (ch === '-') {
      body += '-';
      i += 1;
    } else {
      body += escapeClassChar(ch);
      i += 1;
    }
  }
  if (i >= pattern.length) {
    throw new Error("unterminated character class — missing ']'");
  }
  if (body === '') {
    throw new Error('empty character class');
  }
  ctx.pos = i + 1; // past ']'
  return `[${negated ? '^' : ''}${body}]`;
}

function escapeClassChar(ch: string): string {
  return /[\\\]^]/.test(ch) ? `\\${ch}` : ch;
}

function translateAlternatives(ctx: Ctx): string {
  const start = ctx.pos;
  ctx.pos += 1; // past '{'
  const alternatives: string[] = [];
  const stop = new Set([',', '}']);
  for (;;) {
    alternatives.push(translate(ctx, stop));
    const ch = ctx.pattern[ctx.pos];
    if (ch === ',') {
      ctx.pos += 1;
      continue;
    }
    if (ch === '}') {
      ctx.pos += 1;
      return `(?:${alternatives.join('|')})`;
    }
    ctx.pos = start;
    throw new Error("unterminated alternative group — missing '}'");
  }
}
