import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type { PluginSettings } from "../types/settings";
import { AutomationService, type AutomationProcess, type ScheduledTask } from "../services/automation-service";
import { renderProcessCard, renderScheduledTaskCard } from "./automation-cards";

export const VIEW_TYPE_AUTOMATION = "claudecode-dashboard-automation";

export class AutomationView extends ItemView {
  private settings: PluginSettings;
  private automationService: AutomationService;
  private processesContainer!: HTMLElement;
  private tasksContainer!: HTMLElement;

  constructor(leaf: WorkspaceLeaf, settings: PluginSettings) {
    super(leaf);
    this.settings = settings;
    this.automationService = new AutomationService();
  }

  getViewType(): string { return VIEW_TYPE_AUTOMATION; }
  getDisplayText(): string { return "Automation Dashboard"; }
  getIcon(): string { return "cpu"; }

  async onOpen(): Promise<void> {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("ccd-auto-root");

    // Header
    const header = root.createDiv("ccd-auto-header");
    const titleIcon = header.createSpan("ccd-auto-title-icon");
    setIcon(titleIcon, "cpu");
    header.createSpan({ text: "Automation Dashboard", cls: "ccd-auto-title" });

    const refreshBtn = header.createSpan("ccd-icon-btn");
    setIcon(refreshBtn, "refresh-cw");
    refreshBtn.addEventListener("click", () => this.refresh());

    // Running processes section
    const processesSection = root.createDiv("ccd-auto-section");
    const processesHeader = processesSection.createDiv("ccd-auto-section-header");
    const processesIcon = processesHeader.createSpan("ccd-auto-section-icon");
    setIcon(processesIcon, "activity");
    processesHeader.createSpan({ text: "Running Processes", cls: "ccd-auto-section-title" });
    this.processesContainer = processesSection.createDiv("ccd-auto-cards");

    // Scheduled tasks section
    const tasksSection = root.createDiv("ccd-auto-section");
    const tasksHeader = tasksSection.createDiv("ccd-auto-section-header");
    const tasksIcon = tasksHeader.createSpan("ccd-auto-section-icon");
    setIcon(tasksIcon, "clock");
    tasksHeader.createSpan({ text: "Scheduled Tasks", cls: "ccd-auto-section-title" });
    this.tasksContainer = tasksSection.createDiv("ccd-auto-cards");

    // Start polling
    this.automationService.startPolling(this.settings.automationPollInterval, ({ processes, tasks }) => {
      this.renderProcesses(processes);
      this.renderTasks(tasks);
    });
  }

  async onClose(): Promise<void> {
    this.automationService.stopPolling();
  }

  private renderProcesses(processes: AutomationProcess[]): void {
    this.processesContainer.empty();
    if (processes.length === 0) {
      this.processesContainer.createDiv({ text: "No running claude -p processes.", cls: "ccd-auto-empty" });
      return;
    }
    for (const proc of processes) {
      renderProcessCard(this.processesContainer, proc);
    }
  }

  private renderTasks(tasks: ScheduledTask[]): void {
    this.tasksContainer.empty();
    if (tasks.length === 0) {
      this.tasksContainer.createDiv({ text: "No scheduled Claude tasks in crontab.", cls: "ccd-auto-empty" });
      return;
    }
    for (const task of tasks) {
      renderScheduledTaskCard(this.tasksContainer, task);
    }
  }

  private async refresh(): Promise<void> {
    const [processes, tasks] = await Promise.all([
      this.automationService.listProcesses(),
      this.automationService.listScheduledTasks(),
    ]);
    this.renderProcesses(processes);
    this.renderTasks(tasks);
  }
}
