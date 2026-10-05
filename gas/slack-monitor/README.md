# Slack #ask-ai勉強会 自動確認（Google Apps Script）

1時間ごとに #ask-ai勉強会 を読み、質問スレッドごとに「質問した人・回答した人・✅が付いた回答・最初の回答までの時間」を Firestore `aiStudy_slackThreads` に記録します。結果は [運営コンソール](https://exg-sec-create.github.io/ai-study-lp/console.html) の「Slack相談の対応状況」に表示されます。担当者がスタンプを数える作業はなくなります。

## しくみ

```
Slack #ask-ai勉強会 ──(1時間ごと / Slack API)──▶ Apps Script ──(Firestore REST)──▶ aiStudy_slackThreads
                                                                                       │
                                                         運営コンソール（管理者のみ閲覧） ◀┘
```

- 「解決」= 質問した本人が、スレッド内の回答に ✅（`white_check_mark` など）を付けたもの。✅を付けた回答の投稿者が「解決した人」として数えられます。
- 毎回、直近60日分（`LOOKBACK_DAYS`）を見直すので、あとから付いた✅も反映されます。
- 読むのはこのチャンネルだけです。

## 設定手順

1. **Slackアプリを作る** — https://api.slack.com/apps → Create New App → From scratch（ワークスペースを選択。社外に配布しない社内専用アプリとして作る）
   - OAuth & Permissions → Bot Token Scopes：`channels:history` `channels:read` `reactions:read` `users:read` `users:read.email`
   - 未回答のお知らせも使う場合は `chat:write` も追加
   - Install to Workspace → **Bot User OAuth Token（xoxb-…）** を控える
2. **Botを招待** — #ask-ai勉強会 で `/invite @アプリ名`
3. **Apps Script を作る** — https://script.google.com → 新しいプロジェクト
   - `Code.gs` にこのフォルダの `Code.gs` を貼り付け
   - プロジェクトの設定 →「appsscript.json マニフェスト ファイルをエディタで表示する」をオン → `appsscript.json` を貼り付け
4. **スクリプトプロパティ** — プロジェクトの設定 → スクリプト プロパティ
   - `SLACK_BOT_TOKEN` = xoxb-…（必須）
   - 任意：`REMIND_UNANSWERED` = `true`（未回答の質問を毎朝9時にお知らせ）、`REMIND_AFTER_HOURS`（既定 24）、`LOOKBACK_DAYS`（既定 60）
5. **`setup` を実行** — 関数 `setup` を選んで実行 → 権限を許可。1時間ごとの自動実行が登録され、すぐに1回同期します。

> 実行する Google アカウントは、Firebase プロジェクト `exceed-secretary-system` の編集権限（Cloud Datastore ユーザー以上）が必要です。サービスアカウントの鍵は使いません。

## うまくいかないとき

| 表示 | 対応 |
|---|---|
| `Slack conversations.history: not_in_channel` | Botをチャンネルに招待する（手順2） |
| `Slack users.info: missing_scope` | Bot Token Scopes を追加して、アプリを再インストール |
| `Firestore 403` | 実行アカウントに Firebase プロジェクトの権限があるか確認 |
| `Firestore 403 ... has not been used in project` | Apps Script のプロジェクト設定で、GCPプロジェクトを `exceed-secretary-system` に切り替える |

トークンは必ずスクリプトプロパティに入れ、コードやリポジトリには書かないでください。
