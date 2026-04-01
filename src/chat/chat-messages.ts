import { MarkdownRenderer, setIcon, type App, type Component } from "obsidian";
import type { ChatMessage } from "../types/chat";
import { enhanceCodeBlocks } from "./code-block-enhancer";

export class ChatMessages {
  private container: HTMLElement;
  private app: App;
  private component: Component;
  private emptyStateEl: HTMLElement | null = null;

  constructor(container: HTMLElement, app: App, component: Component) {
    this.container = container;
    this.app = app;
    this.component = component;
  }

  renderUserMessage(msg: ChatMessage): void {
    const wrapper = this.container.createDiv("ccd-msg ccd-msg-user");
    const bubble = wrapper.createDiv("ccd-msg-bubble ccd-msg-bubble-user");

    // Attachment chips
    if (msg.attachments?.length) {
      const chips = bubble.createDiv("ccd-msg-attachments");
      for (const att of msg.attachments) {
        const chip = chips.createSpan("ccd-attachment-chip");
        const icon = chip.createSpan("ccd-attachment-icon");
        setIcon(icon, att.type === "image" ? "image" : "file-text");
        chip.createSpan({ text: att.name, cls: "ccd-attachment-name" });
      }
    }

    const content = bubble.createDiv("ccd-msg-content");
    content.textContent = msg.content;

    const time = wrapper.createDiv("ccd-msg-time");
    time.textContent = this.formatTime(msg.timestamp);
  }

  renderAssistantMessage(msg: ChatMessage): HTMLElement {
    const wrapper = this.container.createDiv("ccd-msg ccd-msg-assistant");
    const bubble = wrapper.createDiv("ccd-msg-bubble ccd-msg-bubble-assistant");

    // Render segments if available
    if (msg.segments?.length) {
      for (const seg of msg.segments) {
        if (seg.type === "text") {
          const textEl = bubble.createDiv("ccd-msg-text");
          void MarkdownRenderer.render(this.app, seg.text, textEl, "", this.component);
          enhanceCodeBlocks(textEl);
        } else if (seg.type === "tool") {
          this.renderToolCallCompact(bubble, seg.tool);
        }
      }
    } else if (msg.content) {
      const textEl = bubble.createDiv("ccd-msg-text");
      void MarkdownRenderer.render(this.app, msg.content, textEl, "", this.component);
      enhanceCodeBlocks(textEl);
    }

    // Tool calls (legacy format)
    if (msg.toolCalls?.length) {
      for (const tc of msg.toolCalls) {
        this.renderToolCallCompact(bubble, tc);
      }
    }

    return wrapper;
  }

  private renderToolCallCompact(parent: HTMLElement, tc: { name: string; input: Record<string, unknown>; result?: string; isError?: boolean }): void {
    const el = parent.createDiv("ccd-tool-compact");
    const header = el.createDiv("ccd-tool-header");

    const icon = header.createSpan("ccd-tool-icon");
    setIcon(icon, this.getToolIcon(tc.name));
    header.createSpan({ text: tc.name, cls: "ccd-tool-name" });

    // Show key input
    const inputPreview = this.getToolInputPreview(tc.name, tc.input);
    if (inputPreview) {
      header.createSpan({ text: inputPreview, cls: "ccd-tool-input-preview" });
    }

    // Status
    if (tc.isError) {
      const badge = header.createSpan({ text: "error", cls: "ccd-tool-badge ccd-tool-badge-error" });
    } else if (tc.result !== undefined) {
      const badge = header.createSpan({ text: "done", cls: "ccd-tool-badge ccd-tool-badge-done" });
    }
  }

  renderError(text: string): void {
    const el = this.container.createDiv("ccd-error");
    const icon = el.createSpan("ccd-error-icon");
    setIcon(icon, "alert-triangle");
    el.createSpan({ text, cls: "ccd-error-text" });
  }

  renderContextFullError(onNewSession: () => void): void {
    const el = this.container.createDiv("ccd-error ccd-error-context");
    const icon = el.createSpan("ccd-error-icon");
    setIcon(icon, "alert-circle");
    el.createEl("p", { text: "Context window is full. Start a new session to continue." });
    const btn = el.createEl("button", { text: "New Session", cls: "ccd-btn-new-session" });
    btn.addEventListener("click", onNewSession);
  }

  renderCompactBoundary(): void {
    const el = this.container.createDiv("ccd-compact-boundary");
    el.createSpan({ text: "Context compacted", cls: "ccd-compact-label" });
  }

  showEmptyState(subtitle: string): void {
    if (this.emptyStateEl) return;
    this.emptyStateEl = this.container.createDiv("ccd-empty-state");
    const icon = this.emptyStateEl.createDiv("ccd-empty-icon");
    setIcon(icon, "sparkles");
    this.emptyStateEl.createEl("p", { text: "Claude Code Chat", cls: "ccd-empty-title" });
    this.emptyStateEl.createEl("p", { text: subtitle, cls: "ccd-empty-subtitle" });
  }

  hideEmptyState(): void {
    this.emptyStateEl?.remove();
    this.emptyStateEl = null;
  }

  clear(): void {
    // Remove all message elements but preserve the container
    const children = Array.from(this.container.children);
    for (const child of children) {
      if (child instanceof HTMLElement && (
        child.hasClass("ccd-msg") ||
        child.hasClass("ccd-error") ||
        child.hasClass("ccd-empty-state") ||
        child.hasClass("ccd-compact-boundary") ||
        child.hasClass("ccd-streaming")
      )) {
        child.remove();
      }
    }
    this.emptyStateEl = null;
  }

  scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }

  private formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  private getToolIcon(name: string): string {
    const icons: Record<string, string> = {
      Read: "file-text", Write: "file-plus", Edit: "pencil",
      Bash: "terminal", Glob: "search", Grep: "search",
      Agent: "users", WebFetch: "globe", WebSearch: "globe",
    };
    return icons[name] ?? "wrench";
  }

  private getToolInputPreview(name: string, input: Record<string, unknown>): string {
    if (name === "Read" || name === "Write" || name === "Edit") {
      const fp = input.file_path ?? input.path;
      if (typeof fp === "string") return fp.split("/").pop() ?? fp;
    }
    if (name === "Bash") {
      const cmd = input.command;
      if (typeof cmd === "string") return cmd.slice(0, 60);
    }
    if (name === "Grep") {
      const pat = input.pattern;
      if (typeof pat === "string") return pat.slice(0, 40);
    }
    return "";
  }
}
