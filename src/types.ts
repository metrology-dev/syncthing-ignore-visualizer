/**
 * Core shared types for the Syncthing ignore pattern visualizer.
 */

/** Sync state of a node at some point during evaluation. */
export type FileState = 'included' | 'ignored';

/** Platform preset — controls default case sensitivity and the escape character. */
export type Platform = 'linux' | 'macos' | 'windows';

export interface RuleFlags {
  /** `!` prefix — matching items are kept (not ignored). */
  negated: boolean;
  /** `(?i)` prefix — pattern matches case-insensitively. */
  caseInsensitive: boolean;
  /** `(?d)` prefix — matching files may be deleted to allow directory removal. */
  deletable: boolean;
}

/** One effective ignore rule (comments and blank lines excluded). */
export interface ParsedRule {
  /** Evaluation order index, 0-based, across all files (includes are inlined). */
  index: number;
  /** Name of the ignore file this rule came from (e.g. `.stignore`). */
  source: string;
  /** 1-based line number within its source file. */
  line: number;
  /** Original line text as written. */
  raw: string;
  /** Pattern after prefixes and any leading root `/` are stripped. */
  pattern: string;
  flags: RuleFlags;
  /** Leading `/` — pattern matches only relative to the folder root. */
  rooted: boolean;
  /** Trailing `/` — matches the directory contents but not the directory itself. */
  contentsOnly: boolean;
  /** Escape character in effect for this rule's source file. */
  escapeChar: string;
  /** Glob syntax error; an erroneous rule never matches anything. */
  error?: string;
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  source: string;
  line: number;
  severity: DiagnosticSeverity;
  message: string;
}

export type LineKind = 'blank' | 'comment' | 'rule' | 'include' | 'escape' | 'invalid';

/** Editor-facing classification of a single line of an ignore file. */
export interface LineInfo {
  kind: LineKind;
  /** Set when kind is 'rule': global evaluation index of the rule. */
  ruleIndex?: number;
}

export interface ParseResult {
  rules: ParsedRule[];
  diagnostics: Diagnostic[];
  /** Per-file line classifications, keyed by file name. */
  lines: Map<string, LineInfo[]>;
}

/** Immutable folder tree node. Root has empty name and path. */
export interface TreeNode {
  name: string;
  /** '/'-separated path relative to the folder root; '' for the root itself. */
  path: string;
  isDir: boolean;
  children: readonly TreeNode[];
}

/** How one rule related to one file during evaluation. */
export interface RuleMatchRecord {
  ruleIndex: number;
  matched: boolean;
  /** True when this rule was the first match and decided the file's fate. */
  applied: boolean;
  /** File state after this rule was considered. */
  stateAfter: FileState;
}

export interface FileEvaluation {
  path: string;
  isDir: boolean;
  records: readonly RuleMatchRecord[];
  finalState: FileState;
  /** Index of the deciding (first matching) rule, or null → default include. */
  decidingRule: number | null;
  /** Decided by a `(?d)` rule — ignored but deletable for directory removal. */
  deletable: boolean;
  /** Always-ignored Syncthing internal file (.stfolder, .stignore, …). */
  internal: boolean;
}

/** What a single rule did when it was evaluated. */
export interface EvaluationStep {
  ruleIndex: number;
  /** Paths whose fate this rule decided (their first match). */
  decided: readonly string[];
  /** Paths matching this rule that an earlier rule had already decided. */
  shadowed: readonly string[];
}

export interface EvaluationResult {
  files: ReadonlyMap<string, FileEvaluation>;
  steps: readonly EvaluationStep[];
  ruleCount: number;
}
