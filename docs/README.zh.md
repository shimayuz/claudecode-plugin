<div align="center">

# Claude Code Dashboard

**将 Claude Code CLI 直接嵌入 Obsidian 侧边栏。**

无需离开 Vault，即可聊天、编码和自动化。

[English](../README.md) | [日本語](README.ja.md) | **中文** | [Français](README.fr.md)

[![GitHub stars](https://img.shields.io/github/stars/shimayuz/claudecode-plugin?style=social)](https://github.com/shimayuz/claudecode-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/shimayuz/claudecode-plugin)](https://github.com/shimayuz/claudecode-plugin/releases)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.4.0+-7C3AED)](https://obsidian.md)

![Claude Code Dashboard](screenshot.png)

</div>

---

## 为什么选择 Claude Code Dashboard？

如果你已经在使用 **Claude Code CLI**，你一定了解它的强大。但在终端和 Obsidian 之间切换会打断你的工作流。Claude Code Dashboard 将完整的 Claude Code 体验带入 Obsidian 侧边栏，从根本上解决了这个问题。

| 没有此插件 | 使用 Claude Code Dashboard |
|---|---|
| 在终端和 Obsidian 之间切换 | 在侧边栏直接与 Claude 聊天 |
| 手动复制文件路径 | 通过模糊搜索器附加 Vault 文件 |
| 在单独的终端中管理 tmux 会话 | 在专用仪表板中监控 tmux 会话 |
| 在外部跟踪自动化脚本 | 在一个界面中查看所有 `claude -p` 进程和 cron 任务 |
| 没有内联 diff 审查 | 使用 CodeMirror 6 diff 接受/拒绝代码更改 |

**零额外成本** — 使用你现有的 Claude Code CLI 订阅，无需 API 密钥。

---

## 功能

### 聊天

- **侧边栏中的完整 Claude Code** — 流式响应、Markdown 渲染和语法高亮代码块
- **模型选择器** — 在 Opus 1M、Opus、Sonnet 和 Haiku 之间选择，可配置努力级别（Low / Med / High / Max）
- **Plan First 模式** — 切换规划模式，让 Claude 在执行前先概述方案
- **Thinking 模式** — 启用扩展思考以进行更深入的推理
- **斜杠命令** — 自动发现 `~/.claude/commands/` 和 `~/.claude/skills/` 中的所有命令（277+ 个命令）
- **文件附加** — 通过模糊搜索器、`@提及` 或直接粘贴/拖放图片附加 Vault 文件
- **权限控制** — Default、Accept Edits 或 Bypass All 模式管理工具审批
- **会话历史** — 持久化会话存储，支持完整对话回放
- **日语 IME 支持** — Enter 确认输入法组合，不会发送消息

### 仪表板

- **tmux 仪表板** — 监控活跃的 tmux 会话，识别正在运行 Claude 进程的会话
- **自动化仪表板** — 一目了然地跟踪 `claude -p` 进程和 cron 定时任务

### 编辑器集成

- **内联 diff** — 基于 CodeMirror 6 的 diff 视图，每个代码更改都有接受/拒绝控件
- **工具调用显示** — 在聊天中直接查看 Read、Edit 和 Bash 工具调用

### 设计

- **Claude Desktop 主题** — `#2B2520` 背景色和 `#D97757` 赤陶色调的暖色深色主题，灵感来自 Claude Desktop
- **BRAT 兼容** — 通过 BRAT 插件一键安装和更新

---

## 快速安装

### 通过 BRAT（推荐）

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 社区插件
2. 打开 BRAT 设置，选择 **Add Beta Plugin**
3. 输入仓库 URL：
   ```
   shimayuz/claudecode-plugin
   ```
4. 点击 **Add Plugin**，在社区插件中启用 **Claude Code Dashboard**

### 手动安装

1. 从[最新发布](https://github.com/shimayuz/claudecode-plugin/releases)下载 `main.js`、`manifest.json` 和 `styles.css`
2. 创建文件夹 `<你的Vault>/.obsidian/plugins/claudecode-dashboard/`
3. 将下载的文件复制到该文件夹
4. 重启 Obsidian，在设置 > 社区插件中启用 **Claude Code Dashboard**

---

## 前置条件

- **Obsidian** 1.4.0 或更高版本（仅桌面版）
- **Claude Code CLI** 已安装并完成认证 — [安装指南](https://docs.anthropic.com/en/docs/claude-code/overview)
- 有效的 **Claude Code 订阅**（Max、Pro 或 Team 计划）

验证 CLI 是否正常工作：

```bash
claude --version
```

---

## 使用方法

1. 从左侧边栏的功能区图标打开 **Claude Code Dashboard** 视图
2. 在聊天输入框中输入消息，按 **Shift+Enter** 发送（**Enter** 为换行）
3. 使用 `/` 浏览斜杠命令，`@` 提及 Vault 文件，或使用附件按钮选择文件
4. 从聊天标题栏切换 **Plan First** 或 **Thinking** 模式
5. 通过模型选择器下拉菜单切换模型
6. 打开 **tmux** 或 **Automation** 标签页监控后台进程

---

## 配置

打开 **设置 > Claude Code Dashboard** 进行自定义：

| 设置项 | 描述 | 默认值 |
|---|---|---|
| CLI 路径 | `claude` 可执行文件的路径 | `claude` |
| 工作目录 | 会话的默认工作目录 | Vault 根目录 |
| 默认模型 | Opus 1M / Opus / Sonnet / Haiku | Sonnet |
| 权限模式 | Default / Accept Edits / Bypass All | Accept Edits |
| 允许 Web 请求 | 自动批准 WebFetch、WebSearch、curl、python3 | 关闭 |
| 显示工具调用 | 在聊天中显示 Read、Edit、Bash 面板 | 开启 |
| 显示成本信息 | 在上下文栏中显示 token 用量和成本 | 开启 |
| Plan First 默认 | 新会话默认启用 Plan First 模式 | 关闭 |
| Thinking 模式默认 | 默认启用扩展思考 | 开启 |
| tmux 轮询间隔 | 检查 tmux 会话的频率（毫秒） | 5000 |
| 自动化轮询间隔 | 检查运行中自动化任务的频率（毫秒） | 10000 |

---

## 贡献

欢迎 Star、Fork、提交 Issue 和 Pull Request！

1. Fork 此仓库
2. 创建功能分支：`git checkout -b feat/my-feature`
3. 提交更改：`git commit -m "feat: add my feature"`
4. 推送到你的 Fork：`git push origin feat/my-feature`
5. 创建 Pull Request

---

## 如果你觉得这个插件有用，请为仓库点个 Star — 这能帮助更多人发现这个项目！

---

## 许可证

[MIT](../LICENSE)

---

## 链接

- **仓库**: [github.com/shimayuz/claudecode-plugin](https://github.com/shimayuz/claudecode-plugin)
- **Issues**: [github.com/shimayuz/claudecode-plugin/issues](https://github.com/shimayuz/claudecode-plugin/issues)
- **Claude Code CLI**: [docs.anthropic.com/en/docs/claude-code/overview](https://docs.anthropic.com/en/docs/claude-code/overview)
- **Obsidian**: [obsidian.md](https://obsidian.md)
- **BRAT**: [github.com/TfTHacker/obsidian42-brat](https://github.com/TfTHacker/obsidian42-brat)
