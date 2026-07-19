/**
 * Lightweight `.stignore` editor: a transparent textarea layered over a
 * syntax-highlighted <pre>, with a gutter for line numbers and diagnostics,
 * plus a minimal prefix/directive autocomplete.
 */

import { escapeHtml } from './utils';
import type { Diagnostic, LineInfo } from './types';

export interface EditorCallbacks {
  onChange: (text: string) => void;
}

interface Suggestion {
  insert: string;
  label: string;
  hint: string;
}

const PREFIX_SUGGESTIONS: Suggestion[] = [
  { insert: '(?i)', label: '(?i)', hint: 'case-insensitive match' },
  { insert: '(?d)', label: '(?d)', hint: 'deletable when blocking dir removal' },
];

const HASH_SUGGESTIONS: Suggestion[] = [
  { insert: '#include ', label: '#include', hint: 'inline patterns from another file' },
  { insert: '#escape=\\', label: '#escape=', hint: 'set escape character (first line)' },
];

export class IgnoreEditor {
  private readonly gutter: HTMLElement;
  private readonly highlight: HTMLElement;
  private readonly textarea: HTMLTextAreaElement;
  private readonly autocomplete: HTMLElement;
  private readonly callbacks: EditorCallbacks;

  private lineInfos: LineInfo[] = [];
  private diagnostics: Diagnostic[] = [];
  private currentRule: number | null = null;
  private suggestions: Suggestion[] = [];
  private activeSuggestion = 0;

  constructor(host: HTMLElement, callbacks: EditorCallbacks) {
    this.callbacks = callbacks;
    host.innerHTML = `
      <div class="editor">
        <div class="editor-gutter"></div>
        <div class="editor-scroll">
          <pre class="editor-highlight" aria-hidden="true"></pre>
          <textarea class="editor-input" name="ignore-patterns" spellcheck="false"
            autocapitalize="off" autocomplete="off" aria-label="Ignore patterns"></textarea>
          <div class="autocomplete" hidden role="listbox"></div>
        </div>
      </div>`;
    this.gutter = host.querySelector('.editor-gutter') as HTMLElement;
    this.highlight = host.querySelector('.editor-highlight') as HTMLElement;
    this.textarea = host.querySelector('.editor-input') as HTMLTextAreaElement;
    this.autocomplete = host.querySelector('.autocomplete') as HTMLElement;
    this.bindEvents();
  }

  get value(): string {
    return this.textarea.value;
  }

  setValue(text: string): void {
    if (this.textarea.value === text) return;
    this.textarea.value = text;
    this.render();
  }

  /** Update per-line metadata (kinds + diagnostics) for the active file. */
  setAnnotations(lineInfos: LineInfo[], diagnostics: Diagnostic[]): void {
    this.lineInfos = lineInfos;
    this.diagnostics = diagnostics;
    this.render();
  }

  /** Highlight the line holding the given rule index (or clear with null). */
  setCurrentRule(ruleIndex: number | null): void {
    if (this.currentRule === ruleIndex) return;
    this.currentRule = ruleIndex;
    this.render();
  }

  focusLine(line: number): void {
    const lines = this.textarea.value.split('\n');
    const offset = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0);
    this.textarea.focus();
    this.textarea.setSelectionRange(offset, offset + (lines[line - 1]?.length ?? 0));
  }

  private bindEvents(): void {
    this.textarea.addEventListener('input', () => {
      this.render();
      this.updateAutocomplete();
      this.callbacks.onChange(this.textarea.value);
    });
    this.textarea.addEventListener('scroll', () => {
      this.highlight.scrollTop = this.textarea.scrollTop;
      this.highlight.scrollLeft = this.textarea.scrollLeft;
      this.gutter.scrollTop = this.textarea.scrollTop;
      this.hideAutocomplete();
    });
    this.textarea.addEventListener('keydown', (event) => this.handleKey(event));
    this.textarea.addEventListener('blur', () => {
      // Delay so clicking a suggestion still lands.
      setTimeout(() => this.hideAutocomplete(), 150);
    });
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.autocomplete.hidden) return;
    if (event.key === 'Escape') {
      this.hideAutocomplete();
      event.preventDefault();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      this.activeSuggestion =
        (this.activeSuggestion + delta + this.suggestions.length) % this.suggestions.length;
      this.renderSuggestions();
      event.preventDefault();
    } else if (event.key === 'Tab' || event.key === 'Enter') {
      const chosen = this.suggestions[this.activeSuggestion];
      if (chosen !== undefined) {
        this.applySuggestion(chosen);
        event.preventDefault();
      }
    }
  }

  private currentLine(): { index: number; text: string; start: number } {
    const pos = this.textarea.selectionStart;
    const before = this.textarea.value.slice(0, pos);
    const start = before.lastIndexOf('\n') + 1;
    const index = before.split('\n').length - 1;
    const end = this.textarea.value.indexOf('\n', start);
    return {
      index,
      text: this.textarea.value.slice(start, end === -1 ? undefined : end),
      start,
    };
  }

  private updateAutocomplete(): void {
    const { index, text } = this.currentLine();
    const caretCol = this.textarea.selectionStart - this.currentLine().start;
    const beforeCaret = text.slice(0, caretCol);

    let suggestions: Suggestion[] = [];
    if (/(^|\))\(\??$/.test(beforeCaret)) {
      suggestions = PREFIX_SUGGESTIONS;
    } else if (/^#[a-z]*$/.test(beforeCaret)) {
      suggestions = HASH_SUGGESTIONS.filter((s) => s.label.startsWith(beforeCaret));
    }
    if (suggestions.length === 0) {
      this.hideAutocomplete();
      return;
    }
    this.suggestions = suggestions;
    this.activeSuggestion = 0;
    this.renderSuggestions();
    this.autocomplete.hidden = false;
    const lineHeight = 20;
    this.autocomplete.style.left = '60px';
    this.autocomplete.style.top = `${(index + 1) * lineHeight + 10 - this.textarea.scrollTop}px`;
  }

  private renderSuggestions(): void {
    this.autocomplete.innerHTML = this.suggestions
      .map(
        (s, i) => `
        <button type="button" role="option" data-index="${i}"
          class="${i === this.activeSuggestion ? 'active' : ''}">
          <code>${escapeHtml(s.label)}</code><span class="ac-hint">${escapeHtml(s.hint)}</span>
        </button>`,
      )
      .join('');
    for (const btn of this.autocomplete.querySelectorAll('button')) {
      btn.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const chosen = this.suggestions[Number(btn.dataset['index'])];
        if (chosen !== undefined) this.applySuggestion(chosen);
      });
    }
  }

  private applySuggestion(suggestion: Suggestion): void {
    const { text, start } = this.currentLine();
    const caret = this.textarea.selectionStart;
    const col = caret - start;
    // Replace the partial token before the caret with the suggestion.
    const tokenMatch = text.slice(0, col).match(/(\(\??|#[a-z]*)$/);
    const tokenStart = start + col - (tokenMatch?.[0]?.length ?? 0);
    this.textarea.setRangeText(suggestion.insert, tokenStart, caret, 'end');
    this.hideAutocomplete();
    this.render();
    this.callbacks.onChange(this.textarea.value);
  }

  private hideAutocomplete(): void {
    this.autocomplete.hidden = true;
    this.suggestions = [];
  }

  private render(): void {
    const lines = this.textarea.value.split('\n');
    const diagsByLine = new Map<number, Diagnostic[]>();
    for (const diagnostic of this.diagnostics) {
      const list = diagsByLine.get(diagnostic.line) ?? [];
      list.push(diagnostic);
      diagsByLine.set(diagnostic.line, list);
    }

    this.highlight.innerHTML = `${lines
      .map((line, i) => this.renderLine(line, i, diagsByLine.get(i + 1)))
      .join('')}\n`;

    this.gutter.innerHTML = lines
      .map((_, i) => {
        const info = this.lineInfos[i];
        const isCurrent =
          this.currentRule !== null && info?.kind === 'rule' && info.ruleIndex === this.currentRule;
        const diags = diagsByLine.get(i + 1) ?? [];
        const worst = diags.find((d) => d.severity === 'error') ?? diags[0];
        const dot =
          worst === undefined
            ? ''
            : `<span class="diag-dot ${worst.severity}" title="${escapeHtml(worst.message)}"></span>`;
        return `<div class="gutter-line ${isCurrent ? 'current-rule' : ''}">${dot}${i + 1}</div>`;
      })
      .join('');
  }

  private renderLine(line: string, index: number, diags: Diagnostic[] | undefined): string {
    const info = this.lineInfos[index];
    const classes = ['hl-line'];
    if (
      this.currentRule !== null &&
      info?.kind === 'rule' &&
      info.ruleIndex === this.currentRule
    ) {
      classes.push('current-rule');
    }
    const worst = diags?.find((d) => d.severity === 'error') ?? diags?.[0];
    if (worst !== undefined) classes.push(`dg-${worst.severity === 'error' ? 'error' : 'warning'}`);
    const body = line === '' ? '&nbsp;' : this.tokenize(line, info);
    return `<span class="${classes.join(' ')}">${body}</span>`;
  }

  private tokenize(line: string, info: LineInfo | undefined): string {
    const trimmed = line.trimStart();
    if (info?.kind === 'comment' || trimmed.startsWith('//')) {
      return `<span class="tok-comment">${escapeHtml(line)}</span>`;
    }
    if (info?.kind === 'include' || info?.kind === 'escape') {
      const match = line.match(/^(\s*)(#include\s|#escape=)(.*)$/);
      if (match !== null) {
        return (
          escapeHtml(match[1] ?? '') +
          `<span class="tok-directive">${escapeHtml(match[2] ?? '')}</span>` +
          `<span class="tok-string">${escapeHtml(match[3] ?? '')}</span>`
        );
      }
    }
    return this.tokenizeRule(line);
  }

  /** Token colors for a pattern line: prefixes, anchors, wildcards, escapes. */
  private tokenizeRule(line: string): string {
    let out = '';
    let i = 0;
    // Leading whitespace + prefixes.
    const lead = line.match(/^\s*/) as RegExpMatchArray;
    out += escapeHtml(lead[0]);
    i = lead[0].length;
    for (;;) {
      const rest = line.slice(i);
      const prefix = rest.match(/^(!|\(\?i\)|\(\?d\))/);
      if (prefix === null) break;
      out += `<span class="tok-prefix">${escapeHtml(prefix[0])}</span>`;
      i += prefix[0].length;
    }
    if (line[i] === '/') {
      out += '<span class="tok-root">/</span>';
      i += 1;
    }
    while (i < line.length) {
      const ch = line[i] as string;
      const next = line[i + 1];
      if ((ch === '\\' || ch === '|') && next !== undefined) {
        out += `<span class="tok-escape">${escapeHtml(ch + next)}</span>`;
        i += 2;
      } else if (ch === '*' || ch === '?' || ch === '[' || ch === ']' || ch === '{' || ch === '}' || ch === ',') {
        out += `<span class="tok-wild">${escapeHtml(ch)}</span>`;
        i += 1;
      } else if (ch === '/' && i === line.length - 1) {
        out += '<span class="tok-root">/</span>';
        i += 1;
      } else {
        out += escapeHtml(ch);
        i += 1;
      }
    }
    return out;
  }
}
