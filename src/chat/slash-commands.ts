import { setIcon } from "obsidian";
import { scanLocalCommands, type DiscoveredCommand } from "../services/command-scanner";
import { HIDDEN_COMMANDS } from "../types/commands";

interface CommandItem {
  name: string;
  description: string;
  source: "commands" | "skills" | "sdk";
}

export class SlashCommandPopup {
  private container: HTMLElement;
  private inputEl: HTMLTextAreaElement;
  private popupEl: HTMLElement | null = null;
  private items: CommandItem[] = [];
  private filteredItems: CommandItem[] = [];
  private selectedIdx = 0;
  private sdkCommands: Array<{ name: string; description: string }> = [];
  private localCommands: DiscoveredCommand[] = [];
  private lastScanTime = 0;

  constructor(container: HTMLElement, inputEl: HTMLTextAreaElement) {
    this.container = container;
    this.inputEl = inputEl;
    this.setupInputListener();
    // Initial scan
    this.scanCommands();
  }

  private blurTimer: ReturnType<typeof setTimeout> | null = null;

  private setupInputListener(): void {
    this.inputEl.addEventListener("input", () => this.onInputChange());
    this.inputEl.addEventListener("keydown", (e) => {
      if (this.isVisible()) {
        if (this.handleKeyDown(e)) {
          e.preventDefault();
        }
      }
    });
    this.inputEl.addEventListener("blur", () => {
      // Delay hide so clicks on popup items or /button can cancel it
      this.blurTimer = setTimeout(() => this.hide(), 300);
    });
    this.inputEl.addEventListener("focus", () => {
      // Cancel pending hide when refocused (e.g. /button click)
      if (this.blurTimer) { clearTimeout(this.blurTimer); this.blurTimer = null; }
    });
  }

  private onInputChange(): void {
    const val = this.inputEl.value;
    if (val.startsWith("/") && !val.includes(" ")) {
      this.update();
    } else {
      this.hide();
    }
  }

  /** Rescan ~/.claude/commands/ and ~/.claude/skills/ */
  scanCommands(): void {
    const now = Date.now();
    // Throttle: scan at most every 10 seconds
    if (now - this.lastScanTime < 10_000 && this.localCommands.length > 0) return;
    this.lastScanTime = now;
    this.localCommands = scanLocalCommands();
    this.rebuildItems();
  }

  setSdkCommands(commands: Array<{ name: string; description: string }>): void {
    this.sdkCommands = commands;
    this.rebuildItems();
  }

  private rebuildItems(): void {
    this.items = [];
    const seen = new Set<string>();

    // 1. Local commands (~/.claude/commands/) — highest priority
    for (const cmd of this.localCommands.filter(c => c.source === "commands")) {
      if (seen.has(cmd.name) || HIDDEN_COMMANDS.has(cmd.name)) continue;
      seen.add(cmd.name);
      this.items.push({ name: cmd.name, description: cmd.description, source: "commands" });
    }

    // 2. Local skills (~/.claude/skills/)
    for (const cmd of this.localCommands.filter(c => c.source === "skills")) {
      if (seen.has(cmd.name) || HIDDEN_COMMANDS.has(cmd.name)) continue;
      seen.add(cmd.name);
      this.items.push({ name: cmd.name, description: cmd.description, source: "skills" });
    }

    // 3. SDK built-in commands
    for (const cmd of this.sdkCommands) {
      if (seen.has(cmd.name) || HIDDEN_COMMANDS.has(cmd.name)) continue;
      seen.add(cmd.name);
      this.items.push({ name: cmd.name, description: cmd.description, source: "sdk" });
    }

    // Sort: commands first, then skills, then SDK
    const order: Record<string, number> = { commands: 0, skills: 1, sdk: 2 };
    this.items.sort((a, b) => {
      const diff = (order[a.source] ?? 3) - (order[b.source] ?? 3);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }

  update(): void {
    // Rescan on popup open (throttled)
    this.scanCommands();

    const val = this.inputEl.value;
    const query = val.startsWith("/") ? val.slice(1).toLowerCase() : "";

    this.filteredItems = query
      ? this.items.filter(item =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query),
        )
      : [...this.items];

    this.selectedIdx = 0;

    if (this.filteredItems.length === 0) {
      this.hide();
      return;
    }

    this.renderPopup();
  }

  private renderPopup(): void {
    if (!this.popupEl) {
      this.popupEl = this.container.createDiv("ccd-slash-popup");
    }
    this.popupEl.empty();

    // Title
    const title = this.popupEl.createDiv("ccd-slash-title");
    title.createSpan({ text: "Commands & Prompt Snippets", cls: "ccd-slash-title-text" });

    const countEl = title.createSpan({ text: `${this.filteredItems.length}/${this.items.length}`, cls: "ccd-slash-count" });

    const closeBtn = title.createSpan("ccd-slash-close");
    setIcon(closeBtn, "x");
    closeBtn.addEventListener("click", () => this.hide());

    // Search display
    const searchRow = this.popupEl.createDiv("ccd-slash-search");
    searchRow.createSpan({ text: "/", cls: "ccd-slash-search-icon" });
    searchRow.createSpan({
      text: this.inputEl.value.slice(1) || "Search commands and snippets...",
      cls: "ccd-slash-search-text",
    });

    // Items
    const list = this.popupEl.createDiv("ccd-slash-list");

    // Group by source
    let lastSource = "";
    for (let i = 0; i < this.filteredItems.length; i++) {
      const item = this.filteredItems[i];

      // Section header on source change
      if (item.source !== lastSource) {
        lastSource = item.source;
        const label = item.source === "commands" ? "Custom Commands"
          : item.source === "skills" ? "Skills"
          : "Built-in Commands";
        const sectionHeader = list.createDiv("ccd-slash-section");
        sectionHeader.textContent = label;
      }

      const el = list.createDiv("ccd-slash-item");
      if (i === this.selectedIdx) el.addClass("ccd-slash-selected");

      const icon = el.createSpan("ccd-slash-item-icon");
      const iconName = item.source === "commands" ? "terminal"
        : item.source === "skills" ? "sparkles"
        : "zap";
      setIcon(icon, iconName);

      const content = el.createDiv("ccd-slash-item-content");
      content.createSpan({ text: `/${item.name}`, cls: "ccd-slash-item-name" });
      content.createSpan({ text: item.description, cls: "ccd-slash-item-desc" });

      const tag = el.createSpan({ text: item.source, cls: "ccd-slash-item-tag" });

      el.addEventListener("click", () => this.selectItem(i));
      el.addEventListener("mouseenter", () => {
        this.selectedIdx = i;
        this.highlightSelected();
      });
    }
  }

  private highlightSelected(): void {
    if (!this.popupEl) return;
    const items = this.popupEl.querySelectorAll(".ccd-slash-item");
    items.forEach((el, i) => {
      el.toggleClass("ccd-slash-selected", i === this.selectedIdx);
    });
  }

  private selectItem(idx: number): void {
    const item = this.filteredItems[idx];
    if (!item) return;
    this.inputEl.value = `/${item.name} `;
    this.inputEl.focus();
    this.hide();
    this.inputEl.dispatchEvent(new Event("input"));
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    switch (e.key) {
      case "ArrowDown":
        this.selectedIdx = Math.min(this.selectedIdx + 1, this.filteredItems.length - 1);
        this.highlightSelected();
        this.scrollToSelected();
        return true;
      case "ArrowUp":
        this.selectedIdx = Math.max(this.selectedIdx - 1, 0);
        this.highlightSelected();
        this.scrollToSelected();
        return true;
      case "Enter":
      case "Tab":
        this.selectItem(this.selectedIdx);
        return true;
      case "Escape":
        this.hide();
        return true;
      default:
        return false;
    }
  }

  private scrollToSelected(): void {
    if (!this.popupEl) return;
    const selected = this.popupEl.querySelector(".ccd-slash-selected");
    selected?.scrollIntoView({ block: "nearest" });
  }

  hide(): void {
    this.popupEl?.remove();
    this.popupEl = null;
  }

  isVisible(): boolean {
    return this.popupEl !== null;
  }
}
