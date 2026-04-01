import { setIcon } from "obsidian";
import type { TmuxSession } from "../services/tmux-service";

interface TmuxSessionListCallbacks {
  onSelect: (session: TmuxSession) => void;
  onSendKeys: (session: TmuxSession, keys: string) => void;
}

export class TmuxSessionList {
  private container: HTMLElement;
  private callbacks: TmuxSessionListCallbacks;
  private selectedId: string | null = null;

  constructor(container: HTMLElement, callbacks: TmuxSessionListCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  render(sessions: TmuxSession[]): void {
    this.container.empty();

    if (sessions.length === 0) {
      const empty = this.container.createDiv("ccd-tmux-empty");
      empty.createEl("p", { text: "No tmux sessions found." });
      empty.createEl("p", { text: 'Start one with: tmux new -s mysession', cls: "ccd-tmux-hint" });
      return;
    }

    for (const session of sessions) {
      const card = this.container.createDiv("ccd-tmux-card");
      if (session.id === this.selectedId) card.addClass("ccd-tmux-card-selected");

      // Header row
      const header = card.createDiv("ccd-tmux-card-header");
      const icon = header.createSpan("ccd-tmux-card-icon");
      setIcon(icon, "terminal");
      header.createSpan({ text: session.name, cls: "ccd-tmux-card-name" });

      // Status indicators
      const badges = card.createDiv("ccd-tmux-card-badges");
      if (session.attached) {
        badges.createSpan({ text: "attached", cls: "ccd-tmux-badge ccd-tmux-badge-attached" });
      }
      if (session.hasClaudeProcess) {
        badges.createSpan({ text: "Claude", cls: "ccd-tmux-badge ccd-tmux-badge-claude" });
      }

      // Info row
      const info = card.createDiv("ccd-tmux-card-info");
      info.createSpan({ text: `${session.windows} window${session.windows > 1 ? "s" : ""}` });
      info.createSpan({ text: " | " });
      info.createSpan({ text: this.formatDate(session.created) });

      card.addEventListener("click", () => this.callbacks.onSelect(session));
    }
  }

  setSelected(sessionId: string): void {
    this.selectedId = sessionId;
    // Update visual selection
    const cards = this.container.querySelectorAll(".ccd-tmux-card");
    cards.forEach((card, i) => {
      card.toggleClass("ccd-tmux-card-selected", card.getAttribute("data-id") === sessionId);
    });
  }

  private formatDate(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return date.toLocaleDateString();
  }
}
