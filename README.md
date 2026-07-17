# AI勉強会 出欠確認LP(exceed-secretary-system 同居版)

社内AI勉強会(7/17 金 18:00–19:00)向けの、出欠回答フォーム付きランディングページです。
既存Firebaseプロジェクト **exceed-secretary-system** に相乗りする前提で、
既存データ・既存ルール・既存Hostingサイトを壊さない構成にしています。

- **LP (`public/index.html`)** — イベント紹介 + カウントダウン + Googleログイン + 「欠席致します。」ワンボタン回答
- **管理者ページ (`public/admin.html`)** — イベント編集 / 回答権・管理権限の管理 / 欠席者一覧(リアルタイム・CSV)
- **Firestoreルール (`firestore.rules`)** — 編集は管理者のみ、回答は許可メンバーのみをサーバー側で強制

## 既存プロジェクトと衝突しないための設計
- コレクション名は接頭辞付き: `aiStudy_settings` / `aiStudy_responses`
- ルール内の関数名も `aiStudy〜` に統一(既存ルールとマージしても名前衝突しない)
- Hostingは **マルチサイト(別サイト)** としてデプロイし、既存サイトを上書きしない

## セットアップ手順

### 1. Firebase設定値の取得
1. https://console.firebase.google.com → **exceed-secretary-system** を開く
2. **Authentication → ログイン方法 → Google** が有効になっているか確認(未設定なら有効化)
3. プロジェクトの設定 → マイアプリ → 既存のウェブアプリ設定(なければウェブアプリを追加)から
   `apiKey` / `messagingSenderId` / `appId` をコピーし、`public/firebase-config.js` の残り3項目を埋める
   (`projectId` などは設定済みです)

### 2. 最初の管理者を登録(初回のみ・重要)
Firestoreコンソールで手動でドキュメントを1件作成します。

- コレクション: `aiStudy_settings` / ドキュメントID: `access`
- フィールド:
  - `admins`(配列): あなたのGmailアドレス(小文字)
  - `members`(配列): 回答権を持たせたいメンバーのGmailアドレス

以降のメンバー追加・削除は管理者ページから行えます。

### 3. Firestoreルールの反映(⚠ 上書き注意)
**exceed-secretary-system に既存のルールがある場合**、
`firebase deploy --only firestore:rules` は既存ルールを**全て置き換え**ます。
必ず Firebaseコンソール → Firestore → ルール を開き、`firestore.rules` 内の
「AI勉強会」ブロック(ヘルパー関数 + match 3つ)を既存ルールの
`match /databases/{database}/documents { ... }` の中に**コピペでマージ**して公開してください。

既存ルールが無い(デフォルトのまま)なら、そのまま `firebase deploy --only firestore:rules` でOKです。

### 4. Hostingデプロイ(既存サイトを壊さない別サイト方式)
```bash
npm install -g firebase-tools
firebase login
cd ai-study-lp

# 新しいHostingサイトを作成(サイトIDは全世界で一意。例: exceed-ai-study)
firebase hosting:sites:create exceed-ai-study

# このリポジトリの "ai-study" ターゲットを作成したサイトに紐付け
firebase target:apply hosting ai-study exceed-ai-study

# デプロイ(Hostingのみ)
firebase deploy --only hosting:ai-study
```
公開URL: `https://exceed-ai-study.web.app` — これが社内共有用のLPです。

※ 既存プロジェクトでHostingを一切使っていない場合は、マルチサイトにせず
`firebase.json` の hosting をシンプルな単一設定に戻して `firebase deploy --only hosting` でも構いません。

### 5. GitHubでの管理(任意)
```bash
git init && git add -A && git commit -m "AI study session LP"
git remote add origin git@github.com:YOUR_ORG/ai-study-lp.git
git push -u origin main
```
プッシュ時の自動デプロイは `firebase init hosting:github` でGitHub Actionsを自動生成できます。

## 運用メモ
- **社内ドメイン限定**: `index.html` / `admin.html` の
  `provider.setCustomParameters({ hd: "example.co.jp" })` のコメントを外して自社ドメインを指定。
  確実な制限は `members` リスト(ルールで強制)で行われます。
- **回答の仕様**: 参加者は回答不要。欠席者のみログインしてボタンを押すと
  `aiStudy_responses/{uid}` に `{ email, name, status: "absent", respondedAt }` が保存。本人取り消し可。
- **管理者判定**: `aiStudy_settings/access` の `admins` に含まれるメールのみ、
  管理者ページ・イベント編集・権限編集・全回答の閲覧/削除が可能(ルールで強制)。
- **日付変更**: 管理者ページの「開始日時」を変えるとカウントダウンも自動追従。

## Firestoreデータ構造
| パス | 内容 | 読み | 書き |
|---|---|---|---|
| `aiStudy_settings/event` | タイトル・日時・場所・概要・アジェンダ・開始日時 | 全員 | 管理者 |
| `aiStudy_settings/access` | `admins` / `members` のメール配列 | 管理者 | 管理者 |
| `aiStudy_responses/{uid}` | 欠席回答(email / name / status / respondedAt) | 本人・管理者 | 本人(メンバーのみ) |
