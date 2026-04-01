import { setIcon } from "obsidian";
import type { SessionInfo, McpServer } from "../types/chat";

export interface ChatToolbarCallbacks {
  onPlanFirstToggle: (enabled: boolean) => void;
  onThinkingModeToggle: (enabled: boolean) => void;
  onMcpServerToggle: (serverName: string, enabled: boolean) => void;
}

export class ChatToolbar {
  private container: HTMLElement;
  private callbacks: ChatToolbarCallbacks;
  private planFirstToggle!: HTMLElement;
  private thinkingToggle!: HTMLElement;
  private mcpContainer!: HTMLElement;
  private planFirstEnabled = false;
  private thinkingEnabled = true;

  constructor(container: HTMLElement, callbacks: ChatToolbarCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  render(session: SessionInfo | null): void {
    this.container.empty();

    const row = this.container.createDiv("ccd-toolbar-row");

    // Plan First toggle
    this.planFirstToggle = this.createToggle(row, "Plan First", this.planFirstEnabled, (v) => {
      this.planFirstEnabled = v;
      this.callbacks.onPlanFirstToggle(v);
    });

    // Thinking Mode toggle
    this.thinkingToggle = this.createToggle(row, "Thinking Mode", this.thinkingEnabled, (v) => {
      this.thinkingEnabled = v;
      this.callbacks.onThinkingModeToggle(v);
    });

    // MCP servers (if session has them)
    this.mcpContainer = row.createDiv("ccd-mcp-container");
    if (session?.mcpServers?.length) {
      this.renderMcpServers(session.mcpServers);
    }
  }

  private createToggle(parent: HTMLElement, label: string, initial: boolean, onChange: (v: boolean) => void): HTMLElement {
    const wrapper = parent.createDiv("ccd-toggle-wrapper");
    wrapper.createSpan({ text: label, cls: "ccd-toggle-label" });

    const track = wrapper.createDiv("ccd-toggle-track");
    const thumb = track.createDiv("ccd-toggle-thumb");

    if (initial) track.addClass("ccd-toggle-on");

    let state = initial;
    track.addEventListener("click", () => {
      state = !state;
      track.toggleClass("ccd-toggle-on", state);
      onChange(state);
    });

    return wrapper;
  }

  private renderMcpServers(servers: McpServer[]): void {
    this.mcpContainer.empty();

    const btn = this.mcpContainer.createDiv("ccd-mcp-btn");
    const icon = btn.createSpan("ccd-mcp-icon");
    setIcon(icon, "plug");
    btn.createSpan({ text: `MCP (${servers.length})`, cls: "ccd-mcp-label" });

    btn.addEventListener("click", () => {
      const existing = this.mcpContainer.querySelector(".ccd-mcp-popup");
      if (existing) { existing.remove(); return; }

      const popup = this.mcpContainer.createDiv("ccd-mcp-popup");
      for (const server of servers) {
        const item = popup.createDiv("ccd-mcp-item");
        const statusDot = item.createSpan("ccd-mcp-status");
        statusDot.addClass(server.status === "connected" ? "ccd-mcp-connected" : "ccd-mcp-disconnected");
        item.createSpan({ text: server.name, cls: "ccd-mcp-server-name" });
      }

      const closePopup = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node) && !btn.contains(e.target as Node)) {
          popup.remove();
          document.removeEventListener("click", closePopup);
        }
      };
      setTimeout(() => document.addEventListener("click", closePopup), 0);
    });
  }

  setPlanFirst(enabled: boolean): void {
    this.planFirstEnabled = enabled;
    const track = this.planFirstToggle?.querySelector(".ccd-toggle-track");
    track?.toggleClass("ccd-toggle-on", enabled);
  }

  setThinkingMode(enabled: boolean): void {
    this.thinkingEnabled = enabled;
    const track = this.thinkingToggle?.querySelector(".ccd-toggle-track");
    track?.toggleClass("ccd-toggle-on", enabled);
  }

  setMcpServers(servers: McpServer[]): void {
    this.renderMcpServers(servers);
  }
}
