/**
 * Explanation panel: renders the current-step narrative and the per-file
 * detail view (full evaluation history for a selected file).
 */

import { explainRule, stepEffect } from './explain';
import { stateAtPosition, summarizeStep } from './history';
import { escapeHtml, pluralize } from './utils';
import type { EvaluationResult, FileEvaluation, ParsedRule } from './types';

export type ExplainTab = 'step' | 'file';

export interface ExplainPanelCallbacks {
  onPathClick: (path: string) => void;
  onTabChange: (tab: ExplainTab) => void;
}

export class ExplainPanel {
  private readonly content: HTMLElement;
  private readonly stepTab: HTMLButtonElement;
  private readonly fileTab: HTMLButtonElement;
  private readonly callbacks: ExplainPanelCallbacks;
  private tab: ExplainTab = 'step';

  constructor(
    content: HTMLElement,
    stepTab: HTMLButtonElement,
    fileTab: HTMLButtonElement,
    callbacks: ExplainPanelCallbacks,
  ) {
    this.content = content;
    this.stepTab = stepTab;
    this.fileTab = fileTab;
    this.callbacks = callbacks;
    stepTab.addEventListener('click', () => this.setTab('step'));
    fileTab.addEventListener('click', () => this.setTab('file'));
    this.content.addEventListener('click', (event) => {
      const item = (event.target as Element).closest<HTMLElement>('[data-path]');
      const path = item?.dataset['path'];
      if (path !== undefined) this.callbacks.onPathClick(path);
    });
  }

  setTab(tab: ExplainTab): void {
    this.tab = tab;
    this.stepTab.classList.toggle('active', tab === 'step');
    this.stepTab.setAttribute('aria-selected', String(tab === 'step'));
    this.fileTab.classList.toggle('active', tab === 'file');
    this.fileTab.setAttribute('aria-selected', String(tab === 'file'));
    this.callbacks.onTabChange(tab);
  }

  get activeTab(): ExplainTab {
    return this.tab;
  }

  renderStep(
    evaluation: EvaluationResult,
    rules: readonly ParsedRule[],
    position: number,
  ): void {
    if (this.tab !== 'step') return;
    if (position === 0) {
      const total = evaluation.files.size;
      this.content.innerHTML = `
        <h3>Initial state</h3>
        <p class="explain-text">Before any rule runs, <strong>every item is included</strong> —
        Syncthing syncs everything it finds. ${pluralize(total, 'item')} in this tree.</p>
        <p class="explain-text">Step through the timeline to watch each rule claim the files it
        matches. Remember: the <strong>first</strong> rule that matches a file decides its fate;
        later rules cannot change it.</p>`;
      return;
    }

    const rule = rules[position - 1];
    const step = evaluation.steps[position - 1];
    if (rule === undefined || step === undefined) {
      this.content.innerHTML = '<p class="explain-text muted">No rule at this position.</p>';
      return;
    }
    const summary = summarizeStep(step, evaluation.files);
    const effect = stepEffect(summary.ignored.length, summary.kept.length, summary.shadowed.length);

    const section = (title: string, paths: string[], chipClass: string, chipText: string): string =>
      paths.length === 0
        ? ''
        : `<h3>${title}</h3>
           <ul class="path-list">${paths
             .map(
               (p) =>
                 `<li data-path="${escapeHtml(p)}"><span class="chip ${chipClass}">${chipText}</span><code>${escapeHtml(p)}</code></li>`,
             )
             .join('')}</ul>`;

    this.content.innerHTML = `
      <h3>Rule ${position} of ${rules.length}</h3>
      <code class="rule-display">${escapeHtml(rule.raw)}</code>
      <h3>Explanation</h3>
      <p class="explain-text">${escapeHtml(explainRule(rule))}</p>
      <h3>Effect</h3>
      <p class="explain-text">${escapeHtml(effect)}</p>
      ${section('Newly ignored', summary.ignored, 'ignored', 'ignored')}
      ${section('Permanently kept', summary.kept, 'included', 'kept')}
      ${section(
        'Matched, but already decided (first match wins)',
        summary.shadowed,
        'neutral',
        'shadowed',
      )}`;
  }

  renderFile(
    evaluation: EvaluationResult | null,
    rules: readonly ParsedRule[],
    path: string | null,
  ): void {
    if (this.tab !== 'file') return;
    const file = path === null ? undefined : evaluation?.files.get(path);
    if (file === undefined || evaluation === null) {
      this.content.innerHTML = `<p class="explain-text muted">
        Click a file or folder in the tree to see its full evaluation history.</p>`;
      return;
    }
    this.content.innerHTML = this.fileDetailHtml(evaluation, rules, file);
  }

  private fileDetailHtml(
    evaluation: EvaluationResult,
    rules: readonly ParsedRule[],
    file: FileEvaluation,
  ): string {
    const stateChip = (state: string): string =>
      `<span class="chip ${state}">${state}</span>`;

    const rows = rules
      .map((rule, i) => {
        const record = file.records[i];
        if (record === undefined) return '';
        const outcome = record.applied
          ? `<strong>${rule.flags.negated ? 'kept by this rule' : 'ignored by this rule'}</strong>`
          : record.matched
            ? `matched, but already decided by rule ${(file.decidingRule ?? 0) + 1}`
            : '<span class="muted">no match</span>';
        return `<tr class="${record.applied ? 'applied' : ''}">
          <td>${i + 1}</td>
          <td><code>${escapeHtml(rule.raw)}</code></td>
          <td>${outcome}</td>
          <td>${stateChip(record.stateAfter)}</td>
        </tr>`;
      })
      .join('');

    const decidingRule = file.decidingRule === null ? undefined : rules[file.decidingRule];
    const finalExplanation = file.internal
      ? 'This is a Syncthing internal file — it is always ignored, before any pattern is consulted.'
      : decidingRule === undefined
        ? 'No rule matched this item, so it falls back to the default: included and synced.'
        : `Decided by rule ${file.decidingRule! + 1} (<code>${escapeHtml(decidingRule.raw)}</code>): ${escapeHtml(explainRule(decidingRule))}`;

    const ancestorNote = this.ancestorConflictNote(evaluation, file);

    return `
      <h3>${file.isDir ? 'Folder' : 'File'}</h3>
      <code class="rule-display">/${escapeHtml(file.path)}</code>
      <p class="explain-text">
        Final state: ${stateChip(file.finalState)}
        ${file.deletable ? '<span class="chip matched">deletable (?d)</span>' : ''}
        ${file.internal ? '<span class="chip neutral">internal</span>' : ''}
      </p>
      <h3>Why</h3>
      <p class="explain-text">${finalExplanation}</p>
      ${ancestorNote}
      <h3>Evaluation history</h3>
      <table class="history-table">
        <thead><tr><th>#</th><th>Rule</th><th>Result</th><th>State after</th></tr></thead>
        <tbody>
          <tr><td>—</td><td><span class="muted">initial state</span></td>
            <td><span class="muted">everything starts included</span></td>
            <td>${stateChip('included')}</td></tr>
          ${rows}
        </tbody>
      </table>`;
  }

  /** Note when a kept file sits inside an ignored directory (and vice versa). */
  private ancestorConflictNote(evaluation: EvaluationResult, file: FileEvaluation): string {
    if (file.finalState !== 'included' || file.internal) return '';
    let parent = file.path;
    while (parent.includes('/')) {
      parent = parent.slice(0, parent.lastIndexOf('/'));
      const ancestor = evaluation.files.get(parent);
      if (ancestor !== undefined && stateAtPosition(ancestor, Number.MAX_SAFE_INTEGER) === 'ignored') {
        return `<div class="callout warn">This item is kept, but its parent folder
          <code>/${escapeHtml(parent)}</code> is ignored. Syncthing still syncs the file and
          creates the folder path for it, but scanning inside ignored folders makes scans
          slower. Rooted negations (e.g. <code>!/path/file</code>) avoid the slowdown.</div>`;
      }
    }
    return '';
  }
}
