<div align="center">

# Claude Code Dashboard

**Embed Claude Code CLI directly into Obsidian's sidebar.**

Chat, code, and automate — without leaving your vault.

**English** | [日本語](docs/README.ja.md) | [中文](docs/README.zh.md) | [Français](docs/README.fr.md)

[![GitHub stars](https://img.shields.io/github/stars/shimayuz/claudecode-plugin?style=social)](https://github.com/shimayuz/claudecode-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/shimayuz/claudecode-plugin)](https://github.com/shimayuz/claudecode-plugin/releases)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.4.0+-7C3AED)](https://obsidian.md)

![Claude Code Dashboard](docs/screenshot.png)

</div>

---

## Why Claude Code Dashboard?

If you already use **Claude Code CLI**, you know how powerful it is. But switching between your terminal and Obsidian breaks your flow. Claude Code Dashboard solves this by bringing the full Claude Code experience into Obsidian's sidebar.

| Without this plugin | With Claude Code Dashboard |
|---|---|
| Switch between terminal and Obsidian | Chat with Claude right in the sidebar |
| Manually copy file paths | Attach vault files with a fuzzy picker |
| Manage tmux sessions in a separate terminal | Monitor tmux sessions in a dedicated dashboard |
| Track automation scripts externally | View all `claude -p` processes and cron tasks in one place |
| No inline diff review | Accept/reject code changes with CodeMirror 6 diffs |

**Zero extra cost** — uses your existing Claude Code CLI subscription. No API key needed.

---

## Features

### Chat

- **Full Claude Code in your sidebar** — Streaming responses, markdown rendering, and syntax-highlighted code blocks
- **Model selector** — Choose between Opus 1M, Opus, Sonnet, and Haiku with configurable effort levels (Low / Med / High / Max)
- **Plan First mode** — Toggle planning mode so Claude outlines its approach before executing
- **Thinking Mode** — Enable extended thinking for deeper reasoning
- **Slash commands** — Auto-discovers all commands from `~/.claude/commands/` and `~/.claude/skills/` (277+ commands)
- **File attachment** — Attach vault files via fuzzy picker, `@mentions`, or paste/drop images directly
- **Permission controls** — Default, Accept Edits, or Bypass All modes for tool approvals
- **Session history** — Persistent session storage with full conversation replay
- **Japanese IME support** — Enter confirms input composition without sending the message

### Dashboards

- **tmux dashboard** — Monitor active tmux sessions and identify which ones are running Claude processes
- **Automation dashboard** — Track `claude -p` processes and cron-scheduled tasks at a glance

### Editor Integration

- **Inline diff** — CodeMirror 6 powered diff view with accept/reject controls for every code change
- **Tool call display** — See Read, Edit, and Bash tool invocations directly in the chat

### Design

- **Claude Desktop theme** — Warm dark theme with `#2B2520` background and `#D97757` terracotta accent, inspired by Claude Desktop
- **BRAT compatible** — Install and update with a single click via the BRAT plugin

---

## Quick Install

### Via BRAT (Recommended)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin
2. Open BRAT settings and select **Add Beta Plugin**
3. Enter the repository URL:
   ```
   shimayuz/claudecode-plugin
   ```
4. Click **Add Plugin** and enable **Claude Code Dashboard** in Community Plugins

### Manual Install

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/shimayuz/claudecode-plugin/releases)
2. Create a folder at `<your-vault>/.obsidian/plugins/claudecode-dashboard/`
3. Copy the downloaded files into that folder
4. Restart Obsidian and enable **Claude Code Dashboard** in Settings > Community Plugins

---

## Prerequisites

- **Obsidian** 1.4.0 or later (desktop only)
- **Claude Code CLI** installed and authenticated — [installation guide](https://docs.anthropic.com/en/docs/claude-code/overview)
- An active **Claude Code subscription** (Max, Pro, or Team plan)

Verify your CLI is working:

```bash
claude --version
```

---

## Usage

1. Open the **Claude Code Dashboard** view from the left sidebar ribbon icon
2. Type your message in the chat input and press **Shift+Enter** to send (or **Enter** to add a new line)
3. Use `/` to browse slash commands, `@` to mention vault files, or the attachment button to pick files
4. Toggle **Plan First** or **Thinking** mode from the chat header toolbar
5. Switch models with the model selector dropdown
6. Open the **tmux** or **Automation** tabs to monitor background processes

---

## Configuration

Open **Settings > Claude Code Dashboard** to customize:

| Setting | Description | Default |
|---|---|---|
| CLI path | Path to the `claude` executable | `claude` |
| Working directory | Default working directory for sessions | Vault root |
| Default model | Opus 1M / Opus / Sonnet / Haiku | Sonnet |
| Permission mode | Default / Accept Edits / Bypass All | Accept Edits |
| Allow web requests | Auto-approve WebFetch, WebSearch, curl, python3 | Off |
| Show tool calls | Display Read, Edit, Bash panels in chat | On |
| Show cost info | Display token usage and cost in context bar | On |
| Plan First default | Enable Plan First mode for new sessions | Off |
| Thinking Mode default | Enable extended thinking by default | On |
| tmux poll interval | How often to check tmux sessions (ms) | 5000 |
| Automation poll interval | How often to check running automations (ms) | 10000 |

---

## Contributing

Stars, forks, issues, and PRs are all welcome!

1. Fork this repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and commit: `git commit -m "feat: add my feature"`
4. Push to your fork: `git push origin feat/my-feature`
5. Open a Pull Request

---

## If you find this useful, please star this repo — it helps others discover the project!

---

## License

[MIT](LICENSE)

---

## Links

- **Repository**: [github.com/shimayuz/claudecode-plugin](https://github.com/shimayuz/claudecode-plugin)
- **Issues**: [github.com/shimayuz/claudecode-plugin/issues](https://github.com/shimayuz/claudecode-plugin/issues)
- **Claude Code CLI**: [docs.anthropic.com/en/docs/claude-code/overview](https://docs.anthropic.com/en/docs/claude-code/overview)
- **Obsidian**: [obsidian.md](https://obsidian.md)
- **BRAT**: [github.com/TfTHacker/obsidian42-brat](https://github.com/TfTHacker/obsidian42-brat)
