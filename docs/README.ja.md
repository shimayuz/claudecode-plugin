<div align="center">

# Claude Code Dashboard

**Claude Code CLIをObsidianのサイドバーに直接埋め込む。**

Vaultを離れることなく、チャット・コーディング・自動化を。

[English](../README.md) | **日本語** | [中文](README.zh.md) | [Français](README.fr.md)

[![GitHub stars](https://img.shields.io/github/stars/shimayuz/claudecode-plugin?style=social)](https://github.com/shimayuz/claudecode-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/shimayuz/claudecode-plugin)](https://github.com/shimayuz/claudecode-plugin/releases)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.4.0+-7C3AED)](https://obsidian.md)

![Claude Code Dashboard](screenshot.png)

</div>

---

## なぜ Claude Code Dashboard なのか？

**Claude Code CLI** を既にお使いなら、その強力さはご存知でしょう。しかし、ターミナルとObsidianを行き来するのは集中力を妨げます。Claude Code Dashboardは、Claude Codeの体験をすべてObsidianのサイドバーに統合することで、この問題を解決します。

| プラグインなし | Claude Code Dashboardあり |
|---|---|
| ターミナルとObsidianを切り替え | サイドバーで直接Claudeとチャット |
| ファイルパスを手動でコピー | ファジーピッカーでVaultファイルを添付 |
| tmuxセッションを別ターミナルで管理 | 専用ダッシュボードでtmuxセッションを監視 |
| 自動化スクリプトを外部で追跡 | `claude -p` プロセスとcronタスクを一元管理 |
| インラインdiffレビューなし | CodeMirror 6 diffでコード変更を承認/却下 |

**追加コストゼロ** — 既存のClaude Code CLIサブスクリプションをそのまま使用。APIキーは不要です。

---

## 機能

### チャット

- **サイドバーでフルClaude Code** — ストリーミングレスポンス、Markdownレンダリング、シンタックスハイライト付きコードブロック
- **モデル選択** — Opus 1M、Opus、Sonnet、Haikuから選択。エフォートレベル（Low / Med / High / Max）も設定可能
- **Plan Firstモード** — 実行前にClaudeがアプローチを概説するプランニングモード
- **Thinkingモード** — 深い推論のための拡張思考を有効化
- **スラッシュコマンド** — `~/.claude/commands/` と `~/.claude/skills/` から全コマンドを自動検出（277以上のコマンド）
- **ファイル添付** — ファジーピッカー、`@メンション`、画像のペースト/ドロップでVaultファイルを添付
- **権限制御** — Default、Accept Edits、Bypass Allモードでツール承認を管理
- **セッション履歴** — 完全な会話リプレイ付きの永続的セッションストレージ
- **日本語IME対応** — Enterで入力確定、メッセージは送信されません

### ダッシュボード

- **tmuxダッシュボード** — アクティブなtmuxセッションを監視し、Claudeプロセスが実行中のセッションを特定
- **自動化ダッシュボード** — `claude -p` プロセスとcronスケジュールタスクを一覧表示

### エディタ連携

- **インラインdiff** — CodeMirror 6によるdiffビューで、すべてのコード変更に承認/却下コントロール付き
- **ツールコール表示** — Read、Edit、Bashのツール呼び出しをチャット内に直接表示

### デザイン

- **Claude Desktopテーマ** — `#2B2520` 背景と `#D97757` テラコッタアクセントのウォームダークテーマ。Claude Desktopにインスパイアされたデザイン
- **BRAT互換** — BRATプラグインでワンクリックインストール・アップデート

---

## クイックインストール

### BRAT経由（推奨）

1. [BRAT](https://github.com/TfTHacker/obsidian42-brat) コミュニティプラグインをインストール
2. BRAT設定を開き、**Add Beta Plugin** を選択
3. リポジトリURLを入力：
   ```
   shimayuz/claudecode-plugin
   ```
4. **Add Plugin** をクリックし、コミュニティプラグインで **Claude Code Dashboard** を有効化

### 手動インストール

1. [最新リリース](https://github.com/shimayuz/claudecode-plugin/releases)から `main.js`、`manifest.json`、`styles.css` をダウンロード
2. `<あなたのVault>/.obsidian/plugins/claudecode-dashboard/` フォルダを作成
3. ダウンロードしたファイルをそのフォルダにコピー
4. Obsidianを再起動し、設定 > コミュニティプラグインで **Claude Code Dashboard** を有効化

---

## 前提条件

- **Obsidian** 1.4.0以降（デスクトップ版のみ）
- **Claude Code CLI** がインストール・認証済み — [インストールガイド](https://docs.anthropic.com/en/docs/claude-code/overview)
- 有効な **Claude Codeサブスクリプション**（Max、Pro、またはTeamプラン）

CLIが動作することを確認：

```bash
claude --version
```

---

## 使い方

1. 左サイドバーのリボンアイコンから **Claude Code Dashboard** ビューを開く
2. チャット入力欄にメッセージを入力し、**Shift+Enter** で送信（**Enter** は改行）
3. `/` でスラッシュコマンドを参照、`@` でVaultファイルをメンション、添付ボタンでファイルを選択
4. チャットヘッダーのツールバーから **Plan First** や **Thinking** モードを切り替え
5. モデルセレクタードロップダウンでモデルを切り替え
6. **tmux** タブまたは **Automation** タブを開いてバックグラウンドプロセスを監視

---

## 設定

**設定 > Claude Code Dashboard** でカスタマイズ：

| 設定項目 | 説明 | デフォルト |
|---|---|---|
| CLIパス | `claude` 実行ファイルのパス | `claude` |
| 作業ディレクトリ | セッションのデフォルト作業ディレクトリ | Vaultルート |
| デフォルトモデル | Opus 1M / Opus / Sonnet / Haiku | Sonnet |
| 権限モード | Default / Accept Edits / Bypass All | Accept Edits |
| Webリクエスト許可 | WebFetch、WebSearch、curl、python3を自動承認 | オフ |
| ツールコール表示 | Read、Edit、Bashパネルをチャットに表示 | オン |
| コスト情報表示 | トークン使用量とコストをコンテキストバーに表示 | オン |
| Plan Firstデフォルト | 新しいセッションでPlan Firstモードを有効化 | オフ |
| Thinkingモードデフォルト | デフォルトで拡張思考を有効化 | オン |
| tmuxポーリング間隔 | tmuxセッションのチェック間隔（ms） | 5000 |
| 自動化ポーリング間隔 | 実行中の自動化のチェック間隔（ms） | 10000 |

---

## コントリビュート

スター、フォーク、Issue、PRすべて歓迎です！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成：`git checkout -b feat/my-feature`
3. 変更を加えてコミット：`git commit -m "feat: add my feature"`
4. フォークにプッシュ：`git push origin feat/my-feature`
5. Pull Requestを作成

---

## このプラグインが役に立ったら、ぜひリポジトリにスターをお願いします — 他の人がプロジェクトを見つける助けになります！

---

## ライセンス

[MIT](../LICENSE)

---

## リンク

- **リポジトリ**: [github.com/shimayuz/claudecode-plugin](https://github.com/shimayuz/claudecode-plugin)
- **Issues**: [github.com/shimayuz/claudecode-plugin/issues](https://github.com/shimayuz/claudecode-plugin/issues)
- **Claude Code CLI**: [docs.anthropic.com/en/docs/claude-code/overview](https://docs.anthropic.com/en/docs/claude-code/overview)
- **Obsidian**: [obsidian.md](https://obsidian.md)
- **BRAT**: [github.com/TfTHacker/obsidian42-brat](https://github.com/TfTHacker/obsidian42-brat)
