import { setIcon } from "obsidian";
import type { ToolCallInfo } from "../types/chat";
import type { PluginSettings } from "../types/settings";

/** Render a tool call as a collapsible panel */
export function renderToolCall(parent: HTMLElement, tc: ToolCallInfo, settings: PluginSettings): void {
  if (!settings.showToolCalls) return;

  const el = parent.createDiv("ccd-tool-call");
  const header = el.createDiv("ccd-tool-header");

  // Icon
  const icon = header.createSpan("ccd-tool-icon");
  setIcon(icon, getToolIcon(tc.name));

  // Name
  header.createSpan({ text: tc.name, cls: "ccd-tool-name" });

  // Input preview
  const preview = formatToolInput(tc.name, tc.input);
  if (preview) {
    header.createSpan({ text: preview, cls: "ccd-tool-input-preview" });
  }

  // Status badge
  if (tc.isError) {
    header.createSpan({ text: "error", cls: "ccd-tool-badge ccd-tool-badge-error" });
  } else if (tc.result !== undefined) {
    const badge = header.createSpan({ text: "done", cls: "ccd-tool-badge ccd-tool-badge-done" });
    if (tc.duration) {
      badge.textContent = `${(tc.duration / 1000).toFixed(1)}s`;
    }
  } else {
    const spinner = header.createSpan("ccd-tool-spinner");
    setIcon(spinner, "loader");
  }

  // Collapsible body
  const body = el.createDiv("ccd-tool-body ccd-collapsed");

  // Input section
  const inputTitle = body.createDiv({ text: "Input", cls: "ccd-tool-section-title" });
  const inputPre = body.createEl("pre", { cls: "ccd-tool-json" });
  inputPre.textContent = JSON.stringify(tc.input, null, 2);

  // Result section (if available)
  if (tc.result !== undefined) {
    body.createDiv({ text: "Result", cls: "ccd-tool-section-title" });
    const resultPre = body.createEl("pre", { cls: "ccd-tool-json" });
    resultPre.textContent = tc.result.length > 2000 ? tc.result.slice(0, 2000) + "\n... (truncated)" : tc.result;
  }

  // Toggle on click
  header.addEventListener("click", () => {
    body.toggleClass("ccd-collapsed", !body.hasClass("ccd-collapsed"));
  });
}

/** Render a thinking block as collapsible */
export function renderThinkingBlock(parent: HTMLElement, text: string): void {
  const el = parent.createDiv("ccd-thinking");
  const header = el.createDiv("ccd-thinking-header");

  const icon = header.createSpan("ccd-thinking-icon");
  setIcon(icon, "brain");
  header.createSpan({ text: "Thinking...", cls: "ccd-thinking-label" });

  const body = el.createDiv("ccd-thinking-body ccd-collapsed");
  body.textContent = text;

  header.addEventListener("click", () => {
    body.toggleClass("ccd-collapsed", !body.hasClass("ccd-collapsed"));
  });
}

/** Format tool name for display */
export function formatToolName(name: string): string {
  return name.replace(/([A-Z])/g, " $1").trim();
}

/** Extract a short preview of tool input */
export function formatToolInput(name: string, input: Record<string, unknown>): string {
  if (name === "Read" || name === "Write" || name === "Edit") {
    const fp = input.file_path ?? input.path;
    if (typeof fp === "string") {
      const parts = fp.split("/");
      return parts.pop() ?? fp;
    }
  }
  if (name === "Bash") {
    const cmd = input.command;
    if (typeof cmd === "string") return cmd.slice(0, 60);
  }
  if (name === "Grep") {
    const pat = input.pattern;
    if (typeof pat === "string") return `"${pat.slice(0, 30)}"`;
  }
  if (name === "Glob") {
    const pat = input.pattern;
    if (typeof pat === "string") return pat;
  }
  if (name === "Agent") {
    const desc = input.description;
    if (typeof desc === "string") return desc.slice(0, 40);
  }
  return "";
}

/** Get Obsidian icon name for a tool */
export function getToolIcon(name: string): string {
  const icons: Record<string, string> = {
    Read: "file-text",
    Write: "file-plus",
    Edit: "pencil",
    Bash: "terminal",
    Glob: "search",
    Grep: "search",
    Agent: "users",
    WebFetch: "globe",
    WebSearch: "globe",
    NotebookEdit: "book-open",
    TodoWrite: "check-square",
  };
  return icons[name] ?? "wrench";
}
