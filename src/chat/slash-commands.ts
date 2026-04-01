import { setIcon } from "obsidian";
import { SKILL_CATALOG, HIDDEN_COMMANDS, CATEGORY_LABELS } from "../types/commands";
import type { SkillDef } from "../types/commands";

interface CommandItem {
  name: string;
  description: string;
  source: "skill" | "sdk" | "custom";
  category?: string;
}

export class SlashCommandPopup {
  private container: HTMLElement;
  private inputEl: HTMLTextAreaElement;
  private popupEl: HTMLElement | null = null;
  private items: CommandItem[] = [];
  private filteredItems: CommandItem[] = [];
  private selectedIdx = 0;
  private enabledSkills: string[] = [];
  private sdkCommands: Array<{ name: string; description: string }> = [];

  constructor(container: HTMLElement, inputEl: HTMLTextAreaElement) {
    this.container = container;
    this.inputEl = inputEl;
    this.setupInputListener();
  }

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
      setTimeout(() => this.hide(), 200);
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

  updateSkills(enabledSkills: string[]): void {
    this.enabledSkills = enabledSkills;
    this.rebuildItems();
  }

  setSdkCommands(commands: Array<{ name: string; description: string }>): void {
    this.sdkCommands = commands;
    this.rebuildItems();
  }

  private rebuildItems(): void {
    this.items = [];

    // Add enabled skills
    for (const skill of SKILL_CATALOG) {
      if (this.enabledSkills.includes(skill.id)) {
        this.items.push({
          name: skill.name.replace(/^\//, ""),
          description: skill.description,
          source: "skill",
          category: skill.category,
        });
      }
    }

    // Add SDK commands (deduplicate)
    const skillNames = new Set(this.items.map((i) => i.name));
    for (const cmd of this.sdkCommands) {
      if (HIDDEN_COMMANDS.has(cmd.name)) continue;
      if (skillNames.has(cmd.name)) continue;
      this.items.push({
        name: cmd.name,
        description: cmd.description,
        source: "sdk",
      });
    }

    // Sort: skills first, then SDK commands, alphabetical within each group
    this.items.sort((a, b) => {
      if (a.source !== b.source) return a.source === "skill" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  update(): void {
    const val = this.inputEl.value;
    const query = val.startsWith("/") ? val.slice(1).toLowerCase() : "";

    this.filteredItems = query
      ? this.items.filter(
          (item) =>
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
    title.textContent = "Commands & Prompt Snippets";

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

    // Add Custom Command option
    const addCustom = list.createDiv("ccd-slash-item ccd-slash-add-custom");
    const addIcon = addCustom.createSpan("ccd-slash-item-icon");
    setIcon(addIcon, "plus");
    addCustom.createDiv({ cls: "ccd-slash-item-content" }).innerHTML =
      '<span class="ccd-slash-item-name">Add Custom Command</span>' +
      '<span class="ccd-slash-item-desc">Create your own slash command</span>';

    for (let i = 0; i < this.filteredItems.length; i++) {
      const item = this.filteredItems[i];
      const el = list.createDiv("ccd-slash-item");
      if (i === this.selectedIdx) el.addClass("ccd-slash-selected");

      const icon = el.createSpan("ccd-slash-item-icon");
      setIcon(icon, item.source === "skill" ? "sparkles" : "terminal");

      const content = el.createDiv("ccd-slash-item-content");
      content.createSpan({ text: `/${item.name}`, cls: "ccd-slash-item-name" });
      content.createSpan({ text: item.description, cls: "ccd-slash-item-desc" });

      if (item.category) {
        el.createSpan({
          text: CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] ?? item.category,
          cls: "ccd-slash-item-tag",
        });
      }

      el.addEventListener("click", () => this.selectItem(i));
      el.addEventListener("mouseenter", () => {
        this.selectedIdx = i;
        this.highlightSelected();
      });
    }
  }

  private highlightSelected(): void {
    if (!this.popupEl) return;
    const items = this.popupEl.querySelectorAll(".ccd-slash-item:not(.ccd-slash-add-custom)");
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
    // Trigger input event for slash-command args
    this.inputEl.dispatchEvent(new Event("input"));
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    switch (e.key) {
      case "ArrowDown":
        this.selectedIdx = Math.min(this.selectedIdx + 1, this.filteredItems.length - 1);
        this.highlightSelected();
        return true;
      case "ArrowUp":
        this.selectedIdx = Math.max(this.selectedIdx - 1, 0);
        this.highlightSelected();
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

  hide(): void {
    this.popupEl?.remove();
    this.popupEl = null;
  }

  isVisible(): boolean {
    return this.popupEl !== null;
  }
}
