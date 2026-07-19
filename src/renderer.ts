/**
 * SVG folder-tree renderer.
 *
 * Renders the tree as an indented list of SVG rows. Structural changes
 * (tree swap, expand/collapse, search) rebuild the rows; timeline changes
 * only toggle CSS classes on existing rows, which keeps scrubbing cheap
 * even for trees with thousands of nodes.
 */

import { matchedAtPosition, stateAtPosition } from './history';
import { flattenTree } from './tree';
import { clamp } from './utils';
import type { EvaluationResult, TreeNode } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ROW_HEIGHT = 26;
const INDENT = 18;
const TEXT_START = 46;
const CHAR_WIDTH = 7.4;
const MIN_WIDTH = 420;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
/** Trees larger than this start with deep directories collapsed. */
const AUTO_COLLAPSE_THRESHOLD = 600;

const FOLDER_ICON =
  'M2 4.5A1.5 1.5 0 0 1 3.5 3h3.2l1.6 1.8h5.2A1.5 1.5 0 0 1 15 6.3v5.2a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 2 11.5z';
const FILE_ICON =
  'M4 1.5h5.5L13 5v8A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V3A1.5 1.5 0 0 1 4 1.5zM9 2v3.5h3.5';

export interface RendererCallbacks {
  onSelect: (path: string | null) => void;
  tooltipHtml: (path: string) => string;
}

interface Row {
  node: TreeNode;
  depth: number;
  group: SVGGElement;
  text: SVGTextElement;
}

export class TreeRenderer {
  private readonly container: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly tooltip: HTMLElement;
  private readonly callbacks: RendererCallbacks;

  private root: TreeNode | null = null;
  private evaluation: EvaluationResult | null = null;
  private position = 0;
  private expanded = new Set<string>();
  private query = '';
  private selected: string | null = null;
  private rows: Row[] = [];
  private zoom = 1;
  private contentWidth = MIN_WIDTH;

  constructor(
    container: HTMLElement,
    svg: SVGSVGElement,
    tooltip: HTMLElement,
    callbacks: RendererCallbacks,
  ) {
    this.container = container;
    this.svg = svg;
    this.tooltip = tooltip;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  setTree(root: TreeNode): void {
    this.root = root;
    this.expanded = this.defaultExpansion(root);
    this.selected = null;
    this.rebuild();
  }

  setEvaluation(evaluation: EvaluationResult, position: number): void {
    this.evaluation = evaluation;
    this.position = position;
    this.applyStates();
  }

  setPosition(position: number): void {
    this.position = position;
    this.applyStates();
  }

  setSearch(query: string): void {
    this.query = query.trim().toLowerCase();
    this.rebuild();
  }

  setSelected(path: string | null): void {
    this.selected = path;
    for (const row of this.rows) {
      row.group.classList.toggle('selected', row.node.path === path);
    }
  }

  zoomIn(): void {
    this.setZoom(this.zoom * 1.2);
  }

  zoomOut(): void {
    this.setZoom(this.zoom / 1.2);
  }

  zoomReset(): void {
    this.setZoom(1);
  }

  zoomFit(): void {
    const available = this.container.clientWidth - 20;
    if (available > 0) this.setZoom(available / this.contentWidth);
  }

  private setZoom(zoom: number): void {
    this.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    this.applySize();
  }

  private defaultExpansion(root: TreeNode): Set<string> {
    const expanded = new Set<string>(['']);
    const total = flattenTree(root).length;
    const maxDepth = total > AUTO_COLLAPSE_THRESHOLD ? 1 : Number.POSITIVE_INFINITY;
    const visit = (node: TreeNode, depth: number): void => {
      for (const child of node.children) {
        if (child.isDir && depth < maxDepth) {
          expanded.add(child.path);
          visit(child, depth + 1);
        }
      }
    };
    visit(root, 0);
    return expanded;
  }

  /** Paths that survive the search filter (matches plus their ancestors). */
  private visiblePaths(): Set<string> | null {
    if (this.root === null || this.query === '') return null;
    const visible = new Set<string>();
    for (const node of flattenTree(this.root)) {
      if (node.name.toLowerCase().includes(this.query)) {
        visible.add(node.path);
        let parent = node.path;
        while (parent.includes('/')) {
          parent = parent.slice(0, parent.lastIndexOf('/'));
          visible.add(parent);
        }
      }
    }
    return visible;
  }

  private rebuild(): void {
    this.svg.textContent = '';
    this.rows = [];
    if (this.root === null) return;

    const filter = this.visiblePaths();
    const addRows = (node: TreeNode, depth: number): void => {
      for (const child of node.children) {
        if (filter !== null && !filter.has(child.path)) continue;
        this.rows.push(this.createRow(child, depth));
        const open = filter !== null ? true : this.expanded.has(child.path);
        if (child.isDir && open) addRows(child, depth + 1);
      }
    };
    addRows(this.root, 0);

    const longest = this.rows.reduce(
      (max, row) =>
        Math.max(max, row.depth * INDENT + TEXT_START + row.node.name.length * CHAR_WIDTH),
      MIN_WIDTH,
    );
    this.contentWidth = Math.ceil(longest + 40);
    // Row geometry depends on the final content width, so sync it now.
    for (const row of this.rows) {
      for (const rect of row.group.querySelectorAll('rect')) {
        rect.setAttribute('width', String(this.contentWidth - 6));
      }
      row.group.querySelector('circle')?.setAttribute('cx', String(this.contentWidth - 20));
    }
    this.applySize();
    this.applyStates();
    this.setSelected(this.selected);
  }

  private applySize(): void {
    const height = Math.max(this.rows.length * ROW_HEIGHT + 8, 40);
    this.svg.setAttribute('viewBox', `0 0 ${this.contentWidth} ${height}`);
    this.svg.style.width = `${this.contentWidth * this.zoom}px`;
    this.svg.style.height = `${height * this.zoom}px`;
  }

  private createRow(node: TreeNode, depth: number): Row {
    const group = document.createElementNS(SVG_NS, 'g');
    group.classList.add('node');
    group.dataset['path'] = node.path;
    const y = this.rows.length * ROW_HEIGHT + 4;
    group.setAttribute('transform', `translate(0 ${y})`);
    const x = depth * INDENT;

    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.classList.add('row-bg');
    bg.setAttribute('x', String(x + 2));
    bg.setAttribute('y', '0');
    bg.setAttribute('width', String(Math.max(this.contentWidth, MIN_WIDTH)));
    bg.setAttribute('height', String(ROW_HEIGHT - 3));
    group.append(bg);

    if (node.isDir) {
      const caret = document.createElementNS(SVG_NS, 'path');
      caret.classList.add('caret');
      caret.setAttribute('d', 'M0 0 L7 4.5 L0 9 Z');
      const open = this.query === '' ? this.expanded.has(node.path) : true;
      const cx = x + 8;
      const cy = ROW_HEIGHT / 2 - 6;
      caret.setAttribute(
        'transform',
        `translate(${cx} ${cy})${open ? ` rotate(90 3.5 4.5)` : ''}`,
      );
      caret.dataset['toggle'] = node.path;
      group.append(caret);
    }

    const icon = document.createElementNS(SVG_NS, 'path');
    icon.classList.add(node.isDir ? 'icon-folder' : 'icon-file');
    icon.setAttribute('d', node.isDir ? FOLDER_ICON : FILE_ICON);
    icon.setAttribute('transform', `translate(${x + 20} ${ROW_HEIGHT / 2 - 9}) scale(1.05)`);
    group.append(icon);

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(x + TEXT_START));
    text.setAttribute('y', String(ROW_HEIGHT / 2));
    this.renderName(text, node.name);
    group.append(text);

    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.classList.add('status-dot');
    dot.setAttribute('cy', String(ROW_HEIGHT / 2));
    dot.setAttribute('r', '4.5'); // visibility controlled via CSS
    group.append(dot);

    const hit = document.createElementNS(SVG_NS, 'rect');
    hit.classList.add('row-hit');
    hit.setAttribute('x', '0');
    hit.setAttribute('y', '0');
    hit.setAttribute('width', String(Math.max(this.contentWidth, MIN_WIDTH)));
    hit.setAttribute('height', String(ROW_HEIGHT - 3));
    group.append(hit);

    this.svg.append(group);
    return { node, depth, group, text };
  }

  /** Render the node name, highlighting the search query when present. */
  private renderName(text: SVGTextElement, name: string): void {
    text.textContent = '';
    if (this.query === '') {
      text.textContent = name;
      return;
    }
    const idx = name.toLowerCase().indexOf(this.query);
    if (idx === -1) {
      text.textContent = name;
      return;
    }
    const before = document.createElementNS(SVG_NS, 'tspan');
    before.textContent = name.slice(0, idx);
    const hit = document.createElementNS(SVG_NS, 'tspan');
    hit.classList.add('search-hit');
    hit.textContent = name.slice(idx, idx + this.query.length);
    const after = document.createElementNS(SVG_NS, 'tspan');
    after.textContent = name.slice(idx + this.query.length);
    text.append(before, hit, after);
  }

  /** Update state classes on every visible row for the current position. */
  private applyStates(): void {
    const evaluation = this.evaluation;
    for (const row of this.rows) {
      const cls = row.group.classList;
      cls.remove('included', 'ignored', 'matched-now', 'decided-now', 'dimmed', 'internal', 'deletable');
      const file = evaluation?.files.get(row.node.path);
      if (file === undefined) continue;
      cls.add(stateAtPosition(file, this.position));
      if (file.internal) cls.add('internal');
      if (file.deletable && this.position > (file.decidingRule ?? 0)) cls.add('deletable');
      if (this.position > 0) {
        const matched = matchedAtPosition(file, this.position);
        if (matched) {
          cls.add('matched-now');
          if (file.decidingRule === this.position - 1) cls.add('decided-now');
        } else {
          cls.add('dimmed');
        }
      }
    }
  }

  private bindEvents(): void {
    this.svg.addEventListener('click', (event) => {
      const target = event.target as Element;
      const toggle = (target as SVGElement).dataset?.['toggle'];
      if (toggle !== undefined) {
        this.toggleDir(toggle);
        return;
      }
      const group = target.closest<SVGGElement>('g.node');
      const path = group?.dataset['path'];
      this.callbacks.onSelect(path ?? null);
    });

    this.svg.addEventListener('dblclick', (event) => {
      const group = (event.target as Element).closest<SVGGElement>('g.node');
      const path = group?.dataset['path'];
      if (path !== undefined) this.toggleDir(path);
    });

    this.svg.addEventListener('mousemove', (event) => {
      const group = (event.target as Element).closest<SVGGElement>('g.node');
      const path = group?.dataset['path'];
      if (path === undefined) {
        this.tooltip.hidden = true;
        return;
      }
      this.tooltip.innerHTML = this.callbacks.tooltipHtml(path);
      this.tooltip.hidden = false;
      const pad = 14;
      const rect = this.tooltip.getBoundingClientRect();
      const x = Math.min(event.clientX + pad, window.innerWidth - rect.width - 8);
      const y = Math.min(event.clientY + pad, window.innerHeight - rect.height - 8);
      this.tooltip.style.left = `${x}px`;
      this.tooltip.style.top = `${y}px`;
    });

    this.svg.addEventListener('mouseleave', () => {
      this.tooltip.hidden = true;
    });

    this.container.addEventListener(
      'wheel',
      (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        this.setZoom(this.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12));
      },
      { passive: false },
    );
  }

  private toggleDir(path: string): void {
    if (this.query !== '') return; // search shows a fixed filtered view
    if (this.expanded.has(path)) this.expanded.delete(path);
    else this.expanded.add(path);
    this.rebuild();
  }
}
