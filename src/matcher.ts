/**
 * Rule compiler and matcher — the heart of the visualizer.
 *
 * Mirrors Syncthing's `lib/ignore` pattern expansion:
 *
 *   /foo    → foo, foo/**                        (rooted)
 *   **&#47;foo → **&#47;foo (+/**), foo (+/**)        (explicit any-depth)
 *   foo     → foo, foo/**, **&#47;foo, **&#47;foo/**   (matches at any depth)
 *   foo/    → foo/**, **&#47;foo/**                 (contents only, not the dir)
 *
 * Matching walks the rules in order; the FIRST rule whose compiled variants
 * match the path decides the file's fate. This is the key difference from
 * .gitignore, where the last match wins.
 */

import { globToRegExp } from './glob';
import type { ParsedRule, Platform } from './types';
import { platformCaseInsensitive } from './parser';

export interface CompiledVariant {
  glob: string;
  regex: RegExp;
}

export interface CompiledRule {
  rule: ParsedRule;
  variants: readonly CompiledVariant[];
}

export interface CompiledRuleSet {
  rules: readonly CompiledRule[];
  platform: Platform;
}

export interface MatchResult {
  ruleIndex: number;
  ignored: boolean;
  deletable: boolean;
  /** The specific expanded variant that matched, for explanations. */
  variant: string;
}

export function compileRules(rules: readonly ParsedRule[], platform: Platform): CompiledRuleSet {
  const caseFoldAll = platformCaseInsensitive(platform);
  const compiled = rules.map((rule): CompiledRule => {
    if (rule.error !== undefined) return { rule, variants: [] };
    const flags = rule.flags.caseInsensitive || caseFoldAll ? 'i' : '';
    const variants: CompiledVariant[] = [];
    for (const glob of expandRule(rule)) {
      const result = globToRegExp(glob, rule.escapeChar);
      if (result.error === undefined) {
        variants.push({ glob, regex: new RegExp(result.source, flags) });
      }
    }
    return { rule, variants };
  });
  return { rules: compiled, platform };
}

/** Expanded glob variants for a rule, in Syncthing's order. */
export function expandRule(rule: ParsedRule): string[] {
  const p = rule.pattern;
  if (rule.rooted) return withContentsVariant(p);
  if (p.startsWith('**/')) {
    return [...withContentsVariant(p), ...withContentsVariant(p.slice(3))];
  }
  return [...withContentsVariant(p), ...withContentsVariant(`**/${p}`)];
}

/**
 * Syncthing's addPattern: a plain pattern also gets a `/**` variant so a
 * matched directory ignores everything inside it; a trailing `/` instead
 * becomes `dir/**` (contents only, the directory itself stays synced).
 */
function withContentsVariant(glob: string): string[] {
  if (glob.endsWith('/**')) return [glob];
  if (glob.endsWith('/')) return [`${glob}**`];
  return [glob, `${glob}/**`];
}

/** True when this single rule matches the path (any variant). */
export function ruleMatches(compiled: CompiledRule, path: string): boolean {
  return compiled.variants.some((v) => v.regex.test(path));
}

/**
 * Match a path against the rule set. Returns the first matching rule
 * (Syncthing semantics) or null when nothing matches (default: included).
 */
export function matchPath(set: CompiledRuleSet, path: string): MatchResult | null {
  for (const compiled of set.rules) {
    const variant = compiled.variants.find((v) => v.regex.test(path));
    if (variant !== undefined) {
      return {
        ruleIndex: compiled.rule.index,
        ignored: !compiled.rule.flags.negated,
        deletable: compiled.rule.flags.deletable && !compiled.rule.flags.negated,
        variant: variant.glob,
      };
    }
  }
  return null;
}

const INTERNAL_NAMES = new Set(['.stfolder', '.stignore', '.stversions']);

/**
 * Files Syncthing always ignores regardless of patterns: its own marker
 * files and temporary files (`~syncthing~…tmp`, `.syncthing.…tmp`).
 */
export function isInternal(path: string): boolean {
  const name = path.split('/').pop() ?? path;
  const root = path.split('/')[0] ?? path;
  // Only the top-level marker files are special; a `.stignore` nested in a
  // subdirectory is an ordinary (synced) file in Syncthing.
  if (INTERNAL_NAMES.has(root)) return true;
  return (
    (name.startsWith('~syncthing~') && name.endsWith('.tmp')) ||
    (name.startsWith('.syncthing.') && name.endsWith('.tmp'))
  );
}
