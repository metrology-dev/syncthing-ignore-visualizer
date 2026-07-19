/**
 * Plain-English explanations for rules and evaluation steps.
 * These strings power the Explanation panel and the file detail pane.
 */

import type { ParsedRule } from './types';

/** Multi-sentence description of what a rule matches and what it does. */
export function explainRule(rule: ParsedRule): string {
  if (rule.error !== undefined) {
    return `This pattern is invalid (${rule.error}), so it never matches anything.`;
  }
  const sentences: string[] = [];
  sentences.push(`${matchSubject(rule)} ${matchLocation(rule)}.`);

  const wildcardNotes = describeWildcards(stripEscaped(rule.pattern, rule.escapeChar));
  if (wildcardNotes.length > 0) sentences.push(wildcardNotes.join(' '));

  if (rule.flags.caseInsensitive) {
    sentences.push('The match is case-insensitive because of the (?i) prefix.');
  }

  if (rule.flags.negated) {
    sentences.push(
      'Because of the ! prefix, matching items are KEPT (not ignored) — and since ' +
        'Syncthing applies the first matching rule, no later rule can ignore them.',
    );
  } else {
    sentences.push('Matching items are ignored: Syncthing will not sync them.');
  }

  if (rule.flags.deletable && !rule.flags.negated) {
    sentences.push(
      '(?d) additionally marks matches as deletable: they stay ignored, but Syncthing ' +
        'may delete them if they are the only thing preventing a directory from being removed.',
    );
  }

  if (!rule.contentsOnly && !rule.flags.negated) {
    sentences.push('If a directory matches, everything inside it is ignored too.');
  }
  return sentences.join(' ');
}

function matchSubject(rule: ParsedRule): string {
  const quoted = `“${rule.pattern.replace(/\/$/, '')}”`;
  if (rule.contentsOnly) {
    return `Matches everything INSIDE a directory matching ${quoted} — but not the directory itself, which stays synced`;
  }
  if (hasWildcards(rule)) {
    return `Matches any file or directory whose path fits the pattern ${quoted}`;
  }
  return `Matches a file or directory named exactly ${quoted}`;
}

function matchLocation(rule: ParsedRule): string {
  if (rule.rooted) {
    return 'directly at the folder root only (the leading / anchors it there)';
  }
  if (rule.pattern.startsWith('**/')) {
    return 'at any depth in the folder';
  }
  return 'at any depth (Syncthing tries non-rooted patterns at the root and under every subdirectory)';
}

function hasWildcards(rule: ParsedRule): boolean {
  return /[*?[{]/.test(stripEscaped(rule.pattern, rule.escapeChar));
}

/** Remove escape-char + following char pairs so escaped wildcards look literal. */
function stripEscaped(pattern: string, escapeChar: string): string {
  let out = '';
  for (let i = 0; i < pattern.length; i += 1) {
    if (pattern[i] === escapeChar) {
      i += 1;
      continue;
    }
    out += pattern[i];
  }
  return out;
}

function describeWildcards(pattern: string): string[] {
  const notes: string[] = [];
  if (pattern.includes('**')) {
    notes.push('** matches across directory boundaries (any number of nested folders).');
  }
  if (/(?<!\*)\*(?!\*)/.test(pattern)) {
    notes.push('* matches any characters within a single name, but never a path separator.');
  }
  if (pattern.includes('?')) {
    notes.push('? matches exactly one character (not a path separator).');
  }
  if (/\[.*\]/.test(pattern)) {
    notes.push('[…] matches one character from the listed set or range.');
  }
  if (/\{.*\}/.test(pattern)) {
    notes.push('{a,b} matches either alternative.');
  }
  return notes;
}

/** Short label for a rule, e.g. for timeline markers and history tables. */
export function ruleLabel(rule: ParsedRule): string {
  return rule.raw;
}

/** One-line summary of what happened at a step, given the outcome counts. */
export function stepEffect(ignoredCount: number, keptCount: number, shadowedCount: number): string {
  const parts: string[] = [];
  if (ignoredCount > 0) {
    parts.push(`${ignoredCount} item${ignoredCount === 1 ? '' : 's'} became ignored`);
  }
  if (keptCount > 0) {
    parts.push(
      `${keptCount} item${keptCount === 1 ? '' : 's'} ${keptCount === 1 ? 'is' : 'are'} now permanently kept`,
    );
  }
  if (parts.length === 0) {
    parts.push(
      shadowedCount > 0
        ? 'no new decisions — every match was already decided by an earlier rule'
        : 'no files matched this rule',
    );
  } else if (shadowedCount > 0) {
    parts.push(
      `${shadowedCount} match${shadowedCount === 1 ? '' : 'es'} had already been decided earlier (first match wins)`,
    );
  }
  return `${parts.join('; ')}.`;
}
