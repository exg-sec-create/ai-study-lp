# EXCEED GROUP AI活用システム

社内のAI活用を推進するためのWebシステム一式です。
出欠確認・事例投稿・活用状況の可視化を、すべてこのリポジトリで管理しています。

---

## 🔗 公開ページ（リンク集）

| ページ | URL | 用途 |
|--------|-----|------|
| **出欠LP** | https://exg-sec-create.github.io/ai-study-lp/ | 勉強会の案内・出欠回答 |
| **管理者ページ** | https://exg-sec-create.github.io/ai-study-lp/admin.html | イベント内容の編集・実施日ごとの出欠／出席率管理（管理者のみ） |
| **参加後アンケート** | https://exg-sec-create.github.io/ai-study-lp/survey.html | 勉強会参加後のアンケート回答 |
| **AI IDEA BOARD** | https://exg-sec-create.github.io/ai-study-lp/board.html | AIに関する疑問・アイデアの共有 |
| **事例投稿フォーム** | https://exg-sec-create.github.io/ai-study-lp/form.html | AI活用事例の投稿（Googleログイン） |
| **活用ダッシュボード** | https://exg-sec-create.github.io/ai-study-lp/dashboard.html | 事例・削減時間・ランキングの可視化 |
| **社内AI活用レベル診断** | https://exg-sec-create.github.io/ai-study-lp/ai-diagnosis.html | AI活用レベルの診断（Googleログイン） |
| **診断結果集計** | https://exg-sec-create.github.io/ai-study-lp/ai-diagnosis-results.html | 診断結果の集計・CSV出力（管理者のみ） |
| **運営コンソール** | https://exg-sec-create.github.io/ai-study-lp/console.html | 権限マップ・メールでのアクセス確認・権限設定・AIツール利用者台帳・Slack相談の対応状況（管理者のみ） |
| **AIアンバサダー運用設計** | https://exg-sec-create.github.io/ai-study-lp/ambassador.html | 制度の提案・運用マップ（RULE/STANDARD/PLAYBOOK）。提案モード／修正モード（管理者＋閲覧許可者のみ） |
| **社員マスタ管理** | https://exg-sec-create.github.io/ai-study-lp/employees.html | 事例投稿の氏名・部門判定に使う社員マスタの登録（管理者のみ） |

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
│   ├── ambassador.html     AIアンバサダー運用設計（提案／修正モード）
│   ├── console.html        運営コンソール
│   ├── assets/             共通テーマ（theme.css）・共通ヘッダー（nav.js）
│   ├── employees.html      社員マスタ管理
│   └── firebase-config.js  Firebase接続設定
├── gas/slack-monitor/      Slack #ask-ai勉強会 自動確認（Google Apps Script）
├── firestore.rules         Firestoreセキュリティルール
├── firebase.json           Firebase設定
└── README.md               このファイル
```

## 🧭 社内AI活用レベル診断（単独ページ）

既存ページのナビゲーションには掲載せず、URLを知っている社員だけが利用する独立ページです。

- 診断: https://exg-sec-create.github.io/ai-study-lp/ai-diagnosis.html（`public/ai-diagnosis.html`）
- 管理者向け集計: https://exg-sec-create.github.io/ai-study-lp/ai-diagnosis-results.html（`public/ai-diagnosis-results.html`）
- 保存先: Firestore `aiStudy_aiDiagnostics/{Googleログインのuid}`（再回答時は最新結果に更新）

### Firebase / Firestore 構築手順

1. Firebase Consoleで既存プロジェクトを開き、**Authentication → Sign-in method → Google** を有効にします。
2. **Authentication → Settings → Authorized domains** に公開ドメイン（GitHub Pagesの場合は `exg-sec-create.github.io`）を追加します。
3. **Firestore Database** を作成し、`public/firebase-config.js` を対象Webアプリの設定値に合わせます。
4. リポジトリ直下で `firebase deploy --only firestore:rules` を実行し、`firestore.rules` を反映します。CLIを利用できない場合は、上記「JSONキーを作成できない場合」の手順でルールを手動公開します。
5. `aiStudy_settings/access` に `admins`（集計閲覧者のメール配列）と `members`（社員メール配列）を設定します。診断への回答自体はGoogleログイン済みの社員を想定し、集計ページは `admins` のみ閲覧できます。

診断結果にはメールアドレス、表示名、部署（任意）、設問別回答、希望ツール、自由記述、得点・レベルを保存します。運用開始前に社内の個人情報・AI利用ポリシーに沿って、閲覧管理者と保存期間を決めてください。集計はブラウザ内で最新回答をリアルタイム集計し、CSVとしてダウンロードできます。

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
- Firestoreルールは、認証secretがあればGitHub Actionsから自動反映されます。secretを作成できない場合も、以下の手順でFirebase Consoleから手動反映できます。認証情報が未登録のActionsでは、自動デプロイを警告付きでスキップします。

### Firestoreルールのデプロイ認証

GitHubの **Settings → Secrets and variables → Actions → New repository secret** で、次のいずれかを登録します。

1. **推奨: `FIREBASE_SERVICE_ACCOUNT`**
   - Firebaseプロジェクト `exceed-secretary-system` のサービスアカウント一覧では、GitHub Actions専用の **`github-action-1303421154@exceed-secretary-system.iam.gserviceaccount.com`** を選択します。汎用の **`firebase-adminsdk-fbsvc@exceed-secretary-system.iam.gserviceaccount.com`** のキーは作成しません。
   - `github-action-1303421154` にFirestoreルールを更新できる必要最小限の権限が付与されていることを確認します。
   - そのサービスアカウントのJSONキーを、改行を含むJSON全文のままsecretの値に登録します。
   - workflowは実行時だけ一時ファイルに復元し、Firebase CLIのApplication Default Credentialsとして利用します。
2. **移行用: `FIREBASE_TOKEN`**
   - `firebase login:ci` で発行したトークンを登録します。
   - Firebase CLIではこの認証方法が非推奨になっているため、新規設定ではサービスアカウントを使ってください。

登録後、Actions画面から **Re-run jobs** を実行します。`Configure Firebase credentials`で表示される警告は、アプリやFirestoreルールの構文エラーではなく、GitHub ActionsからFirebaseへ接続する認証secretが存在しないため自動反映をスキップしたことを表します。secretはセキュリティ上workflowファイルには保存しません。

### JSONキーを作成できない場合（手動反映）

Firebaseプロジェクトの編集権限はあるもののサービスアカウントキーを作成できない場合は、次の手順で反映します。

1. このリポジトリの [`firestore.rules`](./firestore.rules) を開き、内容をすべてコピーします。
2. [Firebase Console](https://console.firebase.google.com/) で `exceed-secretary-system` を開きます。
3. **Firestore Database → ルール**を開き、既存のルールをコピーした内容で置き換えます。
4. **公開**を押し、エラーが表示されないことを確認します。
5. GitHub Actionsの`deploy-firestore-rules`が警告付きで完了していることを確認します。認証secretがない間、以後の`firestore.rules`変更も同じ手順で手動反映してください。

この方法ではJSONキーも`FIREBASE_TOKEN`も不要です。ただし、GitHub上のファイルを変更しただけではFirebase側へ反映されないため、ルールを変更するたびに必ず手動で公開してください。

### 前提ツール

```bash
node -v        # v18以上
```

---

## 🤝 AIアンバサダー運用設計ページ（ambassador.html）

- **本文はリポジトリに置かない**：制度の中身はFirestore `aiStudy_ambassador/proposal` にだけ保存します。このリポジトリは公開なので、内部方針をHTMLに直書きしないでください。
- **提案モード**：社長確認用の閲覧表示。判断事項ごとに「承認／保留／要修正」とコメントを残せます（`aiStudy_ambassadorFeedback`）。
- **修正モード**：管理者（`admins`）のみ。文字を直接クリックして編集し、「保存する」で新しい版として記録（`aiStudy_ambassadorHistory` に追記、過去版は消えない）。
- **閲覧者の追加**：ページ内「管理・履歴」タブ、または `aiStudy_settings/access` の `proposalViewers` 配列にメールを追加。
- **初回の取り込み**：修正モードの「JSON読込」で、社長室保管の初期データ（リポジトリ外）を読み込んで保存します。
- **ローカル確認**：`public/ambassador-seed.local.json` を置き、`http://localhost:<port>/ambassador.html?local=1` で開くとログインなしで表示できます（`*.local.json` はgitignore済み）。

---

## 🧭 運営コンソール（console.html）

- **権限マップ・確認**：ページ×権限の一覧と、メールアドレス（または氏名）を入れると「その人が見られるページ／見られないページ」と理由を表示。
- **権限の設定**：管理者・出欠メンバー・提案ページ閲覧の3つをチップで追加／削除（`aiStudy_settings/access`）。
- **ツール利用者**：ChatGPT Business／Claude Team の付与記録（`aiStudy_licenses/{email}`）。事例数・月間削減時間・Slack回答数・診断レベルを自動集計し、「付与90日・事例ゼロ」などの要フォローを表示。
- **Slack相談の対応状況**：`gas/slack-monitor` が1時間ごとに #ask-ai勉強会 を読み、回答者・✅解決・未回答を記録（`aiStudy_slackThreads`）。設定手順は [gas/slack-monitor/README.md](./gas/slack-monitor/README.md)。

## 🎨 デザイン

- 全ページ共通の配色・部品は `public/assets/theme.css`、共通ヘッダーは `public/assets/nav.js`。
- 新しいページは `<link rel="stylesheet" href="./assets/theme.css">` と、`<body>` 先頭に `<div id="ai-nav" data-page="キー"></div><script src="./assets/nav.js"></script>` を置く。

---

## 🔐 セキュリティ方針

- 社員の氏名・メールなどの個人情報をコードに書かない（社員マスタはFirestoreに登録）。
- 事例・社員マスタ・いいねの読み書きは、社内ドメイン（またはmembers登録）のGoogleログインに限定。
- ユーザー入力を画面に出すときは必ずエスケープする（`esc()`）。
- Firebaseのブラウザ用APIキーは公開前提の値ですが、Google Cloud Consoleで「HTTPリファラ制限」をかけてください。

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
