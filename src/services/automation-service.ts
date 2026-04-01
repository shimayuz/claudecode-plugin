import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface AutomationProcess {
  pid: number;
  command: string;
  prompt: string;
  startTime: string;
  status: "running" | "completed" | "error";
  cwd: string;
}

export interface ScheduledTask {
  id: string;
  schedule: string;
  command: string;
  lastRun?: Date;
  nextRun?: Date;
  status: "active" | "paused" | "error";
}

export class AutomationService {
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  async listProcesses(): Promise<AutomationProcess[]> {
    try {
      const { stdout } = await execFileAsync("ps", ["aux"], { timeout: 5000 });
      const processes: AutomationProcess[] = [];

      for (const line of stdout.split("\n")) {
        // Match claude processes with -p flag
        if (line.includes("claude") && line.includes(" -p ")) {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 11) continue;

          const pid = parseInt(parts[1], 10);
          const startTime = parts[8] || "";
          const command = parts.slice(10).join(" ");

          // Extract prompt from -p argument
          const pMatch = command.match(/-p\s+["']?([^"'\n]+)["']?/);
          const prompt = pMatch ? pMatch[1].slice(0, 100) : command.slice(0, 100);

          processes.push({
            pid,
            command,
            prompt,
            startTime,
            status: "running",
            cwd: "",
          });
        }
      }

      return processes;
    } catch {
      return [];
    }
  }

  async listScheduledTasks(): Promise<ScheduledTask[]> {
    try {
      const { stdout } = await execFileAsync("crontab", ["-l"], { timeout: 5000 });
      const tasks: ScheduledTask[] = [];

      for (const line of stdout.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed) continue;
        if (!trimmed.includes("claude")) continue;

        // Parse cron: min hour dom month dow command
        const match = trimmed.match(/^(\S+\s+\S+\s+\S+\s+\S+\s+\S+)\s+(.+)$/);
        if (match) {
          tasks.push({
            id: crypto.randomUUID(),
            schedule: match[1],
            command: match[2],
            status: "active",
          });
        }
      }

      return tasks;
    } catch {
      return [];
    }
  }

  startPolling(
    interval: number,
    callback: (data: { processes: AutomationProcess[]; tasks: ScheduledTask[] }) => void,
  ): void {
    this.stopPolling();
    const poll = async () => {
      const [processes, tasks] = await Promise.all([
        this.listProcesses(),
        this.listScheduledTasks(),
      ]);
      callback({ processes, tasks });
    };
    void poll();
    this.pollTimer = setInterval(() => void poll(), interval);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
