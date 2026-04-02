import { Plugin, FuzzySuggestModal, Notice, WorkspaceLeaf, addIcon } from "obsidian";
import { ChatView, VIEW_TYPE_CLAUDE } from "./chat/chat-view";
import { TmuxView, VIEW_TYPE_TMUX } from "./dashboard/tmux-view";
import { AutomationView, VIEW_TYPE_AUTOMATION } from "./dashboard/automation-view";
import { DashboardSettingTab } from "./settings/settings-tab";
import { SessionStore } from "./services/session-store";
import { DEFAULT_SETTINGS, type PluginSettings } from "./types/settings";
import type { SavedSession } from "./types/chat";

// Claude logo SVG (color version for ribbon, mono for UI)
const CLAUDE_ICON_COLOR = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757" fill-rule="nonzero"/></svg>`;

const CLAUDE_ICON_MONO = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="currentColor" fill-rule="nonzero"/></svg>`;

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

    // Register Claude icons
    addIcon("claude-color", CLAUDE_ICON_COLOR);
    addIcon("claude-mono", CLAUDE_ICON_MONO);

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
    this.addRibbonIcon("claude-color", "Claude Code Dashboard", () => {
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
