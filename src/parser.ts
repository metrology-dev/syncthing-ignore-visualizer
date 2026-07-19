/**
 * `.stignore` parser.
 *
 * Follows Syncthing's `lib/ignore` behavior:
 *  - lines are trimmed; blank lines and `//` comments are skipped
 *  - `#include <file>` inlines another pattern file at that position
 *  - `#escape=<char>` (first line only) overrides the escape character,
 *    which defaults to `\` on Unix and `|` on Windows — per file
 *  - prefixes `!`, `(?i)`, `(?d)` may appear in any order, each at most once
 *  - a leading `/` roots the pattern at the folder; a trailing `/` matches a
 *    directory's contents but not the directory itself
 *  - on Windows, backslashes in patterns are converted to `/`
 */

import { globToRegExp } from './glob';
import type {
  Diagnostic,
  LineInfo,
  ParseResult,
  ParsedRule,
  Platform,
  RuleFlags,
} from './types';

export const ROOT_IGNORE_FILE = '.stignore';

const INCLUDE_PREFIX = '#include ';
const ESCAPE_PREFIX = '#escape=';

export function defaultEscapeChar(platform: Platform): string {
  return platform === 'windows' ? '|' : '\\';
}

/** Case folding is always on for Windows and macOS, matching real Syncthing. */
export function platformCaseInsensitive(platform: Platform): boolean {
  return platform !== 'linux';
}

export interface ParseOptions {
  platform: Platform;
}

/**
 * Parse a set of ignore files. `files` maps file name → content and must
 * contain {@link ROOT_IGNORE_FILE}; other entries are `#include` targets.
 */
export function parseIgnoreFiles(
  files: ReadonlyMap<string, string>,
  options: ParseOptions,
): ParseResult {
  const state: ParseState = {
    files,
    platform: options.platform,
    rules: [],
    diagnostics: [],
    lines: new Map(),
    visited: new Set(),
  };
  if (!files.has(ROOT_IGNORE_FILE)) {
    state.diagnostics.push({
      source: ROOT_IGNORE_FILE,
      line: 1,
      severity: 'error',
      message: `missing root ignore file ${ROOT_IGNORE_FILE}`,
    });
  } else {
    parseFile(state, ROOT_IGNORE_FILE);
  }
  return { rules: state.rules, diagnostics: state.diagnostics, lines: state.lines };
}

interface ParseState {
  files: ReadonlyMap<string, string>;
  platform: Platform;
  rules: ParsedRule[];
  diagnostics: Diagnostic[];
  lines: Map<string, LineInfo[]>;
  visited: Set<string>;
}

function parseFile(state: ParseState, fileName: string): void {
  state.visited.add(fileName);
  const content = state.files.get(fileName) ?? '';
  const rawLines = content.split(/\r?\n/);
  const lineInfos: LineInfo[] = [];
  state.lines.set(fileName, lineInfos);

  let escapeChar = defaultEscapeChar(state.platform);
  let seenEffectiveLine = false;

  rawLines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.trim();
    const diag = (severity: Diagnostic['severity'], message: string): void => {
      state.diagnostics.push({ source: fileName, line: lineNo, severity, message });
    };

    if (line === '') {
      lineInfos.push({ kind: 'blank' });
      return;
    }
    if (line.startsWith('//')) {
      lineInfos.push({ kind: 'comment' });
      return;
    }
    if (line.startsWith(ESCAPE_PREFIX)) {
      lineInfos.push({ kind: 'escape' });
      const value = line.slice(ESCAPE_PREFIX.length);
      if (seenEffectiveLine) {
        diag('error', '#escape= must be the first line of the file; directive ignored');
      } else if (value.length !== 1) {
        diag('error', '#escape= expects exactly one character (e.g. #escape=\\)');
      } else {
        escapeChar = value;
      }
      seenEffectiveLine = true;
      return;
    }
    if (line.startsWith(INCLUDE_PREFIX) || line === '#include') {
      seenEffectiveLine = true;
      const target = line.slice(INCLUDE_PREFIX.length).trim();
      lineInfos.push({ kind: 'include' });
      if (target === '') {
        diag('error', '#include requires a file name');
        return;
      }
      if (state.visited.has(target)) {
        diag('error', `"${target}" is included more than once — Syncthing rejects this`);
        return;
      }
      if (!state.files.has(target)) {
        diag(
          'error',
          `include file "${target}" not found — in Syncthing the folder stops with an error`,
        );
        return;
      }
      parseFile(state, target);
      return;
    }
    if (line.startsWith('#')) {
      // Not a directive: Syncthing treats it as a literal pattern. Warn,
      // because the user probably wanted a comment (which is `//`).
      diag(
        'warning',
        'lines starting with "#" are patterns, not comments — use // for comments',
      );
    }

    seenEffectiveLine = true;
    const rule = parseRuleLine(state, fileName, lineNo, line, escapeChar);
    if (rule === null) {
      lineInfos.push({ kind: 'invalid' });
      return;
    }
    lineInfos.push({ kind: 'rule', ruleIndex: rule.index });
    state.rules.push(rule);
  });
}

function parseRuleLine(
  state: ParseState,
  source: string,
  lineNo: number,
  line: string,
  escapeChar: string,
): ParsedRule | null {
  const diag = (severity: Diagnostic['severity'], message: string): void => {
    state.diagnostics.push({ source, line: lineNo, severity, message });
  };

  let text = line;
  if (state.platform === 'windows' && text.includes('\\')) {
    // Syncthing runs filepath.ToSlash() on patterns; on Windows that turns
    // backslashes into forward slashes.
    text = text.replaceAll('\\', '/');
    diag('info', 'backslashes are treated as path separators on Windows (converted to /)');
  }

  const { pattern: afterPrefixes, flags } = parsePrefixes(text);
  if (/^\(\?[a-z]{2,}\)/i.test(afterPrefixes)) {
    diag(
      'warning',
      'prefixes cannot be combined in one group — use (?d)(?i) instead of (?di). ' +
        'Syncthing treats this as a literal pattern.',
    );
  }

  let pattern = afterPrefixes;
  const rooted = pattern.startsWith('/');
  if (rooted) pattern = pattern.slice(1);

  if (pattern === '') {
    diag('error', 'empty pattern');
    return null;
  }

  const contentsOnly = pattern.endsWith('/');
  const compiled = globToRegExp(pattern, escapeChar);

  const rule: ParsedRule = {
    index: state.rules.length,
    source,
    line: lineNo,
    raw: line,
    pattern,
    flags,
    rooted,
    contentsOnly,
    escapeChar,
    ...(compiled.error !== undefined ? { error: compiled.error } : {}),
  };

  if (compiled.error !== undefined) {
    diag('error', `invalid pattern: ${compiled.error} — this rule never matches`);
  }
  addAdvisories(diag, rule);
  return rule;
}

function parsePrefixes(text: string): { pattern: string; flags: RuleFlags } {
  const flags: RuleFlags = { negated: false, caseInsensitive: false, deletable: false };
  let rest = text;
  for (;;) {
    if (rest.startsWith('!') && !flags.negated) {
      flags.negated = true;
      rest = rest.slice(1);
    } else if (rest.startsWith('(?i)') && !flags.caseInsensitive) {
      flags.caseInsensitive = true;
      rest = rest.slice(4);
    } else if (rest.startsWith('(?d)') && !flags.deletable) {
      flags.deletable = true;
      rest = rest.slice(4);
    } else {
      return { pattern: rest.trim(), flags };
    }
  }
}

function addAdvisories(
  diag: (severity: Diagnostic['severity'], message: string) => void,
  rule: ParsedRule,
): void {
  if (rule.error !== undefined) return;
  if (!rule.rooted && (rule.pattern === '*' || rule.pattern === '**')) {
    diag('info', 'this pattern ignores everything in the folder');
  }
  if (rule.flags.negated && rule.flags.deletable) {
    diag('warning', '(?d) has no effect on a negated pattern — the items are not ignored');
  }
  if (rule.flags.negated && !rule.rooted) {
    diag(
      'info',
      'non-rooted negated patterns force Syncthing to scan inside ignored directories, ' +
        'which can slow large folders',
    );
  }
}
