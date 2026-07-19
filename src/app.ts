/**
 * Application bootstrap: owns the state (tree, ignore files, platform),
 * runs the parse → compile → evaluate pipeline, and wires the panels.
 */

import { IgnoreEditor } from './editor';
import { evaluate, stateAtPosition } from './history';
import { ImportDialog } from './importDialog';
import { compileRules } from './matcher';
import { parseIgnoreFiles, ROOT_IGNORE_FILE } from './parser';
import { ExplainPanel } from './explainPanel';
import { TreeRenderer } from './renderer';
import { Timeline } from './timeline';
import { DEFAULT_RULES, defaultTree } from './tree';
import {
  DiagnosticsList,
  FileTabs,
  initKeyboardShortcuts,
  initThemeToggle,
  TimelineBar,
} from './ui';
import { debounce, escapeHtml } from './utils';
import type { EvaluationResult, ParseResult, Platform, TreeNode } from './types';

const RECOMPUTE_DEBOUNCE_MS = 160;

class App {
  private files = new Map<string, string>([[ROOT_IGNORE_FILE, DEFAULT_RULES]]);
  private activeFile = ROOT_IGNORE_FILE;
  private platform: Platform = 'linux';
  private tree: TreeNode = defaultTree();
  private parse!: ParseResult;
  private evaluation!: EvaluationResult;
  private selectedPath: string | null = null;

  private readonly timeline = new Timeline();
  private readonly timelineBar = new TimelineBar(this.timeline);
  private readonly editor: IgnoreEditor;
  private readonly renderer: TreeRenderer;
  private readonly explainPanel: ExplainPanel;
  private readonly fileTabs: FileTabs;
  private readonly diagnosticsList: DiagnosticsList;
  private readonly searchInput = document.getElementById('search-input') as HTMLInputElement;

  constructor() {
    this.editor = new IgnoreEditor(document.getElementById('editor-host') as HTMLElement, {
      onChange: debounce((text: string) => {
        this.files.set(this.activeFile, text);
        this.recompute();
      }, RECOMPUTE_DEBOUNCE_MS),
    });

    this.renderer = new TreeRenderer(
      document.getElementById('tree-container') as HTMLElement,
      document.getElementById('tree-svg') as unknown as SVGSVGElement,
      document.getElementById('tooltip') as HTMLElement,
      {
        onSelect: (path) => this.selectPath(path),
        tooltipHtml: (path) => this.tooltipHtml(path),
      },
    );

    this.explainPanel = new ExplainPanel(
      document.getElementById('explain-content') as HTMLElement,
      document.getElementById('tab-step') as HTMLButtonElement,
      document.getElementById('tab-file') as HTMLButtonElement,
      {
        onPathClick: (path) => this.selectPath(path),
        onTabChange: () => this.renderExplanation(),
      },
    );

    this.fileTabs = new FileTabs(document.getElementById('file-tabs') as HTMLElement, {
      onSelect: (name) => this.switchFile(name),
      onAdd: () => this.addIncludeFile(),
      onRemove: (name) => this.removeIncludeFile(name),
    });

    this.diagnosticsList = new DiagnosticsList(
      document.getElementById('diagnostics') as HTMLElement,
      (source, line) => {
        this.switchFile(source);
        this.editor.focusLine(line);
      },
    );

    this.timeline.onChange((state) => {
      this.timelineBar.update(state);
      this.renderer.setPosition(state.position);
      this.editor.setCurrentRule(this.currentRuleInActiveFile(state.position));
      this.renderExplanation();
    });

    this.bindHeaderControls();
    initThemeToggle(document.getElementById('theme-toggle') as HTMLElement);
    initKeyboardShortcuts({
      timeline: this.timeline,
      focusSearch: () => this.searchInput.focus(),
      zoomIn: () => this.renderer.zoomIn(),
      zoomOut: () => this.renderer.zoomOut(),
    });

    this.editor.setValue(DEFAULT_RULES);
    this.renderer.setTree(this.tree);
    this.recompute();
  }

  /** Parse rules, compile, evaluate the tree, refresh all panels. */
  private recompute(): void {
    this.parse = parseIgnoreFiles(this.files, { platform: this.platform });
    const set = compileRules(this.parse.rules, this.platform);
    this.evaluation = evaluate(this.tree, set);

    this.timeline.setRuleCount(this.parse.rules.length);
    this.timelineBar.setRules(this.parse.rules);
    this.renderer.setEvaluation(this.evaluation, this.timeline.state.position);

    this.editor.setAnnotations(
      this.parse.lines.get(this.activeFile) ?? [],
      this.parse.diagnostics.filter((d) => d.source === this.activeFile),
    );
    this.editor.setCurrentRule(this.currentRuleInActiveFile(this.timeline.state.position));
    this.diagnosticsList.render(this.parse.diagnostics);
    this.fileTabs.render([...this.files.keys()], this.activeFile);
    this.renderExplanation();
  }

  private renderExplanation(): void {
    if (this.explainPanel.activeTab === 'step') {
      this.explainPanel.renderStep(this.evaluation, this.parse.rules, this.timeline.state.position);
    } else {
      this.explainPanel.renderFile(this.evaluation, this.parse.rules, this.selectedPath);
    }
  }

  /** Rule index shown at this timeline position if it lives in the active tab. */
  private currentRuleInActiveFile(position: number): number | null {
    if (position === 0) return null;
    const rule = this.parse.rules[position - 1];
    return rule !== undefined && rule.source === this.activeFile ? rule.index : null;
  }

  private selectPath(path: string | null): void {
    this.selectedPath = path;
    this.renderer.setSelected(path);
    if (path !== null) this.explainPanel.setTab('file');
    else this.renderExplanation();
  }

  private tooltipHtml(path: string): string {
    const file = this.evaluation.files.get(path);
    if (file === undefined) return escapeHtml(path);
    const position = this.timeline.state.position;
    const state = stateAtPosition(file, position);
    const rule = file.decidingRule === null ? undefined : this.parse.rules[file.decidingRule];
    const why = file.internal
      ? 'always ignored (Syncthing internal)'
      : rule === undefined
        ? 'no rule matches — default include'
        : `rule ${file.decidingRule! + 1}: ${rule.raw}`;
    return `<code>/${escapeHtml(path)}</code><br>
      <strong>${state}</strong>${file.deletable ? ' · deletable' : ''} — ${escapeHtml(why)}<br>
      <span class="muted">Click for full history</span>`;
  }

  private switchFile(name: string): void {
    if (!this.files.has(name)) return;
    this.activeFile = name;
    this.editor.setValue(this.files.get(name) ?? '');
    this.recompute();
  }

  private addIncludeFile(): void {
    const name = prompt('Name for the include file (referenced via #include <name>):', 'extra-patterns.txt');
    if (name === null) return;
    const trimmed = name.trim();
    if (trimmed === '' || this.files.has(trimmed)) return;
    this.files.set(trimmed, '// Patterns included from ' + trimmed + '\n');
    this.activeFile = trimmed;
    this.editor.setValue(this.files.get(trimmed) ?? '');
    this.recompute();
  }

  private removeIncludeFile(name: string): void {
    if (name === ROOT_IGNORE_FILE) return;
    this.files.delete(name);
    if (this.activeFile === name) {
      this.activeFile = ROOT_IGNORE_FILE;
      this.editor.setValue(this.files.get(ROOT_IGNORE_FILE) ?? '');
    }
    this.recompute();
  }

  private bindHeaderControls(): void {
    const platformSelect = document.getElementById('platform-select') as HTMLSelectElement;
    platformSelect.addEventListener('change', () => {
      this.platform = platformSelect.value as Platform;
      this.recompute();
    });

    (document.getElementById('example-button') as HTMLButtonElement).addEventListener(
      'click',
      () => {
        this.files = new Map([[ROOT_IGNORE_FILE, DEFAULT_RULES]]);
        this.activeFile = ROOT_IGNORE_FILE;
        this.tree = defaultTree();
        this.selectedPath = null;
        this.editor.setValue(DEFAULT_RULES);
        this.renderer.setTree(this.tree);
        this.timeline.reset();
        this.recompute();
      },
    );

    const importDialog = new ImportDialog((result) => {
      this.tree = result.root;
      this.selectedPath = null;
      this.renderer.setTree(this.tree);
      this.timeline.reset();
      this.recompute();
    });
    (document.getElementById('import-button') as HTMLButtonElement).addEventListener('click', () =>
      importDialog.open(),
    );

    this.searchInput.addEventListener(
      'input',
      debounce(() => {
        this.renderer.setSearch(this.searchInput.value);
        this.renderer.setPosition(this.timeline.state.position);
      }, 120),
    );

    const zoom = (id: string, fn: () => void): void => {
      (document.getElementById(id) as HTMLButtonElement).addEventListener('click', fn);
    };
    zoom('zoom-in', () => this.renderer.zoomIn());
    zoom('zoom-out', () => this.renderer.zoomOut());
    zoom('zoom-reset', () => this.renderer.zoomReset());
    zoom('zoom-fit', () => this.renderer.zoomFit());
  }
}

new App();
