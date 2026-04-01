import type { Plugin } from "obsidian";
import type { SavedSession, ChatMessage } from "../types/chat";

const MAX_SESSIONS = 50;

export class SessionStore {
  private plugin: Plugin;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  async loadSessions(): Promise<SavedSession[]> {
    const data = await this.plugin.loadData();
    return data?.sessions ?? [];
  }

  async saveSessions(sessions: SavedSession[]): Promise<void> {
    const data = (await this.plugin.loadData()) ?? {};
    // Keep only the last MAX_SESSIONS sessions
    data.sessions = sessions.slice(-MAX_SESSIONS);
    await this.plugin.saveData(data);
  }

  async addSession(session: SavedSession): Promise<void> {
    const sessions = await this.loadSessions();
    // Replace existing session with same ID or append
    const idx = sessions.findIndex(s => s.sessionId === session.sessionId);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    await this.saveSessions(sessions);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.loadSessions();
    const filtered = sessions.filter(s => s.sessionId !== sessionId);
    await this.saveSessions(filtered);
  }

  /** Create a SavedSession from current chat state */
  static createSnapshot(
    sessionId: string,
    model: string,
    messages: ReadonlyArray<ChatMessage>,
  ): SavedSession {
    const userMessages = messages.filter(m => m.role === "user");
    const firstMessage = userMessages[0]?.content?.slice(0, 100) ?? "New session";

    // Strip heavy fields for storage
    const stripped = messages.map(msg => ({
      ...msg,
      toolCalls: undefined,
      segments: undefined,
      isStreaming: undefined,
    }));

    return {
      sessionId,
      firstMessage,
      model,
      timestamp: Date.now(),
      messageCount: messages.length,
      messages: stripped,
    };
  }
}
