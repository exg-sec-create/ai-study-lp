// ============================================================
//  AI STUDY 共通ヘッダー
//  使い方: <body> の先頭に <div id="ai-nav" data-page="dashboard"></div> を置き、
//          <script src="./assets/nav.js"></script> を読み込む。
//  data-page は下の PAGES の key。運営用ページ（ops: true）では運営メニューも表示する。
// ============================================================
(function () {
  // Slack の質問チャンネル（#ask-ai勉強会）
  var SLACK_URL = "https://slack.com/app_redirect?channel=C0BU68QP8M6";

  var MAIN = [
    { key: "index", href: "./index.html", label: "勉強会" },
    { key: "form", href: "./form.html", label: "事例を投稿" },
    { key: "dashboard", href: "./dashboard.html", label: "活用ダッシュボード" },
    { key: "survey", href: "./survey.html", label: "アンケート" },
    { key: "board", href: "./board.html", label: "アイデア掲示板" },
  ];
  var OPS = [
    { key: "ceo", href: "./ceo.html", label: "社長ダッシュボード" },
    { key: "console", href: "./console.html", label: "運営コンソール" },
    { key: "admin", href: "./admin.html", label: "勉強会の管理" },
    { key: "ambassador", href: "./ambassador.html", label: "アンバサダー運用設計" },
    { key: "employees", href: "./employees.html", label: "社員マスタ・権限" },
    { key: "diagnosis-results", href: "./ai-diagnosis-results.html", label: "診断集計" },
  ];

  var mount = document.getElementById("ai-nav");
  if (!mount) return;
  var page = mount.getAttribute("data-page") || "";
  var isOps = OPS.some(function (p) { return p.key === page; });

  function link(p, cls) {
    return '<a href="' + p.href + '" class="' + (cls || "") + (p.key === page ? " on" : "") + '"' +
      (p.key === page ? ' aria-current="page"' : "") + ">" + p.label + "</a>";
  }

  var html = '<div class="ai-sky" aria-hidden="true"><i></i><i></i></div>' +
    '<header class="ai-header"><div class="ai-wrap">' +
    '<a class="ai-brand" href="./index.html"><span class="dot"></span>AI STUDY <small>/ EXCEED GROUP</small></a>' +
    '<nav class="ai-nav" aria-label="メインメニュー">' +
    MAIN.map(function (p) { return link(p); }).join("") +
    '<a class="slack" href="' + SLACK_URL + '" target="_blank" rel="noopener">Slackで質問 ↗</a>' +
    link({ key: isOps ? page : "console", href: "./console.html", label: "運営" }, "ops") +
    "</nav></div>";
  if (isOps) {
    html += '<div class="ai-subnav"><div class="ai-wrap"><span class="lbl">OPS</span>' +
      OPS.map(function (p) { return link(p); }).join("") + "</div></div>";
  }
  html += "</header>";
  mount.outerHTML = html;
})();
