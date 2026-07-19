/**
 * Small UI widgets: theme toggle, ignore-file tabs, diagnostics list and
 * the timeline control bar. `app.ts` wires them together.
 */

import { escapeHtml } from './utils';
import type { Diagnostic, ParsedRule } from './types';
import type { Timeline, TimelineState } from './timeline';

const THEME_KEY = 'stignore-viz-theme';

export function initThemeToggle(button: HTMLElement): void {
  const stored = localStorage.getItem(THEME_KEY);
  const preferred =
    stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset['theme'] = preferred;
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset['theme'] === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset['theme'] = next;
    localStorage.setItem(THEME_KEY, next);
  });
}

/** Tab bar over the editor: `.stignore` plus optional #include files. */
export class FileTabs {
  private readonly host: HTMLElement;
  private readonly onSelect: (name: string) => void;
  private readonly onAdd: () => void;
  private readonly onRemove: (name: string) => void;

  constructor(
    host: HTMLElement,
    handlers: {
      onSelect: (name: string) => void;
      onAdd: () => void;
      onRemove: (name: string) => void;
    },
  ) {
    this.host = host;
    this.onSelect = handlers.onSelect;
    this.onAdd = handlers.onAdd;
    this.onRemove = handlers.onRemove;
  }

  render(files: readonly string[], active: string): void {
    this.host.innerHTML = '';
    for (const name of files) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `tab ${name === active ? 'active' : ''}`;
      tab.role = 'tab';
      tab.setAttribute('aria-selected', String(name === active));
      tab.textContent = name;
      if (name !== '.stignore') {
        const close = document.createElement('span');
        close.className = 'tab-close';
        close.textContent = '×';
        close.title = `Remove ${name}`;
        close.addEventListener('click', (event) => {
          event.stopPropagation();
          this.onRemove(name);
        });
        tab.append(close);
      }
      tab.addEventListener('click', () => this.onSelect(name));
      this.host.append(tab);
    }
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'tab';
    add.title = 'Add an #include file';
    add.textContent = '+';
    add.addEventListener('click', () => this.onAdd());
    this.host.append(add);
  }
}

export class DiagnosticsList {
  private readonly host: HTMLElement;
  private readonly onJump: (source: string, line: number) => void;

  constructor(host: HTMLElement, onJump: (source: string, line: number) => void) {
    this.host = host;
    this.onJump = onJump;
  }

  render(diagnostics: readonly Diagnostic[]): void {
    this.host.innerHTML = diagnostics
      .map(
        (d, i) => `
        <div class="diag-row ${d.severity}" data-index="${i}" role="button" tabindex="0">
          <span class="diag-loc">${escapeHtml(d.source)}:${d.line}</span>
          <span>${escapeHtml(d.message)}</span>
        </div>`,
      )
      .join('');
    for (const row of this.host.querySelectorAll<HTMLElement>('.diag-row')) {
      const diagnostic = diagnostics[Number(row.dataset['index'])];
      if (diagnostic === undefined) continue;
      const jump = (): void => this.onJump(diagnostic.source, diagnostic.line);
      row.addEventListener('click', jump);
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') jump();
      });
    }
  }
}

/** Wires the playback buttons, slider and status label to a Timeline. */
export class TimelineBar {
  private readonly slider: HTMLInputElement;
  private readonly stepLabel: HTMLElement;
  private readonly ruleText: HTMLElement;
  private readonly bar: HTMLElement;
  private rules: readonly ParsedRule[] = [];

  constructor(timeline: Timeline) {
    this.bar = document.getElementById('timeline-panel') as HTMLElement;
    this.slider = document.getElementById('tl-slider') as HTMLInputElement;
    this.stepLabel = document.getElementById('tl-step-label') as HTMLElement;
    this.ruleText = document.getElementById('tl-rule-text') as HTMLElement;

    const on = (id: string, fn: () => void): void => {
      (document.getElementById(id) as HTMLButtonElement).addEventListener('click', fn);
    };
    on('tl-reset', () => timeline.reset());
    on('tl-prev', () => timeline.previous());
    on('tl-play', () => timeline.toggle());
    on('tl-next', () => timeline.next());
    on('tl-end', () => timeline.jumpToFinal());
    this.slider.addEventListener('input', () => timeline.seek(Number(this.slider.value)));
  }

  setRules(rules: readonly ParsedRule[]): void {
    this.rules = rules;
  }

  update(state: TimelineState): void {
    this.slider.max = String(state.ruleCount);
    this.slider.value = String(state.position);
    this.bar.classList.toggle('playing', state.playing);
    const playButton = document.getElementById('tl-play') as HTMLButtonElement;
    playButton.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');

    if (state.position === 0) {
      this.stepLabel.textContent = 'Initial state';
      this.ruleText.textContent =
        state.ruleCount === 0 ? 'no rules defined' : 'everything included';
      return;
    }
    const rule = this.rules[state.position - 1];
    const isFinal = state.position === state.ruleCount;
    this.stepLabel.textContent = `Rule ${state.position} / ${state.ruleCount}${isFinal ? ' — final' : ''}`;
    this.ruleText.textContent = rule?.raw ?? '';
  }
}

/** Global keyboard shortcuts. Skips events targeting editable elements. */
export function initKeyboardShortcuts(handlers: {
  timeline: Timeline;
  focusSearch: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}): void {
  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    const editing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable;
    if (editing) return;

    switch (event.key) {
      case 'ArrowLeft':
        handlers.timeline.previous();
        break;
      case 'ArrowRight':
        handlers.timeline.next();
        break;
      case ' ':
        handlers.timeline.toggle();
        break;
      case 'Home':
        handlers.timeline.reset();
        break;
      case 'End':
        handlers.timeline.jumpToFinal();
        break;
      case '/':
        handlers.focusSearch();
        break;
      case '+':
      case '=':
        handlers.zoomIn();
        break;
      case '-':
        handlers.zoomOut();
        break;
      default:
        return;
    }
    event.preventDefault();
  });
}
