import { setIcon } from "obsidian";
import type { AutomationProcess, ScheduledTask } from "../services/automation-service";

export function renderProcessCard(parent: HTMLElement, proc: AutomationProcess): void {
  const card = parent.createDiv("ccd-auto-card");

  // Header
  const header = card.createDiv("ccd-auto-card-header");
  const icon = header.createSpan("ccd-auto-card-icon");
  setIcon(icon, "play-circle");

  header.createSpan({ text: `PID ${proc.pid}`, cls: "ccd-auto-card-pid" });

  const statusBadge = header.createSpan("ccd-auto-badge ccd-auto-badge-running");
  statusBadge.textContent = proc.status;

  // Prompt
  const promptEl = card.createDiv("ccd-auto-card-prompt");
  promptEl.createSpan({ text: "Prompt: ", cls: "ccd-auto-card-label" });
  promptEl.createSpan({ text: proc.prompt, cls: "ccd-auto-card-value" });

  // Info
  const infoRow = card.createDiv("ccd-auto-card-info");
  if (proc.startTime) {
    infoRow.createSpan({ text: `Started: ${proc.startTime}`, cls: "ccd-auto-card-time" });
  }

  // Command (collapsible)
  const cmdToggle = card.createDiv("ccd-auto-card-cmd-toggle");
  cmdToggle.createSpan({ text: "Show full command", cls: "ccd-auto-card-toggle-text" });
  const cmdBody = card.createDiv("ccd-auto-card-cmd ccd-collapsed");
  const cmdPre = cmdBody.createEl("pre");
  cmdPre.textContent = proc.command;
  cmdToggle.addEventListener("click", () => {
    const isCollapsed = cmdBody.hasClass("ccd-collapsed");
    cmdBody.toggleClass("ccd-collapsed", !isCollapsed);
    const text = cmdToggle.querySelector(".ccd-auto-card-toggle-text");
    if (text) text.textContent = isCollapsed ? "Hide command" : "Show full command";
  });
}

export function renderScheduledTaskCard(parent: HTMLElement, task: ScheduledTask): void {
  const card = parent.createDiv("ccd-auto-card");

  // Header
  const header = card.createDiv("ccd-auto-card-header");
  const icon = header.createSpan("ccd-auto-card-icon");
  setIcon(icon, "clock");

  header.createSpan({ text: task.schedule, cls: "ccd-auto-card-schedule" });

  const statusBadge = header.createSpan(`ccd-auto-badge ccd-auto-badge-${task.status}`);
  statusBadge.textContent = task.status;

  // Command
  const cmdEl = card.createDiv("ccd-auto-card-prompt");
  cmdEl.createSpan({ text: "Command: ", cls: "ccd-auto-card-label" });
  cmdEl.createSpan({ text: task.command, cls: "ccd-auto-card-value" });

  // Timing info
  const infoRow = card.createDiv("ccd-auto-card-info");
  if (task.lastRun) {
    infoRow.createSpan({ text: `Last: ${task.lastRun.toLocaleString()}` });
  }
  if (task.nextRun) {
    infoRow.createSpan({ text: `Next: ${task.nextRun.toLocaleString()}` });
  }
}
