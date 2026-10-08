# AI STUDY 週次解析（毎週月曜 9:00）

Claude が毎週この手順で解析し、結果を運営コンソール（console.html）に反映する。
GAS・スプレッドシート・Slackアプリは使わない。Slackは Slack コネクタで「読むだけ」。Slackへの投稿はしない。

作業フォルダ：`/Users/tegawatakemi/Desktop/Claude_tegawa_development/ai-study-lp`
一時ファイル：`/tmp/ai-study-weekly/`（終わったら削除する）

## 0. 社員マスタを同期する（スプレッドシート → Firestore）
- Google Drive コネクタの `get_file_metadata`（fileId: `1ESgN3xwtLZ2sIQ_XYKYIWW0AwRij4lZtc0rdebZODSs`、snippetVerbosity: `MAX_ALLOWED`）で
  「基本社員データ（システム→スプシ）」の CSV（`社員ID,社員番号,氏名,入社日,退職日,所属部署,在職状態`）を取得し、
  見出し行から最後までを `/tmp/ai-study-weekly/sheet.csv` に保存する。
- Slack コネクタの `slack_search_users` で社内ドメイン（`ych-exceed.com` `besto-haus.com` `exceed-group.co.jp`）を
  キーワード検索し（ページ送りして全員）、`{ "slackUsers": [ { "name": "表示名", "email": "メール" } ] }` を
  `/tmp/ai-study-weekly/emails.json` に保存する。
- まず `--dry-run` で確認してから本実行する：
```bash
node tools/claude-weekly/sync-employees.cjs /tmp/ai-study-weekly/sheet.csv /tmp/ai-study-weekly/emails.json --dry-run
node tools/claude-weekly/sync-employees.cjs /tmp/ai-study-weekly/sheet.csv /tmp/ai-study-weekly/emails.json
```
- 権限（運営・管理・アンバサダー）は変更しない。新しく入った人は自動的に「一般」になる。
- `unlinked`（メール未紐付けの在職者）は件数だけ報告する（社員マスタ・権限ページで管理者が紐付ける）。

## 1. Slack #ask-ai勉強会 を読む（channel_id: C0BU68QP8M6）
- `slack_read_channel` で直近60日分（oldest = 今から60日前のUNIX秒）を読む。返信のある投稿は `slack_read_thread` で全文を読む。✅の確認が必要なら `slack_get_reactions` を使う。
- 「〇〇さんがチャンネルに参加しました」・Slackbot・Bot の投稿は除外する。
- 親投稿ごとに `kind` を決める：
  - `question`：社員が困りごと・やり方を聞いている投稿
  - `share`：資料・プロンプト・ノウハウの共有（運営の勉強会資料など）
  - `announcement`：運営からのお知らせ（チャンネル名の変更など）
- `question` の場合は、質問者以外の返信者ごとに回答数を数え、質問者がその返信に ✅（white_check_mark / heavy_check_mark / ballot_box_with_check）を付けていれば `checked: true`。
  - `status`：✅付きの回答あり → `resolved`、質問者以外の返信あり → `answered`、なし → `unanswered`
  - `firstReplyMinutes`：最初の（質問者以外の）返信までの分数
- `share` / `announcement` は `status: "info"`、`responders: []`。

## 2. 活動データを読む
```bash
cd /Users/tegawatakemi/Desktop/Claude_tegawa_development/ai-study-lp
mkdir -p /tmp/ai-study-weekly
node tools/claude-weekly/profiles.cjs > /tmp/ai-study-weekly/profiles.json
```
社員ごとの参加・事例・アンケートの自由記述・診断・Slackの活動がまとまっている。

## 3. 所見を書く
- `summary`：今週の状況を2〜3文（数字を入れる）
- `themes`：質問・アンケートで多いテーマ（3〜5個）
- `concerns`：運営が気にすべき点（未回答の質問、データ不足など）
- `actions`：運営への具体的な提案（3〜4個）
- `candidates`：アンバサダー候補（アンバサダー名簿で利用中・黄色信号の人と、運営メンバーは除く）。
  一人ずつ `email` `name` `fit`（推薦／有力／見守り）`role`（例：Aコース候補、発表者候補、推進リーダー）`reason`（事実にもとづく1〜3文）。
  見るポイント：参加の継続、事例と削減時間、学びを自分の業務に落とし込めているか、周りに広げる・教える意欲（「発表したい」「みんなが使えるように」など）、Slackで人を助けているか。
  推測で人を低く評価しない。材料が少ない人は書かない。
- 書き方：ですます調、短く。個人を責める表現は使わない。

## 4. 書き込む
`/tmp/ai-study-weekly/result.json` を作って書き込む：
```json
{ "docs": [
  { "path": "aiStudy_slackThreads/<ts の . を _ に>", "data": {
      "ts": "...", "kind": "question|share|announcement", "text": "（400字まで）", "url": "https://slack.com/archives/C0BU68QP8M6/p<ts から . を除いたもの>",
      "askerId": "...", "askerName": "...", "askerEmail": "...",
      "createdAt": { "$date": "ISO8601" }, "lastActivityAt": { "$date": "ISO8601" },
      "replyCount": 0, "firstReplyMinutes": null,
      "responders": [ { "id": "U..", "name": "..", "email": "..", "count": 1, "checked": false } ],
      "status": "resolved|answered|unanswered|info", "syncedAt": { "$date": "ISO8601" } } },
  { "path": "aiStudy_slackSync/status", "data": { "ok": true, "source": "claude-weekly", "threads": 0, "questions": 0, "error": "", "lastSyncAt": { "$date": "ISO8601" }, "channelId": "C0BU68QP8M6", "nextRun": "毎週月曜 9:00" } },
  { "path": "aiStudy_insights/<YYYY-MM-DD>", "data": { "createdAt": { "$date": "ISO8601" }, "source": "claude-weekly", "period": "YYYY-MM-DD〜YYYY-MM-DD",
      "summary": "...", "slack": { "questions": 0, "unanswered": 0, "resolved": 0, "announcements": 0, "note": "..." },
      "themes": [], "concerns": [], "actions": [], "candidates": [] } }
] }
```
```bash
node tools/claude-weekly/firestore.cjs write /tmp/ai-study-weekly/result.json
rm -rf /tmp/ai-study-weekly
```
書き込めるのは `aiStudy_slackThreads` `aiStudy_slackSync` `aiStudy_insights` だけ（ツール側で制限済み）。

## 5. 失敗したとき
途中で止まった場合も、`aiStudy_slackSync/status` に `ok: false` と `error`（原因を短く）を書き込んで終える。コンソールに「解析でエラー」と表示される。

## 6. 最後に
実行結果を4行で報告する（社員マスタの同期件数と未紐付け数・質問数・未回答数・新しい候補者の数）。個人の評価の詳細はチャットに書かない（コンソールで見る）。
