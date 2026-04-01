import { setIcon } from "obsidian";
import type { SessionInfo } from "../types/chat";

interface TabInfo {
  id: string;
  title: string;
}

export interface ChatHeaderCallbacks {
  onNewTab: () => void;
  onAbort: () => void;
  onHistory: () => void;
  onSettings: () => void;
  onSwitchTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export class ChatHeader {
  private container: HTMLElement;
  private callbacks: ChatHeaderCallbacks;
  private titleRow!: HTMLElement;
  private tabBarEl!: HTMLElement;
  private contextBarEl!: HTMLElement;
  private abortBtn!: HTMLElement;

  constructor(container: HTMLElement, callbacks: ChatHeaderCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  render(): void {
    this.container.empty();

    // Title row
    this.titleRow = this.container.createDiv("ccd-title-row");
    const titleLeft = this.titleRow.createDiv("ccd-title-left");
    const titleIcon = titleLeft.createSpan("ccd-title-icon");
    setIcon(titleIcon, "sparkles");
    titleLeft.createSpan({ text: "Claude Code Chat", cls: "ccd-title-text" });

    const titleRight = this.titleRow.createDiv("ccd-title-right");

    // Settings button
    const settingsBtn = titleRight.createSpan("ccd-icon-btn");
    setIcon(settingsBtn, "settings");
    settingsBtn.setAttribute("aria-label", "Settings");
    settingsBtn.addEventListener("click", () => this.callbacks.onSettings());

    // History button
    const historyBtn = titleRight.createSpan("ccd-icon-btn");
    setIcon(historyBtn, "history");
    historyBtn.setAttribute("aria-label", "History");
    historyBtn.addEventListener("click", () => this.callbacks.onHistory());

    // New chat button
    const newChatBtn = titleRight.createSpan("ccd-icon-btn ccd-btn-primary");
    setIcon(newChatBtn, "plus");
    newChatBtn.createSpan({ text: " New Chat", cls: "ccd-btn-label" });
    newChatBtn.addEventListener("click", () => this.callbacks.onNewTab());

    // Abort button (hidden by default)
    this.abortBtn = titleRight.createSpan("ccd-icon-btn ccd-btn-danger ccd-hidden");
    setIcon(this.abortBtn, "square");
    this.abortBtn.setAttribute("aria-label", "Abort");
    this.abortBtn.addEventListener("click", () => this.callbacks.onAbort());

    // Tab bar
    this.tabBarEl = this.container.createDiv("ccd-tab-bar");

    // Context bar
    this.contextBarEl = this.container.createDiv("ccd-context-bar ccd-hidden");
  }

  renderTabBar(tabs: TabInfo[], activeTabId: string): void {
    this.tabBarEl.empty();
    if (tabs.length <= 1) {
      this.tabBarEl.addClass("ccd-hidden");
      return;
    }
    this.tabBarEl.removeClass("ccd-hidden");

    for (const tab of tabs) {
      const tabEl = this.tabBarEl.createDiv("ccd-tab");
      if (tab.id === activeTabId) tabEl.addClass("ccd-tab-active");

      const label = tabEl.createSpan({ text: tab.title.slice(0, 25), cls: "ccd-tab-label" });
      label.addEventListener("click", () => this.callbacks.onSwitchTab(tab.id));

      if (tabs.length > 1) {
        const closeBtn = tabEl.createSpan("ccd-tab-close");
        setIcon(closeBtn, "x");
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.callbacks.onCloseTab(tab.id);
        });
      }
    }
  }

  updateContextBar(session: SessionInfo | null): void {
    if (!session) {
      this.contextBarEl.addClass("ccd-hidden");
      return;
    }
    this.contextBarEl.removeClass("ccd-hidden");
    this.contextBarEl.empty();

    const model = this.contextBarEl.createSpan("ccd-ctx-model");
    model.textContent = session.model;

    if (session.totalCost > 0) {
      const cost = this.contextBarEl.createSpan("ccd-ctx-cost");
      cost.textContent = `$${session.totalCost.toFixed(4)}`;
    }

    const tokens = this.contextBarEl.createSpan("ccd-ctx-tokens");
    const total = session.inputTokens + session.outputTokens;
    if (session.contextWindow > 0) {
      const pct = Math.round((total / session.contextWindow) * 100);
      tokens.textContent = `${this.formatTokens(total)} / ${this.formatTokens(session.contextWindow)} (${pct}%)`;
    } else {
      tokens.textContent = `${this.formatTokens(total)} tokens`;
    }

    if (session.cacheReadTokens > 0) {
      const cache = this.contextBarEl.createSpan("ccd-ctx-cache");
      cache.textContent = `cache: ${this.formatTokens(session.cacheReadTokens)}`;
    }

    if (session.cliVersion) {
      const ver = this.contextBarEl.createSpan("ccd-ctx-version");
      ver.textContent = `v${session.cliVersion}`;
    }
  }

  setAbortVisible(visible: boolean): void {
    if (visible) {
      this.abortBtn?.removeClass("ccd-hidden");
    } else {
      this.abortBtn?.addClass("ccd-hidden");
    }
  }

  private formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }
}
