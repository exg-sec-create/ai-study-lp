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
| **社長ダッシュボード** | https://exg-sec-create.github.io/ai-study-lp/ceo.html | AI活用・勉強会・アカウント・アンバサダー・人事評価の対象を1ページで（経営閲覧・運営・管理） |
| **運営コンソール** | https://exg-sec-create.github.io/ai-study-lp/console.html | 権限マップ・メールでのアクセス確認・権限設定・AIツール利用者台帳・Slack相談の対応状況（管理者のみ） |
| **AIアンバサダー運用設計** | https://exg-sec-create.github.io/ai-study-lp/ambassador.html | 制度の提案・運用マップ（RULE/STANDARD/PLAYBOOK）。提案モード／修正モード（管理者＋閲覧許可者のみ） |
| **社員マスタ・権限** | https://exg-sec-create.github.io/ai-study-lp/employees.html | スプレッドシートから同期した社員一覧で、権限（一般／アンバサダー／運営／管理）・経営閲覧・出欠対象を設定 |

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
├── tools/claude-weekly/    Claude 週次解析の手順書と読み書きツール
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
- **アンバサダー名簿**：任命日・付与ツール・状態・削減目標・勉強会での発表・月間アクティブ日数を記録（`aiStudy_licenses/{email}`）。事例数・月間削減時間・Slack回答数・診断レベルは自動集計。
- **判定（卒業・足切り）**：STANDARDの基準（利用日数の足切り＋スコア）で B昇格／継続／黄色信号／卒業 の目安を表示し、面談後に判定を記録。任命から90日未満は判定しない。
- **候補者分析**：参加・事例・診断・姿勢・助け合いの5項目で点数化し、Claudeの週次所見（考え方・意欲）と並べて表示。名簿へワンクリックで追加。
- **Slack相談**：#ask-ai勉強会 の質問・未回答・解決率・対応した人。

## 👤 社員マスタと権限

- 社員の一覧はスプレッドシート「基本社員データ（システム→スプシ）」（勤怠システムの自動出力）が正。Claude が毎週（または手動の「社員マスタを今すぐ同期」で）`tools/claude-weekly/sync-employees.cjs` を使って取り込む。
  - `aiStudy_staffRoster/{社員ID}`：シートの全員。シートにメール列がないため、事例・アンケート・Slackの「名前とメール」から照合して紐付ける（紐付かない人は社員マスタ・権限ページで管理者が入力）
  - `aiStudy_employees/{メール}`：氏名・部署の自動判定。退職者は `active:false` になり、社員としてログインしても使えなくなる
- 権限は `aiStudy_settings/access` の `admins`（管理）・`ops`（運営）・`proposalViewers`（経営閲覧）・`members`（出欠対象）。アンバサダーは名簿（`aiStudy_licenses`）。新しく入った人は「一般」から始まる。

## 🎤 発表者の評価

- 勉強会の管理で発表者（名前・メール・発表内容）を設定すると、参加後アンケートに発表者ごとの評価（5段階・良かった点・改善点）が出る。本人は自分を評価しない。
- 結果は勉強会の管理・社長ダッシュボードに集計され、アンバサダー名簿の「発表」回数にも自動で数えられる。

## 🤖 Claude 週次解析（tools/claude-weekly）

GAS・スプレッドシート・Slackアプリは使いません。毎週月曜 9:00 に Claude デスクトップアプリのスケジュール機能で、Claude が [PROMPT.md](./tools/claude-weekly/PROMPT.md) の手順どおりに解析します。

1. Slackコネクタで #ask-ai勉強会 を読み、投稿を「質問／共有／案内」に分類、回答者と✅を集計
2. `profiles.cjs` で事例・出欠・アンケート・診断・名簿を読む
3. 所見（テーマ・気になる点・提案・アンバサダー候補と理由）を作成
4. `firestore.cjs write` で `aiStudy_slackThreads` `aiStudy_slackSync` `aiStudy_insights` に書き込み → コンソールに表示

- 認証はこのMacの Firebase CLI のログイン（`firebase login`）を使用。トークンは表示・保存しません。
- 書き込める場所はツール側で3コレクションに制限しています。
- アプリが閉じていたときは、次に起動したときに実行されます。

---

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
