import { ItemView, WorkspaceLeaf, Component, setIcon, Notice, FuzzySuggestModal, TFile } from "obsidian";
import type { PluginSettings, ModelChoice, EffortLevel } from "../types/settings";
import type { ChatMessage, SessionInfo, SavedSession, McpServer } from "../types/chat";
import type { ClaudeEvent, AssistantMessageEvent, SystemInitEvent, ResultEvent, StreamDeltaEvent } from "../types/events";
import { ProcessManager, type ProcessState } from "../services/process-manager";
import { VaultContext } from "../services/vault-context";
import { ChatHeader, type ChatHeaderCallbacks } from "./chat-header";
import { ChatInput, type ChatInputCallbacks } from "./chat-input";
import { ChatMessages } from "./chat-messages";
import { ChatToolbar, type ChatToolbarCallbacks } from "./chat-toolbar";
import { ChatStream } from "./chat-stream";
import { ProgressIndicator } from "./progress-indicator";
import { SlashCommandPopup } from "./slash-commands";
import { SessionStore } from "../services/session-store";

export const VIEW_TYPE_CLAUDE = "claudecode-dashboard-chat";

interface TabState {
  id: string;
  title: string;
  messages: ChatMessage[];
  session: SessionInfo | null;
  sessionId: string | null;
  firstMessageText: string;
  turnCount: number;
  pm: ProcessManager;
  pendingPermissions: Array<{
    info: { toolName: string; input: Record<string, unknown>; title?: string; displayName?: string; description?: string };
    resolve: (result: "allow" | "deny" | "always") => void;
  }>;
}

export class ChatView extends ItemView {
  private settings: PluginSettings;
  private vaultCtx: VaultContext;
  private sessionStore: SessionStore;

  // Tabs
  private tabs: TabState[] = [];
  private activeTabId = "";

  // Sub-components
  private header!: ChatHeader;
  private toolbar!: ChatToolbar;
  private chatMessages!: ChatMessages;
  private chatStream!: ChatStream;
  private chatInput!: ChatInput;
  private progress!: ProgressIndicator;
  private slashPopup!: SlashCommandPopup;

  // Current tab shortcuts
  private get activeTab(): TabState | undefined {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  // SDK commands (loaded once)
  private sdkCommands: Array<{ name: string; description: string }> = [];
  private sdkCommandsFetched = false;

  // Callbacks to plugin
  onSaveSession: ((session: SavedSession) => void) | null = null;
  onShowSessionPicker: (() => void) | null = null;

  constructor(leaf: WorkspaceLeaf, settings: PluginSettings, sessionStore: SessionStore) {
    super(leaf);
    this.settings = settings;
    this.vaultCtx = new VaultContext(this.app);
    this.sessionStore = sessionStore;
  }

  getViewType(): string { return VIEW_TYPE_CLAUDE; }
  getDisplayText(): string { return "Claude Code"; }
  getIcon(): string { return "claude-mono"; }

  async onOpen(): Promise<void> {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("ccd-root");

    // Header
    const headerEl = root.createDiv("ccd-header");
    this.header = new ChatHeader(headerEl, {
      onNewTab: () => this.addNewTab(),
      onAbort: () => this.activeTab?.pm.abort(),
      onHistory: () => this.onShowSessionPicker?.(),
      onSettings: () => { /* open settings tab */ },
      onSwitchTab: (id) => this.switchToTab(id),
      onCloseTab: (id) => this.closeTab(id),
    });

    // Toolbar
    const toolbarEl = root.createDiv("ccd-toolbar");
    this.toolbar = new ChatToolbar(toolbarEl, {
      onPlanFirstToggle: (v) => { if (this.activeTab) this.activeTab.pm.planFirst = v; },
      onThinkingModeToggle: (v) => { if (this.activeTab) this.activeTab.pm.thinkingMode = v; },
      onMcpServerToggle: () => {},
    });

    // Chat messages area
    const chatArea = root.createDiv("ccd-chat-area");
    this.chatMessages = new ChatMessages(chatArea, this.app, this);
    this.chatStream = new ChatStream(chatArea, this.app, this, this.settings);
    this.progress = new ProgressIndicator(chatArea);

    // Input area
    const inputArea = root.createDiv("ccd-input-area");
    this.chatInput = new ChatInput(inputArea, {
      onSend: (text) => this.sendMessage(text),
      onStop: () => { this.activeTab?.pm.abort(); },
      onModelChange: (m) => this.changeModel(m),
      onEffortChange: (e) => { if (this.activeTab) this.activeTab.pm.effort = e; },
      onAttachFile: () => this.showFilePicker(),
      onAtMention: () => this.showAtMention(),
      onSlashTrigger: () => this.slashPopup?.update(),
      onPasteImage: (f) => this.handlePasteImage(f),
      onDropFiles: (files) => this.handleDropFiles(files),
      onRemoveContext: () => {},
      onRemoveAttachment: () => {},
    });

    this.slashPopup = new SlashCommandPopup(inputArea, this.chatInput.getTextarea());

    // Create initial tab
    this.addNewTab();
    this.header.render();
    this.toolbar.render(null);
    this.toolbar.setPlanFirst(this.settings.planFirstDefault);
    this.toolbar.setThinkingMode(this.settings.thinkingModeDefault);
    this.chatMessages.showEmptyState("Ready to chat with Claude Code. Type your message below.");
  }

  async onClose(): Promise<void> {
    for (const tab of this.tabs) {
      tab.pm.destroy();
    }
    this.tabs = [];
  }

  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
    for (const tab of this.tabs) {
      tab.pm.updateSettings(settings);
    }
  }

  // ── Tab Management ──

  private addNewTab(): void {
    const pm = new ProcessManager(this.settings);
    pm.model = this.settings.defaultModel || "sonnet";
    pm.planFirst = this.settings.planFirstDefault;
    pm.thinkingMode = this.settings.thinkingModeDefault;

    const tab: TabState = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      session: null,
      sessionId: null,
      firstMessageText: "",
      turnCount: 0,
      pm,
      pendingPermissions: [],
    };

    this.tabs = [...this.tabs, tab];
    this.switchToTab(tab.id);

    // Pre-warm the query
    const cwd = this.settings.workingDirectory || this.vaultCtx.getVaultBasePath();
    pm.warmUp(cwd);
  }

  private switchToTab(tabId: string): void {
    // Save current tab state
    const current = this.activeTab;
    if (current) {
      this.saveTabState(current);
      this.wireBackgroundPM(current);
    }

    this.activeTabId = tabId;
    const tab = this.activeTab;
    if (!tab) return;

    // Restore tab state
    this.wirePM(tab);
    this.restoreTabMessages(tab);
    this.header.renderTabBar(this.tabs.map(t => ({ id: t.id, title: t.title })), this.activeTabId);
    this.header.updateContextBar(tab.session);
    this.toolbar.render(tab.session);
  }

  private closeTab(tabId: string): void {
    const idx = this.tabs.findIndex(t => t.id === tabId);
    if (idx < 0) return;

    const tab = this.tabs[idx];
    tab.pm.destroy();
    this.tabs = this.tabs.filter(t => t.id !== tabId);

    if (this.tabs.length === 0) {
      this.addNewTab();
    } else if (this.activeTabId === tabId) {
      const newIdx = Math.min(idx, this.tabs.length - 1);
      this.switchToTab(this.tabs[newIdx].id);
    } else {
      this.header.renderTabBar(this.tabs.map(t => ({ id: t.id, title: t.title })), this.activeTabId);
    }
  }

  private saveTabState(_tab: TabState): void {
    // Messages are already stored in tab.messages by reference
  }

  private restoreTabMessages(tab: TabState): void {
    this.chatMessages.clear();
    this.chatStream.reset();
    if (tab.messages.length === 0) {
      this.chatMessages.showEmptyState("Ready to chat with Claude Code. Type your message below.");
    } else {
      this.chatMessages.hideEmptyState();
      for (const msg of tab.messages) {
        if (msg.role === "user") {
          this.chatMessages.renderUserMessage(msg);
        } else if (msg.role === "assistant") {
          this.chatMessages.renderAssistantMessage(msg);
        }
      }
      this.chatMessages.scrollToBottom();
    }
  }

  private wirePM(tab: TabState): void {
    tab.pm.onEvent = (e) => this.handleEvent(e);
    tab.pm.onStateChange = () => this.updateUI();
    tab.pm.onComplete = () => this.onResponseComplete();
    tab.pm.onPermissionRequest = (info) => this.showPermissionPrompt(info);
    tab.pm.onStderr = (data) => this.handleStderr(data);
  }

  private wireBackgroundPM(tab: TabState): void {
    tab.pm.onEvent = (e) => {
      // Accumulate events but don't render
      if (e.type === "assistant" || e.type === "result") {
        // minimal background accumulation
      }
    };
    tab.pm.onStateChange = () => {
      this.header.renderTabBar(this.tabs.map(t => ({ id: t.id, title: t.title })), this.activeTabId);
    };
    tab.pm.onComplete = () => {};
    tab.pm.onPermissionRequest = (info) => {
      return new Promise((resolve) => {
        tab.pendingPermissions = [
          ...tab.pendingPermissions,
          { info, resolve },
        ];
        new Notice(`Tab "${tab.title}" needs permission for ${info.toolName}`);
      });
    };
  }

  // ── Message Sending ──

  private sendMessage(text: string): void {
    const tab = this.activeTab;
    if (!tab) return;

    // Check if already running - queue
    if (tab.pm.isRunning) {
      return;
    }

    let fullMessage = text;

    // Attach vault context
    const context = this.vaultCtx.getAutoContext();
    if (context) {
      fullMessage += `\n\n[Selected from ${context.fileName}]\n${context.text}`;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
      attachments: context ? [{ type: "selection", name: context.fileName, preview: context.text.slice(0, 100) }] : undefined,
    };

    tab.messages = [...tab.messages, userMsg];
    if (!tab.firstMessageText) {
      tab.firstMessageText = text.slice(0, 40);
      tab.title = tab.firstMessageText || "New Chat";
      this.header.renderTabBar(this.tabs.map(t => ({ id: t.id, title: t.title })), this.activeTabId);
    }
    tab.turnCount++;

    this.chatMessages.hideEmptyState();
    this.chatMessages.renderUserMessage(userMsg);
    this.chatStream.reset();
    this.progress.show("claude-mono", "Thinking...");
    this.chatInput.setRunning(true);

    const cwd = this.settings.workingDirectory || this.vaultCtx.getVaultBasePath();
    tab.pm.send(fullMessage, cwd);
  }

  // ── Event Handling ──

  private handleEvent(event: ClaudeEvent): void {
    const tab = this.activeTab;
    if (!tab) return;

    switch (event.type) {
      case "system": {
        const sysEvent = event as SystemInitEvent;
        if (sysEvent.subtype === "init") {
          tab.session = {
            sessionId: sysEvent.session_id,
            model: sysEvent.model,
            mcpServers: sysEvent.mcp_servers,
            cliVersion: sysEvent.claude_code_version,
            totalCost: 0,
            inputTokens: 0,
            outputTokens: 0,
            contextWindow: 0,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
          };
          tab.sessionId = sysEvent.session_id;
          this.header.updateContextBar(tab.session);
          this.toolbar.render(tab.session);
          if (!this.sdkCommandsFetched) {
            void this.loadSdkCommands(tab);
          }
        }
        break;
      }

      case "stream_delta":
        this.chatStream.handleStreamDelta(event as StreamDeltaEvent);
        break;

      case "assistant":
        this.chatStream.handleAssistantEvent(event as AssistantMessageEvent, tab);
        break;

      case "result": {
        const resultEvent = event as ResultEvent;
        if (tab.session) {
          tab.session = {
            ...tab.session,
            totalCost: resultEvent.total_cost_usd,
            inputTokens: resultEvent.usage.input_tokens,
            outputTokens: resultEvent.usage.output_tokens,
            cacheReadTokens: resultEvent.usage.cache_read_input_tokens ?? 0,
            cacheCreationTokens: resultEvent.usage.cache_creation_input_tokens ?? 0,
          };
          const modelUsage = (resultEvent as unknown as Record<string, unknown>).modelUsage as Record<string, { contextWindow?: number }> | undefined;
          if (modelUsage) {
            const first = Object.values(modelUsage)[0];
            if (first?.contextWindow) {
              tab.session = { ...tab.session, contextWindow: first.contextWindow };
            }
          }
          this.header.updateContextBar(tab.session);
        }
        break;
      }
    }
  }

  private onResponseComplete(): void {
    const tab = this.activeTab;
    if (!tab) return;

    this.chatStream.finalize();
    this.progress.hide();
    this.chatInput.setRunning(false);
    this.chatMessages.scrollToBottom();

    // Save session
    if (tab.sessionId && tab.session) {
      const snapshot = SessionStore.createSnapshot(tab.sessionId, tab.session.model, tab.messages);
      this.onSaveSession?.(snapshot);
    }
  }

  private updateUI(): void {
    const tab = this.activeTab;
    if (!tab) return;
    this.chatInput.setRunning(tab.pm.isRunning);
    this.header.setAbortVisible(tab.pm.isRunning);
  }

  private async showPermissionPrompt(info: { toolName: string; input: Record<string, unknown>; title?: string; displayName?: string; description?: string }): Promise<"allow" | "deny" | "always"> {
    const mode = this.settings.permissionMode;
    if (mode === "bypassPermissions") return "allow";
    if (mode === "acceptEdits") {
      const editTools = ["Read", "Write", "Edit", "Glob", "Grep"];
      if (editTools.includes(info.toolName)) return "allow";
    }

    // Show inline permission prompt and await user decision
    const { showPermissionPrompt: showPrompt } = await import("./permission-prompt");
    const { promise } = showPrompt(
      this.chatStream.currentElement ?? this.containerEl.children[1] as HTMLElement,
      info,
    );
    return promise;
  }

  private handleStderr(data: string): void {
    const ignore = ["CPU lacks AVX", "warn:", "deprecat", "ExperimentalWarning"];
    if (ignore.some(w => data.includes(w))) return;

    if (data.includes("not logged in") || data.includes("authenticate")) {
      this.chatMessages.renderError("Not logged in. Run `claude` in terminal first to authenticate.");
    } else if (data.includes("context_length_exceeded")) {
      this.chatMessages.renderContextFullError(() => {
        this.activeTab?.pm.newSession();
        this.addNewTab();
      });
    }
  }

  private async changeModel(model: ModelChoice): Promise<void> {
    const tab = this.activeTab;
    if (!tab) return;
    await tab.pm.setModelRuntime(model);
  }

  private async loadSdkCommands(tab: TabState): Promise<void> {
    if (this.sdkCommandsFetched || !tab.pm.query) return;
    try {
      const cmds = await tab.pm.query.supportedCommands();
      this.sdkCommands = cmds.map((c: { name: string; description?: string }) => ({
        name: c.name,
        description: c.description ?? "",
      }));
      this.sdkCommandsFetched = true;
      this.slashPopup?.setSdkCommands(this.sdkCommands);
    } catch {
      /* ignore */
    }
  }

  /** Show Obsidian file picker to attach a vault file */
  private showFilePicker(): void {
    const files = this.app.vault.getFiles();
    const modal = new FilePickerModal(this.app, files, (file) => {
      const textarea = this.chatInput.getTextarea();
      const adapter = this.app.vault.adapter as { getBasePath?: () => string };
      const basePath = adapter.getBasePath?.() ?? "";
      const absPath = basePath ? `${basePath}/${file.path}` : file.path;
      // Insert file reference at cursor
      const ref = `[File: ${file.name}](${absPath})`;
      const pos = textarea.selectionStart;
      const before = textarea.value.slice(0, pos);
      const after = textarea.value.slice(pos);
      textarea.value = before + ref + after;
      textarea.focus();
      this.chatInput.renderContextCard({ fileName: file.name, text: file.path });
    });
    modal.open();
  }

  /** Show @ mention picker for vault files */
  private showAtMention(): void {
    const files = this.app.vault.getMarkdownFiles();
    const modal = new FilePickerModal(this.app, files, (file) => {
      const textarea = this.chatInput.getTextarea();
      // Insert @mention at cursor position
      const mention = `@${file.basename} `;
      const pos = textarea.selectionStart;
      const before = textarea.value.slice(0, pos);
      const after = textarea.value.slice(pos);
      textarea.value = before + mention + after;
      textarea.focus();
    });
    modal.open();
  }

  private handlePasteImage(file: File): void {
    const textarea = this.chatInput.getTextarea();
    // Write temp file and insert reference
    const tmpPath = `/tmp/ccd-paste-${Date.now()}-${file.name || "image.png"}`;
    file.arrayBuffer().then(buf => {
      const { writeFileSync } = require("fs") as typeof import("fs");
      writeFileSync(tmpPath, Buffer.from(buf));
      const ref = `[Image: ${tmpPath}]`;
      textarea.value += (textarea.value ? "\n" : "") + ref;
      textarea.focus();
      new Notice(`Image attached: ${file.name || "clipboard"}`);
    }).catch(() => new Notice("Failed to attach image"));
  }

  private handleDropFiles(files: File[]): void {
    for (const file of files) {
      this.handlePasteImage(file);
    }
  }

  // ── Public API ──

  startNewSession(): void {
    this.addNewTab();
  }

  resumeSession(sessionId: string, messages?: ChatMessage[]): void {
    const tab = this.activeTab;
    if (!tab) return;
    tab.pm.setSessionId(sessionId);
    tab.sessionId = sessionId;
    if (messages) {
      tab.messages = [...messages];
      this.restoreTabMessages(tab);
    }
  }
}

/** Fuzzy file picker modal for attach and @mention */
class FilePickerModal extends FuzzySuggestModal<TFile> {
  private files: TFile[];
  private onChoose: (file: TFile) => void;

  constructor(app: import("obsidian").App, files: TFile[], onChoose: (file: TFile) => void) {
    super(app);
    this.files = files;
    this.onChoose = onChoose;
    this.setPlaceholder("Search vault files...");
  }

  getItems(): TFile[] { return this.files; }
  getItemText(item: TFile): string { return item.path; }
  onChooseItem(item: TFile): void { this.onChoose(item); }
}
