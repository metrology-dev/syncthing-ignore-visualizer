import { describe, expect, it } from 'vitest';
import { evaluate, matchedAtPosition, stateAtPosition, summarizeStep } from '../src/history';
import { compileRules } from '../src/matcher';
import { parseIgnoreFiles, ROOT_IGNORE_FILE } from '../src/parser';
import { buildTree } from '../src/tree';
import type { Platform } from '../src/types';

function run(rulesText: string, paths: string[], platform: Platform = 'linux') {
  const parsed = parseIgnoreFiles(new Map([[ROOT_IGNORE_FILE, rulesText]]), { platform });
  const set = compileRules(parsed.rules, platform);
  const tree = buildTree(paths.map((p) => ({ path: p, isDir: false })));
  return evaluate(tree, set);
}

describe('evaluate', () => {
  it('records complete per-file history with first-match-wins', () => {
    const result = run('!important.tmp\n*.tmp\ncache/\n', [
      'important.tmp',
      'temp.tmp',
      'notes.txt',
      'cache/index.db',
    ]);

    const important = result.files.get('important.tmp');
    expect(important?.finalState).toBe('included');
    expect(important?.decidingRule).toBe(0);
    expect(important?.records.map((r) => r.matched)).toEqual([true, true, false]);
    expect(important?.records.map((r) => r.applied)).toEqual([true, false, false]);

    const temp = result.files.get('temp.tmp');
    expect(temp?.finalState).toBe('ignored');
    expect(temp?.decidingRule).toBe(1);

    const notes = result.files.get('notes.txt');
    expect(notes?.finalState).toBe('included');
    expect(notes?.decidingRule).toBeNull();

    expect(result.files.get('cache')?.finalState).toBe('included');
    expect(result.files.get('cache/index.db')?.finalState).toBe('ignored');
  });

  it('collects decided and shadowed paths per step', () => {
    const result = run('!important.tmp\n*.tmp\n', ['important.tmp', 'temp.tmp']);
    expect(result.steps[0]?.decided).toEqual(['important.tmp']);
    expect(result.steps[1]?.decided).toEqual(['temp.tmp']);
    expect(result.steps[1]?.shadowed).toEqual(['important.tmp']);
  });

  it('marks internal files ignored without consuming a rule', () => {
    const result = run('*.tmp\n', ['.stfolder', 'notes.txt']);
    const internal = result.files.get('.stfolder');
    expect(internal?.internal).toBe(true);
    expect(internal?.finalState).toBe('ignored');
    expect(internal?.decidingRule).toBeNull();
  });

  it('propagates deletable from (?d) deciding rules', () => {
    const result = run('(?d).DS_Store\n', ['images/.DS_Store']);
    expect(result.files.get('images/.DS_Store')?.deletable).toBe(true);
  });
});

describe('stateAtPosition / matchedAtPosition', () => {
  it('replays the timeline correctly', () => {
    const result = run('!important.tmp\n*.tmp\n', ['important.tmp', 'temp.tmp']);
    const important = result.files.get('important.tmp');
    const temp = result.files.get('temp.tmp');
    if (important === undefined || temp === undefined) throw new Error('missing evaluations');

    // Position 0: initial — everything included.
    expect(stateAtPosition(important, 0)).toBe('included');
    expect(stateAtPosition(temp, 0)).toBe('included');
    expect(matchedAtPosition(important, 0)).toBe(false);

    // Position 1: rule 0 (!important.tmp) applied.
    expect(matchedAtPosition(important, 1)).toBe(true);
    expect(stateAtPosition(important, 1)).toBe('included');
    expect(stateAtPosition(temp, 1)).toBe('included');

    // Position 2: rule 1 (*.tmp) applied — temp ignored, important survives.
    expect(matchedAtPosition(temp, 2)).toBe(true);
    expect(matchedAtPosition(important, 2)).toBe(true); // matched but shadowed
    expect(stateAtPosition(temp, 2)).toBe('ignored');
    expect(stateAtPosition(important, 2)).toBe('included');
  });
});

describe('summarizeStep', () => {
  it('splits outcomes into ignored / kept / shadowed', () => {
    const result = run('!keep.tmp\n*.tmp\n', ['keep.tmp', 'a.tmp', 'b.tmp']);
    const step0 = summarizeStep(result.steps[0]!, result.files);
    expect(step0.kept).toEqual(['keep.tmp']);
    expect(step0.ignored).toEqual([]);
    const step1 = summarizeStep(result.steps[1]!, result.files);
    expect(step1.ignored.sort()).toEqual(['a.tmp', 'b.tmp']);
    expect(step1.shadowed).toEqual(['keep.tmp']);
  });
});
