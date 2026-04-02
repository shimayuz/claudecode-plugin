import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type ClaudeCodeDashboardPlugin from "../main";
import type { ModelChoice, PermissionMode } from "../types/settings";

export class DashboardSettingTab extends PluginSettingTab {
  plugin: ClaudeCodeDashboardPlugin;

  constructor(app: App, plugin: ClaudeCodeDashboardPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── General ──
    new Setting(containerEl).setName("Claude Code").setHeading();

    new Setting(containerEl)
      .setName("CLI path")
      .setDesc("Path to the Claude Code CLI executable")
      .addText((text) =>
        text.setPlaceholder("claude").setValue(this.plugin.settings.cliPath).onChange((value) => {
          this.plugin.settings.cliPath = value;
          void this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Working directory")
      .setDesc("Default working directory for Claude sessions (empty = vault root)")
      .addText((text) =>
        text.setPlaceholder("/path/to/project").setValue(this.plugin.settings.workingDirectory).onChange((value) => {
          this.plugin.settings.workingDirectory = value;
          void this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Default model")
      .addDropdown((d) =>
        d.addOptions({
          "opus[1m]": "Opus 1M (most capable, extended context)",
          opus: "Opus (most capable, 200K context)",
          sonnet: "Sonnet (balanced, 200K context)",
          haiku: "Haiku (fast, 200K context)",
        }).setValue(this.plugin.settings.defaultModel).onChange((v) => {
          this.plugin.settings.defaultModel = v as ModelChoice;
          void this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Permission mode")
      .setDesc("How Claude handles tool approvals")
      .addDropdown((d) =>
        d.addOptions({
          default: "Default (ask for everything)",
          acceptEdits: "Accept edits (auto-approve file changes)",
          bypassPermissions: "Bypass all (auto-approve everything)",
        }).setValue(this.plugin.settings.permissionMode).onChange((v) => {
          this.plugin.settings.permissionMode = v as PermissionMode;
          void this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Allow web requests")
      .setDesc("Auto-approve WebFetch, WebSearch, curl, python3")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.allowWebRequests).onChange((v) => {
          this.plugin.settings.allowWebRequests = v;
          void this.plugin.saveSettings();
        })
      );

    // ── UI ──
    new Setting(containerEl).setName("Interface").setHeading();

    new Setting(containerEl)
      .setName("Show tool calls")
      .setDesc("Display Read, Edit, Bash panels in chat")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showToolCalls).onChange((v) => {
          this.plugin.settings.showToolCalls = v;
          void this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Show cost info")
      .setDesc("Display token usage and cost in context bar")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showCostInfo).onChange((v) => {
          this.plugin.settings.showCostInfo = v;
          void this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Plan First default")
      .setDesc("Enable Plan First mode by default for new sessions")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.planFirstDefault).onChange((v) => {
          this.plugin.settings.planFirstDefault = v;
          void this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Thinking Mode default")
      .setDesc("Enable extended thinking by default")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.thinkingModeDefault).onChange((v) => {
          this.plugin.settings.thinkingModeDefault = v;
          void this.plugin.saveSettings();
        })
      );

    // ── Dashboards ──
    new Setting(containerEl).setName("Dashboards").setHeading();

    new Setting(containerEl)
      .setName("tmux poll interval (ms)")
      .setDesc("How often to check tmux sessions")
      .addText((t) =>
        t.setValue(String(this.plugin.settings.tmuxPollInterval)).onChange((v) => {
          const n = parseInt(v, 10);
          if (!isNaN(n) && n >= 1000) {
            this.plugin.settings.tmuxPollInterval = n;
            void this.plugin.saveSettings();
          }
        })
      );

    new Setting(containerEl)
      .setName("Automation poll interval (ms)")
      .setDesc("How often to check running automations")
      .addText((t) =>
        t.setValue(String(this.plugin.settings.automationPollInterval)).onChange((v) => {
          const n = parseInt(v, 10);
          if (!isNaN(n) && n >= 1000) {
            this.plugin.settings.automationPollInterval = n;
            void this.plugin.saveSettings();
          }
        })
      );

    // ── Skills ──
    new Setting(containerEl).setName("Slash Commands").setHeading();
    containerEl.createEl("p", {
      text: "Slash commands are automatically discovered from ~/.claude/commands/ and ~/.claude/skills/. Type / in the chat to see all available commands.",
      cls: "setting-item-description",
    });
  }
}
