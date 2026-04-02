import type { SavedSession } from "./chat";

export type ModelChoice = "opus" | "opus[1m]" | "sonnet" | "haiku";
export type EffortLevel = "low" | "medium" | "high" | "max";
export type PermissionMode = "default" | "acceptEdits" | "bypassPermissions";

export interface PluginSettings {
  cliPath: string;
  workingDirectory: string;
  defaultModel: ModelChoice;
  permissionMode: PermissionMode;
  allowWebRequests: boolean;
  maxScrollback: number;
  showToolCalls: boolean;
  showCostInfo: boolean;
  sessions: SavedSession[];
  planFirstDefault: boolean;
  thinkingModeDefault: boolean;
  tmuxPollInterval: number;
  automationPollInterval: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  cliPath: "claude",
  workingDirectory: "",
  defaultModel: "sonnet",
  permissionMode: "acceptEdits",
  allowWebRequests: false,
  maxScrollback: 200,
  showToolCalls: true,
  showCostInfo: true,
  sessions: [],
  planFirstDefault: false,
  thinkingModeDefault: true,
  tmuxPollInterval: 5000,
  automationPollInterval: 10000,
};

export const MODEL_LABELS: Record<ModelChoice, string> = {
  "opus[1m]": "Opus 1M",
  opus: "Opus",
  sonnet: "Sonnet",
  haiku: "Haiku",
};

export const EFFORT_LABELS: Record<EffortLevel, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
  max: "Max",
};
