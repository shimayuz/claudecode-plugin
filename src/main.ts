import { Plugin, FuzzySuggestModal, Notice, WorkspaceLeaf } from "obsidian";
import { ChatView, VIEW_TYPE_CLAUDE } from "./chat/chat-view";
import { TmuxView, VIEW_TYPE_TMUX } from "./dashboard/tmux-view";
import { AutomationView, VIEW_TYPE_AUTOMATION } from "./dashboard/automation-view";
import { DashboardSettingTab } from "./settings/settings-tab";
import { SessionStore } from "./services/session-store";
import { DEFAULT_SETTINGS, type PluginSettings } from "./types/settings";
import { SKILL_CATALOG } from "./types/commands";
import type { SavedSession } from "./types/chat";
import { existsSync, writeFileSync, unlinkSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const SKILLS_DIR = join(homedir(), ".claude", "commands");

export default class ClaudeCodeDashboardPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  sessionStore!: SessionStore;

  private getChatView(): ChatView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CLAUDE);
    if (leaves.length > 0) return leaves[0].view as ChatView;
    return null;
  }

  async onload(): Promise<void> {
    await this.loadSettings();
    this.sessionStore = new SessionStore(this);

    // Register views
    this.registerView(VIEW_TYPE_CLAUDE, (leaf) => {
      const view = new ChatView(leaf, this.settings, this.sessionStore);
      view.onSaveSession = (session) => void this.sessionStore.addSession(session);
      view.onShowSessionPicker = () => void this.showSessionPicker();
      return view;
    });

    this.registerView(VIEW_TYPE_TMUX, (leaf) => new TmuxView(leaf, this.settings));
    this.registerView(VIEW_TYPE_AUTOMATION, (leaf) => new AutomationView(leaf, this.settings));

    // Ribbon icon
    this.addRibbonIcon("sparkles", "Claude Code Dashboard", () => {
      void this.activateView(VIEW_TYPE_CLAUDE);
    });

    // Commands
    this.addCommand({
      id: "open-claude-chat",
      name: "Open Claude Code chat",
      callback: () => void this.activateView(VIEW_TYPE_CLAUDE),
    });

    this.addCommand({
      id: "new-claude-session",
      name: "New Claude Code session",
      callback: () => {
        void this.activateView(VIEW_TYPE_CLAUDE);
        setTimeout(() => this.getChatView()?.startNewSession(), 100);
      },
    });

    this.addCommand({
      id: "open-tmux-dashboard",
      name: "Open tmux dashboard",
      callback: () => void this.activateView(VIEW_TYPE_TMUX),
    });

    this.addCommand({
      id: "open-automation-dashboard",
      name: "Open automation dashboard",
      callback: () => void this.activateView(VIEW_TYPE_AUTOMATION),
    });

    this.addCommand({
      id: "session-history",
      name: "Browse session history",
      callback: () => void this.showSessionPicker(),
    });

    // Settings tab
    this.addSettingTab(new DashboardSettingTab(this.app, this));

    // Sync skills
    this.syncSkills();
  }

  onunload(): void {
    const chatView = this.getChatView();
    if (chatView) {
      // cleanup handled by view.onClose()
    }
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    const chatView = this.getChatView();
    chatView?.updateSettings(this.settings);
  }

  /** Sync enabled skills to ~/.claude/commands/ */
  syncSkills(): void {
    try {
      if (!existsSync(SKILLS_DIR)) {
        mkdirSync(SKILLS_DIR, { recursive: true });
      }
    } catch {
      return;
    }

    for (const skill of SKILL_CATALOG) {
      const targetPath = join(SKILLS_DIR, skill.fileName);
      const header = `<!-- ClaudeCodeDashboard skill: ${skill.id} -->\n`;

      if (this.settings.enabledSkills.includes(skill.id)) {
        // Install skill - for now write a placeholder
        // In production, bundled skill content would be used
        try {
          const content = header + `# ${skill.name}\n\n${skill.description}\n`;
          writeFileSync(targetPath, content, "utf-8");
        } catch { /* ignore */ }
      } else {
        // Remove if we own it
        try {
          if (existsSync(targetPath)) {
            const content = readFileSync(targetPath, "utf-8");
            if (content.startsWith("<!-- ClaudeCodeDashboard skill:")) {
              unlinkSync(targetPath);
            }
          }
        } catch { /* ignore */ }
      }
    }
  }

  private async activateView(viewType: string): Promise<void> {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(viewType)[0];
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({ type: viewType, active: true });
      }
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  private async showSessionPicker(): Promise<void> {
    const sessions = await this.sessionStore.loadSessions();
    if (sessions.length === 0) {
      new Notice("No saved sessions");
      return;
    }

    const modal = new SessionPickerModal(this.app, sessions, (session) => {
      void this.activateView(VIEW_TYPE_CLAUDE);
      setTimeout(() => {
        this.getChatView()?.resumeSession(session.sessionId, session.messages);
      }, 100);
    });
    modal.open();
  }
}

class SessionPickerModal extends FuzzySuggestModal<SavedSession> {
  private sessions: SavedSession[];
  private onChoose: (session: SavedSession) => void;

  constructor(app: import("obsidian").App, sessions: SavedSession[], onChoose: (session: SavedSession) => void) {
    super(app);
    this.sessions = sessions.slice().reverse();
    this.onChoose = onChoose;
    this.setPlaceholder("Search session history...");
  }

  getItems(): SavedSession[] {
    return this.sessions;
  }

  getItemText(item: SavedSession): string {
    const date = new Date(item.timestamp).toLocaleString();
    return `${item.firstMessage} (${item.model}, ${item.messageCount} msgs, ${date})`;
  }

  onChooseItem(item: SavedSession): void {
    this.onChoose(item);
  }
}
