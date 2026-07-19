/**
 * Evaluation engine: runs every tree node through the rule set and records
 * the complete history — which rules matched, which rule decided each file
 * (first match wins), and which matches were shadowed by earlier rules.
 */

import { flattenTree } from './tree';
import { isInternal, ruleMatches, type CompiledRuleSet } from './matcher';
import type {
  EvaluationResult,
  EvaluationStep,
  FileEvaluation,
  FileState,
  RuleMatchRecord,
  TreeNode,
} from './types';

export function evaluate(root: TreeNode, set: CompiledRuleSet): EvaluationResult {
  const files = new Map<string, FileEvaluation>();
  const steps: { ruleIndex: number; decided: string[]; shadowed: string[] }[] = set.rules.map(
    (compiled) => ({ ruleIndex: compiled.rule.index, decided: [], shadowed: [] }),
  );

  for (const node of flattenTree(root)) {
    files.set(node.path, evaluateNode(node, set, steps));
  }

  return { files, steps, ruleCount: set.rules.length };
}

function evaluateNode(
  node: TreeNode,
  set: CompiledRuleSet,
  steps: { decided: string[]; shadowed: string[] }[],
): FileEvaluation {
  if (isInternal(node.path)) {
    return {
      path: node.path,
      isDir: node.isDir,
      records: set.rules.map((c) => ({
        ruleIndex: c.rule.index,
        matched: false,
        applied: false,
        stateAfter: 'ignored' as FileState,
      })),
      finalState: 'ignored',
      decidingRule: null,
      deletable: false,
      internal: true,
    };
  }

  const records: RuleMatchRecord[] = [];
  let decidingRule: number | null = null;
  let state: FileState = 'included';
  let deletable = false;

  for (const compiled of set.rules) {
    const matched = ruleMatches(compiled, node.path);
    const applied = matched && decidingRule === null;
    if (applied) {
      decidingRule = compiled.rule.index;
      state = compiled.rule.flags.negated ? 'included' : 'ignored';
      deletable = compiled.rule.flags.deletable && !compiled.rule.flags.negated;
      steps[compiled.rule.index]?.decided.push(node.path);
    } else if (matched) {
      steps[compiled.rule.index]?.shadowed.push(node.path);
    }
    records.push({ ruleIndex: compiled.rule.index, matched, applied, stateAfter: state });
  }

  return {
    path: node.path,
    isDir: node.isDir,
    records,
    finalState: state,
    decidingRule,
    deletable,
    internal: false,
  };
}

/**
 * State of a file at a timeline position. Position `p` means "rules 0…p-1
 * have been evaluated"; 0 is the initial state where everything is included.
 */
export function stateAtPosition(evaluation: FileEvaluation, position: number): FileState {
  if (evaluation.internal) return 'ignored';
  if (evaluation.decidingRule !== null && evaluation.decidingRule < position) {
    return evaluation.finalState;
  }
  return 'included';
}

/** Whether the rule at `position - 1` matched this file (yellow highlight). */
export function matchedAtPosition(evaluation: FileEvaluation, position: number): boolean {
  if (position < 1) return false;
  return evaluation.records[position - 1]?.matched ?? false;
}

export interface StepSummary {
  ignored: string[];
  kept: string[];
  shadowed: string[];
}

/** Split a step's decided paths by outcome, for the explanation panel. */
export function summarizeStep(
  step: EvaluationStep,
  files: ReadonlyMap<string, FileEvaluation>,
): StepSummary {
  const ignored: string[] = [];
  const kept: string[] = [];
  for (const path of step.decided) {
    const file = files.get(path);
    if (file === undefined) continue;
    (file.finalState === 'ignored' ? ignored : kept).push(path);
  }
  return { ignored, kept, shadowed: [...step.shadowed] };
}
