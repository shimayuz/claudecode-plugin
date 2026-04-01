import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type { PluginSettings } from "../types/settings";
import { TmuxService, type TmuxSession } from "../services/tmux-service";
import { TmuxSessionList } from "./tmux-session-list";

export const VIEW_TYPE_TMUX = "claudecode-dashboard-tmux";

export class TmuxView extends ItemView {
  private settings: PluginSettings;
  private tmuxService: TmuxService;
  private sessionList!: TmuxSessionList;
  private outputPane!: HTMLElement;
  private selectedSession: TmuxSession | null = null;
  private unavailableEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, settings: PluginSettings) {
    super(leaf);
    this.settings = settings;
    this.tmuxService = new TmuxService();
  }

  getViewType(): string { return VIEW_TYPE_TMUX; }
  getDisplayText(): string { return "tmux Dashboard"; }
  getIcon(): string { return "terminal"; }

  async onOpen(): Promise<void> {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("ccd-tmux-root");

    // Header
    const header = root.createDiv("ccd-tmux-header");
    const titleIcon = header.createSpan("ccd-tmux-title-icon");
    setIcon(titleIcon, "terminal");
    header.createSpan({ text: "tmux Sessions", cls: "ccd-tmux-title" });

    const refreshBtn = header.createSpan("ccd-icon-btn");
    setIcon(refreshBtn, "refresh-cw");
    refreshBtn.addEventListener("click", () => this.refresh());

    // Check availability
    const available = await this.tmuxService.isAvailable();
    if (!available) {
      this.unavailableEl = root.createDiv("ccd-tmux-unavailable");
      this.unavailableEl.createEl("p", { text: "tmux is not installed or not available." });
      this.unavailableEl.createEl("p", { text: "Install with: brew install tmux" });
      return;
    }

    // Main layout: sidebar + output
    const main = root.createDiv("ccd-tmux-main");

    // Session list (left)
    const sidebarEl = main.createDiv("ccd-tmux-sidebar");
    this.sessionList = new TmuxSessionList(sidebarEl, {
      onSelect: (session) => void this.selectSession(session),
      onSendKeys: (session, keys) => void this.tmuxService.sendKeys(session.name, keys),
    });

    // Output pane (right)
    this.outputPane = main.createDiv("ccd-tmux-output");
    this.outputPane.createEl("pre", { text: "Select a session to view output.", cls: "ccd-tmux-output-text" });

    // Start polling
    this.tmuxService.startPolling(this.settings.tmuxPollInterval, (sessions) => {
      this.sessionList.render(sessions);
      // Refresh selected session output
      if (this.selectedSession) {
        const updated = sessions.find(s => s.name === this.selectedSession?.name);
        if (updated) void this.refreshOutput(updated);
      }
    });
  }

  async onClose(): Promise<void> {
    this.tmuxService.stopPolling();
  }

  private async selectSession(session: TmuxSession): Promise<void> {
    this.selectedSession = session;
    this.sessionList.setSelected(session.id);
    await this.refreshOutput(session);
  }

  private async refreshOutput(session: TmuxSession): Promise<void> {
    const output = await this.tmuxService.capturePane(session.name);
    this.outputPane.empty();

    const header = this.outputPane.createDiv("ccd-tmux-output-header");
    header.createSpan({ text: session.name, cls: "ccd-tmux-output-session" });
    if (session.hasClaudeProcess) {
      header.createSpan({ text: "Claude", cls: "ccd-tmux-badge ccd-tmux-badge-claude" });
    }

    const pre = this.outputPane.createEl("pre", { cls: "ccd-tmux-output-text" });
    pre.textContent = output || "(empty)";
    pre.scrollTop = pre.scrollHeight;

    // Send keys input
    const inputRow = this.outputPane.createDiv("ccd-tmux-send-row");
    const input = inputRow.createEl("input", {
      cls: "ccd-tmux-send-input",
      attr: { placeholder: "Send keys to session..." },
    });
    const sendBtn = inputRow.createEl("button", { text: "Send", cls: "ccd-tmux-send-btn" });
    sendBtn.addEventListener("click", () => {
      const keys = input.value.trim();
      if (keys) {
        void this.tmuxService.sendKeys(session.name, keys);
        input.value = "";
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendBtn.click();
    });
  }

  private async refresh(): Promise<void> {
    const sessions = await this.tmuxService.listSessions();
    this.sessionList.render(sessions);
  }
}
