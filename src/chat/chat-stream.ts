import { MarkdownRenderer, setIcon, type App, type Component } from "obsidian";
import type { PluginSettings } from "../types/settings";
import type { ChatMessage, ToolCallInfo, ContentSegment } from "../types/chat";
import type { AssistantMessageEvent, StreamDeltaEvent, ContentBlock } from "../types/events";
import { enhanceCodeBlocks } from "./code-block-enhancer";

/**
 * Streaming state machine with append-only rendering and deduplication.
 *
 * The SDK sends cumulative assistant messages (each event contains ALL content blocks).
 * This class tracks what has been rendered and only appends new content.
 */
export class ChatStream {
  private container: HTMLElement;
  private app: App;
  private component: Component;
  private settings: PluginSettings;

  // Streaming state
  private streamingEl: HTMLElement | null = null;
  private streamingTextEl: HTMLElement | null = null;
  private streamingText = "";
  private currentMsg: ChatMessage | null = null;

  // Dedup tracking
  private renderedToolIds = new Set<string>();
  private renderedTextHashes = new Set<string>();
  private renderedThinkingCount = 0;
  private lastAssistantMsgId = "";

  constructor(container: HTMLElement, app: App, component: Component, settings: PluginSettings) {
    this.container = container;
    this.app = app;
    this.component = component;
    this.settings = settings;
  }

  /** Handle incremental text streaming (raw text append) */
  handleStreamDelta(event: StreamDeltaEvent): void {
    // Skip subagent streams
    if (event.parent_tool_use_id) return;

    this.ensureStreamingEl();

    this.streamingText += event.text;

    // Update the streaming text element with raw text
    if (this.streamingTextEl) {
      this.streamingTextEl.textContent = this.streamingText;
    }

    this.scrollToBottom();
  }

  /** Handle structured assistant message (cumulative, needs dedup) */
  handleAssistantEvent(event: AssistantMessageEvent, tabState: { messages: ChatMessage[] }): void {
    const msg = event.message;
    if (!msg?.content?.length) return;

    // New message ID = new response block
    if (msg.id !== this.lastAssistantMsgId) {
      this.lastAssistantMsgId = msg.id;
      this.renderedToolIds.clear();
      this.renderedTextHashes.clear();
      this.renderedThinkingCount = 0;
      this.streamingText = "";

      // Create or update ChatMessage for this response
      this.currentMsg = {
        id: msg.id,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
        segments: [],
        toolCalls: [],
      };
      tabState.messages.push(this.currentMsg);
    }

    this.ensureStreamingEl();

    for (let i = 0; i < msg.content.length; i++) {
      const block = msg.content[i];
      this.renderBlock(block, msg.content, i);
    }

    this.scrollToBottom();
  }

  private renderBlock(block: ContentBlock, allBlocks: ContentBlock[], idx: number): void {
    switch (block.type) {
      case "thinking": {
        const thinkIdx = allBlocks.slice(0, idx).filter(b => b.type === "thinking").length;
        if (thinkIdx < this.renderedThinkingCount) return;
        this.renderedThinkingCount = thinkIdx + 1;
        this.renderThinkingBlock(block.thinking ?? "");
        break;
      }

      case "text": {
        const text = block.text ?? "";
        const hash = text.slice(0, 100) + "|" + text.length;
        if (this.renderedTextHashes.has(hash)) return;
        this.renderedTextHashes.add(hash);

        // Clear streaming text (we now have structured content)
        if (this.streamingTextEl) {
          this.streamingTextEl.remove();
          this.streamingTextEl = null;
          this.streamingText = "";
        }

        this.renderTextBlock(text);

        if (this.currentMsg) {
          this.currentMsg.content += text;
          this.currentMsg.segments?.push({ type: "text", text });
        }
        break;
      }

      case "tool_use": {
        const toolId = block.id ?? crypto.randomUUID();
        if (this.renderedToolIds.has(toolId)) return;
        this.renderedToolIds.add(toolId);

        const tc: ToolCallInfo = {
          id: toolId,
          name: block.name ?? "unknown",
          input: (block.input as Record<string, unknown>) ?? {},
          startTime: Date.now(),
        };

        if (this.currentMsg) {
          this.currentMsg.toolCalls?.push(tc);
          this.currentMsg.segments?.push({ type: "tool", tool: tc });
        }

        if (this.settings.showToolCalls) {
          this.renderToolCall(tc);
        }
        break;
      }

      case "tool_result": {
        // Find matching tool call and update
        const parentId = (block as unknown as { tool_use_id?: string }).tool_use_id;
        if (parentId && this.currentMsg?.toolCalls) {
          const tc = this.currentMsg.toolCalls.find(t => t.id === parentId);
          if (tc) {
            tc.result = typeof block.content === "string" ? block.content : JSON.stringify(block.content);
            tc.isError = block.is_error ?? false;
            tc.duration = tc.startTime ? Date.now() - tc.startTime : undefined;
          }
        }
        break;
      }
    }
  }

  private renderTextBlock(text: string): void {
    if (!this.streamingEl) return;
    const el = this.streamingEl.createDiv("ccd-stream-text");
    void MarkdownRenderer.render(this.app, text, el, "", this.component);
    enhanceCodeBlocks(el);
  }

  private renderThinkingBlock(text: string): void {
    if (!this.streamingEl) return;
    const el = this.streamingEl.createDiv("ccd-thinking");
    const header = el.createDiv("ccd-thinking-header");
    const icon = header.createSpan("ccd-thinking-icon");
    setIcon(icon, "brain");
    header.createSpan({ text: "Thinking...", cls: "ccd-thinking-label" });

    // Collapsible
    const body = el.createDiv("ccd-thinking-body ccd-collapsed");
    body.textContent = text;
    header.addEventListener("click", () => body.toggleClass("ccd-collapsed", !body.hasClass("ccd-collapsed")));
  }

  private renderToolCall(tc: ToolCallInfo): void {
    if (!this.streamingEl) return;
    const el = this.streamingEl.createDiv("ccd-tool-call");
    const header = el.createDiv("ccd-tool-header");

    const icon = header.createSpan("ccd-tool-icon");
    setIcon(icon, this.getToolIcon(tc.name));
    header.createSpan({ text: tc.name, cls: "ccd-tool-name" });

    const preview = this.getToolPreview(tc);
    if (preview) {
      header.createSpan({ text: preview, cls: "ccd-tool-input-preview" });
    }

    // Spinner
    const spinner = header.createSpan("ccd-tool-spinner");
    setIcon(spinner, "loader");

    // Collapsible input
    const body = el.createDiv("ccd-tool-body ccd-collapsed");
    const inputPre = body.createEl("pre", { cls: "ccd-tool-input-json" });
    inputPre.textContent = JSON.stringify(tc.input, null, 2);
    header.addEventListener("click", () => body.toggleClass("ccd-collapsed", !body.hasClass("ccd-collapsed")));
  }

  /** Finalize streaming - mark as complete */
  finalize(): void {
    if (this.currentMsg) {
      this.currentMsg.isStreaming = false;
    }
    if (this.streamingEl) {
      this.streamingEl.removeClass("ccd-streaming");
    }
    // Remove spinners from tool calls
    this.streamingEl?.querySelectorAll(".ccd-tool-spinner").forEach(el => el.remove());
    this.streamingEl = null;
    this.streamingTextEl = null;
    this.currentMsg = null;
  }

  /** Reset for new response */
  reset(): void {
    this.streamingEl = null;
    this.streamingTextEl = null;
    this.streamingText = "";
    this.currentMsg = null;
    this.renderedToolIds.clear();
    this.renderedTextHashes.clear();
    this.renderedThinkingCount = 0;
    this.lastAssistantMsgId = "";
  }

  private ensureStreamingEl(): void {
    if (!this.streamingEl) {
      this.streamingEl = this.container.createDiv("ccd-msg ccd-msg-assistant ccd-streaming");
      const bubble = this.streamingEl.createDiv("ccd-msg-bubble ccd-msg-bubble-assistant");
      this.streamingTextEl = bubble.createDiv("ccd-stream-raw-text");
      // Re-point streamingEl to the bubble for appending content
      this.streamingEl = bubble;
    }
  }

  private scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }

  private getToolIcon(name: string): string {
    const icons: Record<string, string> = {
      Read: "file-text", Write: "file-plus", Edit: "pencil",
      Bash: "terminal", Glob: "search", Grep: "search",
      Agent: "users", WebFetch: "globe", WebSearch: "globe",
    };
    return icons[name] ?? "wrench";
  }

  private getToolPreview(tc: ToolCallInfo): string {
    const input = tc.input;
    if (tc.name === "Read" || tc.name === "Write" || tc.name === "Edit") {
      const fp = input.file_path ?? input.path;
      if (typeof fp === "string") return fp.split("/").pop() ?? "";
    }
    if (tc.name === "Bash") {
      const cmd = input.command;
      if (typeof cmd === "string") return cmd.slice(0, 50);
    }
    if (tc.name === "Grep" || tc.name === "Glob") {
      const pat = input.pattern;
      if (typeof pat === "string") return pat.slice(0, 40);
    }
    return "";
  }
}
