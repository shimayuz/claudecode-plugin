import { setIcon } from "obsidian";

export class ProgressIndicator {
  private container: HTMLElement;
  private el: HTMLElement | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(iconName: string, text: string): void {
    this.hide();
    this.el = this.container.createDiv("ccd-progress");

    const iconEl = this.el.createSpan("ccd-progress-icon");
    setIcon(iconEl, iconName);

    this.el.createSpan({ text, cls: "ccd-progress-text" });

    const timerEl = this.el.createSpan("ccd-progress-timer");
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - this.startTime) / 1000);
      timerEl.textContent = `${elapsed}s`;
    }, 1000);

    this.container.scrollTop = this.container.scrollHeight;
  }

  updateActivity(toolName: string, input: Record<string, unknown>, isSubagent = false): void {
    if (!this.el) return;
    const textEl = this.el.querySelector(".ccd-progress-text");
    if (!textEl) return;

    let desc = toolName;
    if (toolName === "Bash") {
      const cmd = input.command;
      if (typeof cmd === "string") desc = `Running: ${cmd.slice(0, 50)}`;
    } else if (toolName === "Read") {
      const fp = input.file_path;
      if (typeof fp === "string") desc = `Reading: ${(fp as string).split("/").pop()}`;
    } else if (toolName === "Edit" || toolName === "Write") {
      const fp = input.file_path;
      if (typeof fp === "string") desc = `Editing: ${(fp as string).split("/").pop()}`;
    } else if (toolName === "Agent") {
      desc = "Running subagent...";
    }

    if (isSubagent) desc = `[Subagent] ${desc}`;
    textEl.textContent = desc;
  }

  hide(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.el?.remove();
    this.el = null;
  }
}
