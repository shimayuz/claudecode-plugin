import type { McpServer } from "./chat";

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result" | "thinking";
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string | Array<{ type: string; text?: string }>;
  is_error?: boolean;
}

export interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export interface SystemInitEvent {
  type: "system";
  subtype: "init";
  session_id: string;
  model: string;
  tools: string[];
  mcp_servers: McpServer[];
  claude_code_version: string;
}

export interface AssistantMessageEvent {
  type: "assistant";
  message: {
    id: string;
    model: string;
    role: "assistant";
    content: ContentBlock[];
    stop_reason: string | null;
    usage: UsageInfo;
  };
  session_id: string;
  parent_tool_use_id?: string | null;
}

export interface ResultEvent {
  type: "result";
  subtype: "success" | "error";
  is_error: boolean;
  duration_ms: number;
  result: string;
  total_cost_usd: number;
  session_id: string;
  usage: UsageInfo;
}

export interface RateLimitEvent {
  type: "rate_limit_event";
  rate_limit_info: {
    status: string;
    resetsAt: number;
  };
}

export interface StreamDeltaEvent {
  type: "stream_delta";
  text: string;
  parent_tool_use_id?: string | null;
}

export type ClaudeEvent =
  | SystemInitEvent
  | AssistantMessageEvent
  | ResultEvent
  | RateLimitEvent
  | StreamDeltaEvent
  | { type: string; [key: string]: unknown };
