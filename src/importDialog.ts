/**
 * Import dialog: paste, drag-drop, or pick a file containing `tree /F`,
 * Unix `tree`, or plain path-list output. Shows a live parse preview and
 * warnings before applying.
 */

import { parseFolderText, type ImportResult } from './treeParser';
import { countNodes } from './tree';
import { debounce, escapeHtml, pluralize } from './utils';

export class ImportDialog {
  private readonly dialog: HTMLDialogElement;
  private readonly textInput: HTMLTextAreaElement;
  private readonly preview: HTMLElement;
  private readonly warnings: HTMLElement;
  private readonly applyButton: HTMLButtonElement;
  private readonly onApply: (result: ImportResult) => void;
  private parsed: ImportResult | null = null;

  constructor(onApply: (result: ImportResult) => void) {
    this.onApply = onApply;
    this.dialog = document.getElementById('import-dialog') as HTMLDialogElement;
    this.textInput = document.getElementById('import-text') as HTMLTextAreaElement;
    this.preview = document.getElementById('import-preview') as HTMLElement;
    this.warnings = document.getElementById('import-warnings') as HTMLElement;
    this.applyButton = document.getElementById('import-apply') as HTMLButtonElement;
    this.bindEvents();
  }

  open(): void {
    this.dialog.showModal();
    this.textInput.focus();
  }

  private bindEvents(): void {
    const dropZone = document.getElementById('drop-zone') as HTMLElement;
    const fileInput = document.getElementById('import-file') as HTMLInputElement;

    this.textInput.addEventListener('input', debounce(() => this.updatePreview(), 200));

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file !== undefined) void this.loadFile(file);
    });

    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = event.dataTransfer?.files[0];
      if (file !== undefined) void this.loadFile(file);
    });

    (document.getElementById('import-cancel') as HTMLButtonElement).addEventListener('click', () =>
      this.dialog.close(),
    );
    this.applyButton.addEventListener('click', () => {
      if (this.parsed !== null && this.parsed.entries.length > 0) {
        this.onApply(this.parsed);
        this.dialog.close();
      }
    });
  }

  private async loadFile(file: File): Promise<void> {
    try {
      this.textInput.value = await file.text();
      this.updatePreview();
    } catch (err) {
      this.warnings.textContent = `Could not read file: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  private updatePreview(): void {
    const text = this.textInput.value;
    if (text.trim() === '') {
      this.parsed = null;
      this.preview.textContent = '';
      this.warnings.textContent = '';
      this.applyButton.disabled = true;
      return;
    }
    this.parsed = parseFolderText(text);
    const { files, dirs } = countNodes(this.parsed.root);
    const formatLabel = {
      'windows-tree': 'Windows tree /F',
      'unix-tree': 'Unix tree',
      'path-list': 'path list',
    }[this.parsed.format];
    this.preview.textContent =
      files + dirs === 0
        ? 'Nothing recognized in this input.'
        : `Detected ${formatLabel}: ${pluralize(files, 'file')}, ${pluralize(dirs, 'folder')}.`;
    this.warnings.innerHTML = this.parsed.warnings
      .slice(0, 20)
      .map((w) => `<div>⚠ ${escapeHtml(w)}</div>`)
      .join('');
    this.applyButton.disabled = this.parsed.entries.length === 0;
  }
}
