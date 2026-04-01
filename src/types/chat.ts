export type ContentSegment =
  | { type: "text"; text: string }
  | { type: "tool"; tool: ToolCallInfo };

export interface Attachment {
  type: "selection" | "file" | "image";
  name: string;
  preview?: string;
  path?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCallInfo[];
  segments?: ContentSegment[];
  timestamp: number;
  isStreaming?: boolean;
  attachments?: Attachment[];
}

export interface ToolCallInfo {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
  isError?: boolean;
  duration?: number;
  startTime?: number;
}

export interface McpServer {
  name: string;
  status: string;
}

export interface SessionInfo {
  sessionId: string;
  model: string;
  mcpServers: McpServer[];
  cliVersion: string;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  contextWindow: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface SavedSession {
  sessionId: string;
  firstMessage: string;
  model: string;
  timestamp: number;
  messageCount: number;
  messages: ChatMessage[];
}
