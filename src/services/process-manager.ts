import { spawn, execFileSync } from "child_process";
import { join } from "path";
import { existsSync } from "fs";
import { homedir, userInfo } from "os";
import type { PluginSettings, ModelChoice, EffortLevel } from "../types/settings";
import type { ClaudeEvent, SystemInitEvent, AssistantMessageEvent, ResultEvent, RateLimitEvent, StreamDeltaEvent } from "../types/events";

import { query as sdkQuery } from "@anthropic-ai/claude-agent-sdk";
import type {
  SDKMessage, SDKUserMessage, SDKAssistantMessage, SDKSystemMessage,
  SDKResultSuccess, SDKResultError, SDKRateLimitEvent, SDKCompactBoundaryMessage,
  Query, Options, SpawnOptions, SpawnedProcess,
} from "@anthropic-ai/claude-agent-sdk";

export type ProcessState = "idle" | "running" | "error";

class UserMessageChannel implements AsyncIterable<SDKUserMessage> {
  private queue: SDKUserMessage[] = [];
  private waiting: ((result: IteratorResult<SDKUserMessage>) => void) | null = null;
  private closed = false;

  enqueue(msg: SDKUserMessage): void {
    if (this.waiting) {
      this.waiting({ value: msg, done: false });
      this.waiting = null;
    } else {
      this.queue.push(msg);
    }
  }

  close(): void {
    this.closed = true;
    if (this.waiting) {
      this.waiting({ value: undefined as unknown as SDKUserMessage, done: true });
      this.waiting = null;
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<SDKUserMessage> {
    return {
      next: (): Promise<IteratorResult<SDKUserMessage>> => {
        if (this.queue.length > 0) {
          return Promise.resolve({ value: this.queue.shift()!, done: false });
        }
        if (this.closed) {
          return Promise.resolve({ value: undefined as unknown as SDKUserMessage, done: true });
        }
        return new Promise((resolve) => { this.waiting = resolve; });
      },
    };
  }
}

function getEnhancedPath(): string {
  const home = homedir();
  const extraPaths = [
    "/usr/local/bin", "/opt/homebrew/bin",
    join(home, ".local", "bin"),
    join(home, ".nvm", "versions", "node", "current", "bin"),
    "/usr/bin",
  ];
  try {
    const nvmDir = process.env.NVM_DIR || join(home, ".nvm");
    const currentNode = execFileSync("node", ["--version"], {
      env: { ...process.env, PATH: [process.env.PATH, ...extraPaths].filter(Boolean).join(":") },
      timeout: 3000,
    }).toString().trim();
    if (currentNode) {
      const nvmBin = join(nvmDir, "versions", "node", currentNode, "bin");
      if (existsSync(nvmBin)) extraPaths.push(nvmBin);
    }
  } catch { /* ignore */ }
  return [process.env.PATH, ...extraPaths].filter(Boolean).join(":");
}

function findClaudeCLIPath(settingsPath?: string): string | null {
  if (settingsPath && existsSync(settingsPath)) return settingsPath;
  const home = homedir();
  const enhancedPath = getEnhancedPath();
  try {
    const claudePath = execFileSync("which", ["claude"], {
      env: { ...process.env, PATH: enhancedPath }, timeout: 3000,
    }).toString().trim();
    if (claudePath && existsSync(claudePath)) return claudePath;
  } catch { /* not found */ }
  const candidates = [
    join(home, ".claude", "local", "claude"),
    join(home, ".local", "bin", "claude"),
    "/usr/local/bin/claude", "/opt/homebrew/bin/claude",
  ];
  try {
    const npmRoot = execFileSync("npm", ["root", "-g"], {
      env: { ...process.env, PATH: enhancedPath }, timeout: 5000,
    }).toString().trim();
    if (npmRoot) candidates.push(join(npmRoot, "@anthropic-ai", "claude-code", "cli.js"));
  } catch { /* ignore */ }
  for (const p of candidates) { if (existsSync(p)) return p; }
  return null;
}

function findNodeExecutable(): string {
  try {
    const nodePath = execFileSync("which", ["node"], {
      env: { ...process.env, PATH: getEnhancedPath() }, timeout: 3000,
    }).toString().trim();
    if (nodePath) return nodePath;
  } catch { /* ignore */ }
  return "node";
}

export class ProcessManager {
  private activeQuery: Query | null = null;
  private channel: UserMessageChannel | null = null;
  private abortController: AbortController | null = null;
  private _state: ProcessState = "idle";
  private settings: PluginSettings;
  private _sessionId: string | null = null;
  private cwd = "";
  private _aborted = false;
  private cliPath: string | null = null;

  model: ModelChoice = "sonnet";
  effort: EffortLevel = "high";
  planFirst = false;
  thinkingMode = true;

  onEvent: ((event: ClaudeEvent) => void) | null = null;
  onStateChange: ((state: ProcessState) => void) | null = null;
  onComplete: (() => void) | null = null;
  onStderr: ((data: string) => void) | null = null;
  onPermissionRequest: ((info: {
    toolName: string; input: Record<string, unknown>;
    title?: string; displayName?: string; description?: string;
  }) => Promise<"allow" | "deny" | "always">) | null = null;

  constructor(settings: PluginSettings) { this.settings = settings; }

  get state(): ProcessState { return this._state; }
  get isRunning(): boolean { return this._state === "running"; }
  get sessionId(): string | null { return this._sessionId; }
  get query(): Query | null { return this.activeQuery; }

  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
    this.cliPath = null;
  }

  private buildEnv(): Record<string, string | undefined> {
    const env: Record<string, string | undefined> = { ...process.env };
    env.HOME = env.HOME || homedir();
    env.USER = env.USER || userInfo().username;
    env.PATH = getEnhancedPath();
    return env;
  }

  private createCustomSpawn(): (options: SpawnOptions) => SpawnedProcess {
    return (options: SpawnOptions): SpawnedProcess => {
      let { command } = options;
      let spawnArgs = [...options.args];
      const { cwd, env, signal } = options;
      if (command === "node") {
        if (spawnArgs.length > 0 && !spawnArgs[0].endsWith(".js") && !spawnArgs[0].endsWith(".mjs")) {
          command = spawnArgs[0];
          spawnArgs = spawnArgs.slice(1);
        } else {
          command = findNodeExecutable();
        }
      }
      const child = spawn(command, spawnArgs, {
        cwd, env: env as NodeJS.ProcessEnv,
        stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
      });
      if (signal) {
        if (signal.aborted) { child.kill(); }
        else { signal.addEventListener("abort", () => child.kill(), { once: true }); }
      }
      if (child.stderr) {
        child.stderr.on("data", (data: Buffer) => { this.onStderr?.(data.toString("utf-8")); });
      }
      if (!child.stdin || !child.stdout) throw new Error("Failed to create process streams");
      return child as unknown as SpawnedProcess;
    };
  }

  private getCliPath(): string | null {
    if (!this.cliPath) this.cliPath = findClaudeCLIPath(this.settings.cliPath);
    return this.cliPath;
  }

  private buildOptions(): Options {
    const model = this.model || this.settings.defaultModel || "sonnet";
    const permMode = this.settings.permissionMode || "acceptEdits";
    const cliPath = this.getCliPath();
    this.abortController = new AbortController();

    const options: Options = {
      abortController: this.abortController,
      cwd: this.cwd && existsSync(this.cwd) ? this.cwd : undefined,
      env: this.buildEnv(),
      model,
      effort: this.effort || "high",
      permissionMode: permMode,
      pathToClaudeCodeExecutable: cliPath || undefined,
      settingSources: ["user", "project"],
      includePartialMessages: true,
      enableFileCheckpointing: true,
      thinking: this.thinkingMode ? { type: "adaptive" } : { type: "disabled" },
      stderr: (data: string) => { this.onStderr?.(data); },
      canUseTool: this.onPermissionRequest ? async (toolName, input, opts) => {
        // MCP tools still go through permission prompt (no silent bypass)
        const signal = opts.signal;
        try {
          const result = await new Promise<"allow" | "deny" | "always">((resolve, reject) => {
            if (signal?.aborted) { reject(new Error("Aborted")); return; }
            const onAbort = () => reject(new Error("Aborted"));
            signal?.addEventListener("abort", onAbort, { once: true });
            this.onPermissionRequest!({ toolName, input, title: opts.title, displayName: opts.displayName, description: opts.description })
              .then(resolve, reject).finally(() => { signal?.removeEventListener("abort", onAbort); });
          });
          if (result === "allow" || result === "always") {
            return { behavior: "allow" as const, updatedInput: input, updatedPermissions: result === "always" ? opts.suggestions : undefined };
          }
          return { behavior: "deny" as const, message: "User denied" };
        } catch { return { behavior: "deny" as const, message: "Aborted" }; }
      } : undefined,
    };

    const allowed = [
      "Read", "Write", "Edit", "Glob", "Grep", "Agent",
      "Bash(cat*)", "Bash(ls*)", "Bash(head*)", "Bash(tail*)", "Bash(wc*)",
      "Bash(find*)", "Bash(grep*)", "Bash(echo*)", "Bash(mkdir*)", "Bash(cd*)",
    ];
    if (this.settings.allowWebRequests) {
      allowed.push("WebFetch", "WebSearch", "Bash(curl*)", "Bash(python3*)", "Bash(open *)");
    }
    options.allowedTools = allowed;
    if (this._sessionId) options.resume = this._sessionId;
    return options;
  }

  private startQuery(): boolean {
    this.stopQuery();
    const cliPath = this.getCliPath();
    if (!cliPath) {
      this.onStderr?.("Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code");
      this.setState("error");
      this.onComplete?.();
      return false;
    }
    try {
      this.channel = new UserMessageChannel();
      const options = this.buildOptions();
      this.activeQuery = sdkQuery({ prompt: this.channel, options });
      void this.consumeEvents();
      return true;
    } catch (err) {
      console.error("[claudecode-dashboard] SDK query start error:", err instanceof Error ? err.message : String(err));
      this.setState("error");
      this.onComplete?.();
      return false;
    }
  }

  private async consumeEvents(): Promise<void> {
    if (!this.activeQuery) return;
    try {
      for await (const message of this.activeQuery) {
        if (this._aborted) break;
        try {
          this.handleSDKMessage(message);
        } catch (renderErr) {
          // Don't let render errors kill the event loop
          this.onStderr?.(`[render error] ${renderErr instanceof Error ? renderErr.message : String(renderErr)}`);
        }
      }
    } catch (err: unknown) {
      if (!this._aborted) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.onStderr?.(`[SDK error] ${errMsg}`);
        this.setState("error");
        this.onComplete?.();
      }
    }
  }

  private handleSDKMessage(msg: SDKMessage): void {
    switch (msg.type) {
      case "system": {
        const sysMsg = msg as SDKSystemMessage | SDKCompactBoundaryMessage;
        if ("subtype" in sysMsg && sysMsg.subtype === "init") {
          const initMsg = sysMsg as SDKSystemMessage;
          this._sessionId = initMsg.session_id;
          this.onEvent?.({
            type: "system", subtype: "init", session_id: initMsg.session_id,
            model: initMsg.model, tools: initMsg.tools || [],
            mcp_servers: initMsg.mcp_servers || [], claude_code_version: initMsg.claude_code_version || "",
          } as SystemInitEvent);
        }
        if ("subtype" in sysMsg && sysMsg.subtype === "compact_boundary") {
          this.onEvent?.({ type: "system", subtype: "compact_boundary" } as ClaudeEvent);
        }
        break;
      }
      case "assistant": {
        const aMsg = msg as SDKAssistantMessage;
        this.onEvent?.({
          type: "assistant", message: {
            id: aMsg.message?.id || "", model: aMsg.message?.model || "", role: "assistant",
            content: (aMsg.message?.content as AssistantMessageEvent["message"]["content"]) || [],
            stop_reason: aMsg.message?.stop_reason || null,
            usage: { input_tokens: aMsg.message?.usage?.input_tokens || 0, output_tokens: aMsg.message?.usage?.output_tokens || 0,
              cache_read_input_tokens: aMsg.message?.usage?.cache_read_input_tokens || 0, cache_creation_input_tokens: aMsg.message?.usage?.cache_creation_input_tokens || 0 },
          }, session_id: aMsg.session_id, parent_tool_use_id: aMsg.parent_tool_use_id,
        } as AssistantMessageEvent);
        break;
      }
      case "result": {
        const rMsg = msg as SDKResultSuccess | SDKResultError;
        this._sessionId = rMsg.session_id;
        const event: ResultEvent = {
          type: "result", subtype: rMsg.subtype === "success" ? "success" : "error",
          is_error: rMsg.is_error, duration_ms: rMsg.duration_ms,
          result: "result" in rMsg ? (rMsg as SDKResultSuccess).result : "",
          total_cost_usd: rMsg.total_cost_usd, session_id: rMsg.session_id,
          usage: { input_tokens: rMsg.usage?.input_tokens || 0, output_tokens: rMsg.usage?.output_tokens || 0,
            cache_read_input_tokens: rMsg.usage?.cache_read_input_tokens || 0, cache_creation_input_tokens: rMsg.usage?.cache_creation_input_tokens || 0 },
        };
        if (rMsg.modelUsage) (event as unknown as Record<string, unknown>).modelUsage = rMsg.modelUsage;
        this.onEvent?.(event);
        this.setState("idle");
        this.onComplete?.();
        break;
      }
      case "rate_limit_event": {
        const rlMsg = msg as SDKRateLimitEvent;
        this.onEvent?.({ type: "rate_limit_event", rate_limit_info: { status: rlMsg.rate_limit_info?.status || "allowed", resetsAt: rlMsg.rate_limit_info?.resetsAt || 0 } } as RateLimitEvent);
        break;
      }
      case "stream_event": {
        const streamMsg = msg as unknown as { type: "stream_event"; event: Record<string, unknown>; parent_tool_use_id: string | null };
        if (streamMsg.parent_tool_use_id) break;
        const ev = streamMsg.event;
        if (ev?.type === "content_block_delta") {
          const delta = ev.delta as Record<string, unknown> | undefined;
          if (delta?.type === "text_delta" && typeof delta.text === "string") {
            this.onEvent?.({ type: "stream_delta", text: delta.text, parent_tool_use_id: streamMsg.parent_tool_use_id } as StreamDeltaEvent);
          }
        }
        break;
      }
    }
  }

  warmUp(workingDirectory?: string): void {
    if (this.activeQuery) return;
    if (workingDirectory) this.cwd = workingDirectory;
    this.startQuery();
    if (this._state === "running") this.setState("idle");
  }

  send(message: string, workingDirectory?: string): void {
    if (workingDirectory) this.cwd = workingDirectory;
    this._aborted = false;
    this.setState("running");
    const userMsg: SDKUserMessage = {
      type: "user", message: { role: "user", content: message },
      parent_tool_use_id: null, session_id: this._sessionId || "",
    };
    if (!this.activeQuery) {
      if (this.startQuery()) this.channel?.enqueue(userMsg);
    } else {
      this.channel?.enqueue(userMsg);
    }
  }

  abort(): void {
    this._aborted = true;
    if (this.activeQuery) this.activeQuery.interrupt().catch(() => {});
    this.abortController?.abort();
    this.channel?.close();
    this.channel = null;
    this.abortController = null;
    this.activeQuery = null;
    this.setState("idle");
    this.onComplete?.();
  }

  newSession(): void { this.stopQuery(); this._sessionId = null; }

  setSessionId(id: string): void { this.stopQuery(); this._sessionId = id; }

  async setModelRuntime(model: ModelChoice): Promise<void> {
    this.model = model;
    if (this.activeQuery) {
      try { await this.activeQuery.setModel(model); } catch { /* next query uses new model */ }
    }
  }

  private stopQuery(): void {
    this._aborted = true;
    this.channel?.close();
    this.channel = null;
    this.abortController?.abort();
    this.abortController = null;
    this.activeQuery = null;
    this._aborted = false;
    this.setState("idle");
  }

  private setState(state: ProcessState): void {
    if (this._state !== state) { this._state = state; this.onStateChange?.(state); }
  }

  destroy(): void { this.stopQuery(); }
}
