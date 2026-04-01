import { readdirSync, readFileSync, statSync } from "fs";
import { join, basename, extname } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

export interface DiscoveredCommand {
  name: string;
  description: string;
  source: "commands" | "skills" | "sdk";
  filePath?: string;
}

const COMMANDS_DIR = join(homedir(), ".claude", "commands");
const SKILLS_DIR = join(homedir(), ".claude", "skills");

/**
 * Scan ~/.claude/commands/ and ~/.claude/skills/ to discover
 * all available slash commands on this system.
 */
export function scanLocalCommands(): DiscoveredCommand[] {
  const results: DiscoveredCommand[] = [];
  const seen = new Set<string>();

  // 1. Scan ~/.claude/commands/ (flat .md files = slash commands)
  if (existsSync(COMMANDS_DIR)) {
    scanDirectory(COMMANDS_DIR, "commands", results, seen, false);
  }

  // 2. Scan ~/.claude/skills/ (directories with index.md or flat .md)
  if (existsSync(SKILLS_DIR)) {
    scanSkillsDirectory(SKILLS_DIR, results, seen);
  }

  return results;
}

function scanDirectory(
  dir: string,
  source: "commands" | "skills",
  results: DiscoveredCommand[],
  seen: Set<string>,
  recurse: boolean,
): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    try {
      const stat = statSync(fullPath);

      if (stat.isFile() && entry.endsWith(".md")) {
        const name = basename(entry, ".md");
        if (seen.has(name)) continue;
        seen.add(name);

        const description = extractDescription(fullPath);
        results.push({ name, description, source, filePath: fullPath });
      } else if (stat.isDirectory() && recurse) {
        scanDirectory(fullPath, source, results, seen, false);
      }
    } catch {
      continue;
    }
  }
}

function scanSkillsDirectory(
  dir: string,
  results: DiscoveredCommand[],
  seen: Set<string>,
): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skill directory - look for index.md or .md with same name
        const indexPath = join(fullPath, "index.md");
        const namedPath = join(fullPath, `${entry}.md`);

        let descFile: string | null = null;
        if (existsSync(indexPath)) descFile = indexPath;
        else if (existsSync(namedPath)) descFile = namedPath;

        if (!seen.has(entry)) {
          seen.add(entry);
          const description = descFile ? extractDescription(descFile) : `Skill: ${entry}`;
          results.push({ name: entry, description, source: "skills", filePath: descFile ?? fullPath });
        }

        // Also scan .md files inside the skill directory
        scanDirectory(fullPath, "skills", results, seen, false);
      } else if (stat.isFile() && entry.endsWith(".md")) {
        const name = basename(entry, ".md");
        if (seen.has(name)) continue;
        seen.add(name);
        const description = extractDescription(fullPath);
        results.push({ name, description, source: "skills", filePath: fullPath });
      }
    } catch {
      continue;
    }
  }
}

/**
 * Extract first meaningful line from a .md file as description.
 * Looks for YAML frontmatter `description:` field first,
 * then falls back to first non-empty, non-heading line.
 */
function extractDescription(filePath: string): string {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // Check YAML frontmatter
    if (lines[0]?.trim() === "---") {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "---") break;
        const match = lines[i].match(/^description:\s*(.+)/);
        if (match) return match[1].trim().slice(0, 120);
      }
    }

    // Fallback: first non-heading, non-empty line
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("---")) continue;
      if (trimmed.startsWith("<!--")) continue;
      if (trimmed.startsWith("name:") || trimmed.startsWith("description:")) continue;
      return trimmed.slice(0, 120);
    }

    return basename(filePath, ".md");
  } catch {
    return basename(filePath, ".md");
  }
}
