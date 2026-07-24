# EXCEED GROUP AI活用システム

社内のAI活用を推進するためのWebシステム一式です。
出欠確認・事例投稿・活用状況の可視化を、すべてこのリポジトリで管理しています。

---

## 🔗 公開ページ（リンク集）

| ページ | URL | 用途 |
|--------|-----|------|
| **出欠LP** | https://exg-sec-create.github.io/ai-study-lp/ | 勉強会の案内・出欠回答 |
| **管理者ページ** | https://exg-sec-create.github.io/ai-study-lp/admin.html | イベント内容の編集・実施日ごとの出欠／出席率管理（管理者のみ） |
| **事例投稿フォーム** | https://exg-sec-create.github.io/ai-study-lp/form.html | AI活用事例の投稿（Googleログイン） |
| **活用ダッシュボード** | https://exg-sec-create.github.io/ai-study-lp/dashboard.html | 事例・削減時間・ランキングの可視化 |

---

## 🏗 システム構成

```
コード管理   → GitHub（このリポジトリ）
データ保管   → Firebase / Firestore（exceed-secretary-system）
公開         → GitHub Pages（exg-sec-create.github.io/ai-study-lp）
認証         → Google ログイン（社内アカウント）
```

- 事例・いいね・社員マスタはすべて Firestore の `aiStudy_` コレクションに保存
- 既存の秘書システムと同じFirebaseプロジェクトbut接頭辞で分離しているため衝突しない

---

## 📁 ファイル構成

```
ai-study-lp/
├── public/
│   ├── index.html          出欠LP
│   ├── admin.html          管理者ページ
│   ├── form.html           事例投稿フォーム
│   ├── dashboard.html      活用ダッシュボード
│   └── firebase-config.js  Firebase接続設定
├── firestore.rules         Firestoreセキュリティルール
├── firebase.json           Firebase設定
└── README.md               このファイル
```

---

## 🔄 更新のしかた（開発者向け）

ファイルを編集したら、以下を順番に実行して公開に反映します。

```bash
cd ~/Downloads/ai-study-lp
git add -A
git commit -m "変更内容のメモ"
git push
```

- `git push` … GitHubにコードを記録（履歴が残る）
- GitHub Pagesの公開設定により、対象ブランチへのpushが公開サイトに反映されます。

### 前提ツール

```bash
node -v        # v18以上
```

---

## 👥 権限について

- **イベント内容・出欠の確認・編集** … 管理者ページ（admin.html）から画面上で操作できます。実施日、出席／欠席、備考（体調不良等）を記録・修正できます。
- **管理者の追加** … Firestoreの `aiStudy_settings/access` ドキュメントの `admins` 配列にGmailアドレスを追加します。
- **コードの編集に参加したい場合** … このGitHubリポジトリのCollaboratorに招待します（Settings → Collaborators）。

---

## 📊 主な機能

- **出欠管理**：Googleログイン → ワンクリックで欠席回答。管理者は実施日ごとの出席／欠席／備考を確定し、出席率を確認可能
- **事例投稿**：AIツール・活用シーン・効果を投稿。氏名／部門はGmailから自動判定
- **作業効率の可視化**：「導入前○分 → 導入後○分」から削減率・削減時間を自動計算
- **ダッシュボード**：事例一覧・部門別削減時間・作業効率TOP5・投稿者ランキング
- **いいね機能**：事例に「いいね」でき、リアルタイムで全員に反映

---

## 📞 メンテナンス担当

社長室（tegawa@ych-exceed.com）

不明点や不具合があれば、上記まで連絡してください。
