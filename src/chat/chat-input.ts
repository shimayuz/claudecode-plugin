import { setIcon } from "obsidian";
import type { ModelChoice, EffortLevel } from "../types/settings";
import { MODEL_LABELS, EFFORT_LABELS } from "../types/settings";

export interface ChatInputCallbacks {
  onSend: (text: string) => void;
  onStop: () => void;
  onModelChange: (model: ModelChoice) => void;
  onEffortChange: (effort: EffortLevel) => void;
  onAttachFile: () => void;
  onAtMention: () => void;
  onSlashTrigger: () => void;
  onPasteImage: (file: File) => void;
  onDropFiles: (files: File[]) => void;
  onRemoveContext: () => void;
  onRemoveAttachment: (path: string) => void;
}

export class ChatInput {
  private container: HTMLElement;
  private callbacks: ChatInputCallbacks;
  private textareaEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLElement;
  private stopBtn!: HTMLElement;
  private modelLabel!: HTMLElement;
  private contextCard: HTMLElement | null = null;
  private isRunning = false;
  private currentModel: ModelChoice = "sonnet";

  constructor(container: HTMLElement, callbacks: ChatInputCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
  }

  private render(): void {
    this.container.empty();

    // Context card area (shown when selection is attached)
    // Will be populated dynamically

    // Textarea wrapper
    const textareaWrap = this.container.createDiv("ccd-input-wrap");
    this.textareaEl = textareaWrap.createEl("textarea", {
      cls: "ccd-textarea",
      attr: { placeholder: "Type your message... (/ for commands)", rows: "1" },
    });

    // Auto-resize textarea
    this.textareaEl.addEventListener("input", () => this.autoResize());

    // Keyboard shortcuts (IME-aware: skip Enter during composition)
    this.textareaEl.addEventListener("keydown", (e: KeyboardEvent) => {
      // Japanese/Chinese/Korean IME: Enter confirms input, don't send
      if (e.isComposing || e.keyCode === 229) return;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
      if (e.key === "/" && this.textareaEl.value === "") {
        this.callbacks.onSlashTrigger();
      }
    });

    // Paste handler (images)
    this.textareaEl.addEventListener("paste", (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) this.callbacks.onPasteImage(file);
          return;
        }
      }
    });

    // Drop handler
    this.container.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.container.addClass("ccd-drag-over");
    });
    this.container.addEventListener("dragleave", () => {
      this.container.removeClass("ccd-drag-over");
    });
    this.container.addEventListener("drop", (e) => {
      e.preventDefault();
      this.container.removeClass("ccd-drag-over");
      const files = e.dataTransfer?.files;
      if (files?.length) this.callbacks.onDropFiles(Array.from(files));
    });

    // Bottom row
    const bottomRow = this.container.createDiv("ccd-input-bottom");

    // Left side: Model selector + MCP
    const leftBtns = bottomRow.createDiv("ccd-input-left");

    // Model selector button
    const modelBtn = leftBtns.createDiv("ccd-model-btn");
    this.modelLabel = modelBtn.createSpan({ text: "Model", cls: "ccd-model-label" });
    const modelIcon = modelBtn.createSpan("ccd-model-icon");
    setIcon(modelIcon, "chevron-down");
    modelBtn.addEventListener("click", () => this.showModelPopup(modelBtn));
    this.setModelLabel(this.currentModel);

    // Slash command button
    const slashBtn = leftBtns.createDiv("ccd-slash-btn");
    slashBtn.createSpan({ text: "/", cls: "ccd-slash-icon" });
    slashBtn.addEventListener("click", () => {
      this.textareaEl.value = "/";
      this.textareaEl.focus();
      this.callbacks.onSlashTrigger();
    });

    // Right side: Attach + Send
    const rightBtns = bottomRow.createDiv("ccd-input-right");

    // Attach file button
    const attachBtn = rightBtns.createSpan("ccd-icon-btn");
    setIcon(attachBtn, "paperclip");
    attachBtn.addEventListener("click", () => this.callbacks.onAttachFile());

    // @ mention button
    const atBtn = rightBtns.createSpan("ccd-icon-btn");
    atBtn.createSpan({ text: "@", cls: "ccd-at-icon" });
    atBtn.addEventListener("click", () => this.callbacks.onAtMention());

    // Send button
    this.sendBtn = rightBtns.createDiv("ccd-send-btn");
    const sendIcon = this.sendBtn.createSpan("ccd-send-icon");
    setIcon(sendIcon, "send");
    this.sendBtn.createSpan({ text: "Send", cls: "ccd-send-label" });
    this.sendBtn.addEventListener("click", () => this.handleSend());

    // Stop button (hidden by default)
    this.stopBtn = rightBtns.createDiv("ccd-stop-btn ccd-hidden");
    const stopIcon = this.stopBtn.createSpan("ccd-stop-icon");
    setIcon(stopIcon, "square");
    this.stopBtn.createSpan({ text: "Stop", cls: "ccd-stop-label" });
    this.stopBtn.addEventListener("click", () => this.callbacks.onStop());
  }

  private handleSend(): void {
    const text = this.textareaEl.value.trim();
    if (!text || this.isRunning) return;
    this.callbacks.onSend(text);
    this.clear();
  }

  private autoResize(): void {
    this.textareaEl.style.height = "auto";
    const maxHeight = 200;
    this.textareaEl.style.height = Math.min(this.textareaEl.scrollHeight, maxHeight) + "px";
  }

  private showModelPopup(anchor: HTMLElement): void {
    // Remove existing popup
    const existing = this.container.querySelector(".ccd-model-popup");
    if (existing) {
      existing.remove();
      return;
    }

    const popup = this.container.createDiv("ccd-model-popup");
    const models: ModelChoice[] = ["opus[1m]", "opus", "sonnet", "haiku"];

    for (const model of models) {
      const item = popup.createDiv("ccd-model-item");
      if (model === this.currentModel) item.addClass("ccd-model-active");
      item.createSpan({ text: MODEL_LABELS[model] });
      item.addEventListener("click", () => {
        this.currentModel = model;
        this.setModelLabel(model);
        this.callbacks.onModelChange(model);
        popup.remove();
      });
    }

    // Effort level section
    popup.createDiv({ text: "Effort", cls: "ccd-model-section-title" });
    const efforts: EffortLevel[] = ["low", "medium", "high", "max"];
    const effortRow = popup.createDiv("ccd-effort-row");
    for (const effort of efforts) {
      const pill = effortRow.createSpan({ text: EFFORT_LABELS[effort], cls: "ccd-effort-pill" });
      pill.addEventListener("click", () => {
        this.callbacks.onEffortChange(effort);
        popup.remove();
      });
    }

    // Close on outside click
    const closePopup = (e: MouseEvent) => {
      if (!popup.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        popup.remove();
        document.removeEventListener("click", closePopup);
      }
    };
    setTimeout(() => document.addEventListener("click", closePopup), 0);
  }

  // -- Public API --

  getTextarea(): HTMLTextAreaElement {
    return this.textareaEl;
  }

  getValue(): string {
    return this.textareaEl.value;
  }

  clear(): void {
    this.textareaEl.value = "";
    this.autoResize();
  }

  focus(): void {
    this.textareaEl.focus();
  }

  setModelLabel(model: ModelChoice): void {
    this.currentModel = model;
    if (this.modelLabel) {
      this.modelLabel.textContent = `Model: ${MODEL_LABELS[model]}`;
    }
  }

  setRunning(running: boolean): void {
    this.isRunning = running;
    if (running) {
      this.sendBtn.addClass("ccd-hidden");
      this.stopBtn.removeClass("ccd-hidden");
    } else {
      this.sendBtn.removeClass("ccd-hidden");
      this.stopBtn.addClass("ccd-hidden");
    }
  }

  renderContextCard(context: { fileName: string; text: string } | null): void {
    if (this.contextCard) {
      this.contextCard.remove();
      this.contextCard = null;
    }
    if (!context) return;

    this.contextCard = this.container.createDiv("ccd-context-card");
    const icon = this.contextCard.createSpan("ccd-context-icon");
    setIcon(icon, "file-text");
    this.contextCard.createSpan({ text: context.fileName, cls: "ccd-context-name" });
    this.contextCard.createSpan({
      text: context.text.slice(0, 60) + "...",
      cls: "ccd-context-preview",
    });
    const removeBtn = this.contextCard.createSpan("ccd-context-remove");
    setIcon(removeBtn, "x");
    removeBtn.addEventListener("click", () => {
      this.contextCard?.remove();
      this.contextCard = null;
      this.callbacks.onRemoveContext();
    });

    // Insert before textarea
    const wrap = this.container.querySelector(".ccd-input-wrap");
    if (wrap) this.container.insertBefore(this.contextCard, wrap);
  }

  showQueueIndicator(text: string | null): void {
    const existing = this.container.querySelector(".ccd-queue-indicator");
    if (existing) existing.remove();
    if (!text) return;

    const indicator = this.container.createDiv("ccd-queue-indicator");
    indicator.textContent = text;
    const wrap = this.container.querySelector(".ccd-input-wrap");
    if (wrap) this.container.insertBefore(indicator, wrap);
  }
}
