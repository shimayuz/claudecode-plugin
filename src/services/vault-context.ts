import type { App, TFile, WorkspaceLeaf } from "obsidian";
import { MarkdownView } from "obsidian";

export interface VaultSelection {
  fileName: string;
  text: string;
  filePath?: string;
}

export class VaultContext {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  /** Get the absolute path of the active file */
  getActiveFilePath(): string | null {
    const file = this.app.workspace.getActiveFile();
    if (!file) return null;
    const adapter = this.app.vault.adapter as { getBasePath?: () => string };
    const basePath = adapter.getBasePath?.() ?? "";
    return basePath ? `${basePath}/${file.path}` : file.path;
  }

  /** Get the vault-relative path of the active file */
  getActiveFileRelativePath(): string | null {
    return this.app.workspace.getActiveFile()?.path ?? null;
  }

  /** Get the vault root absolute path */
  getVaultBasePath(): string {
    const adapter = this.app.vault.adapter as { getBasePath?: () => string };
    return adapter.getBasePath?.() ?? "";
  }

  /** Get the current editor selection from the active MarkdownView */
  getEditorSelection(): VaultSelection | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view?.editor) return null;

    const selection = view.editor.getSelection();
    if (!selection?.trim()) return null;

    const file = view.file;
    return {
      fileName: file?.name ?? "Untitled",
      text: selection,
      filePath: file?.path,
    };
  }

  /** Try editor selection first, then fall back to DOM selection */
  getAutoContext(): VaultSelection | null {
    const editorSel = this.getEditorSelection();
    if (editorSel) return editorSel;

    // DOM selection fallback (works in reading mode)
    const domSel = window.getSelection();
    if (!domSel || domSel.isCollapsed) return null;

    const text = domSel.toString().trim();
    if (!text) return null;

    const file = this.app.workspace.getActiveFile();
    return {
      fileName: file?.name ?? "Selection",
      text,
      filePath: file?.path,
    };
  }

  /** Search vault files by name query */
  async browseVaultFiles(query?: string): Promise<TFile[]> {
    const files = this.app.vault.getMarkdownFiles();
    if (!query) return files.slice(0, 50);

    const lower = query.toLowerCase();
    return files
      .filter(f => f.path.toLowerCase().includes(lower))
      .slice(0, 50);
  }

  /** Read file content */
  async readFileContent(file: TFile): Promise<string> {
    return this.app.vault.cachedRead(file);
  }

  /** Get all leaf types for workspace state */
  getOpenFiles(): Array<{ name: string; path: string }> {
    const result: Array<{ name: string; path: string }> = [];
    this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
      const viewState = leaf.getViewState();
      if (viewState.type === "markdown" && viewState.state?.file) {
        const path = viewState.state.file as string;
        const name = path.split("/").pop() ?? path;
        result.push({ name, path });
      }
    });
    return result;
  }
}
