// 参加後アンケートの質問定義。管理者ページ(admin.html)で編集し、
// aiStudy_settings/event ドキュメントの surveyQuestions フィールドに保存される。
// survey.html はこの定義を読み込んでフォームを動的に生成する。

export const SURVEY_QUESTION_TYPES = ["scale", "choice", "text"];

export const DEFAULT_SURVEY_QUESTIONS = [
  { id: "satisfaction", type: "scale", label: "勉強会全体の満足度を教えてください", required: true, lowLabel: "不満", highLabel: "とても満足" },
  { id: "usefulness", type: "scale", label: "業務に活かせそうだと感じましたか？", required: true, lowLabel: "感じなかった", highLabel: "強く感じた" },
  { id: "clarity", type: "scale", label: "内容のわかりやすさを教えてください", required: true, lowLabel: "難しかった", highLabel: "とてもわかりやすい" },
  { id: "bestTopic", type: "choice", label: "最も印象に残った内容", required: true, options: ["生成AIの最新動向", "社内活用事例の紹介", "デモンストレーション", "質疑応答・ディスカッション", "その他"] },
  { id: "takeaway", type: "text", label: "今回の学び・明日から試したいこと", required: false, placeholder: "例：議事録の要約を、チームの定例会で試してみたい" },
  { id: "nextTopic", type: "text", label: "次回取り上げてほしいテーマ", required: false, placeholder: "例：実務で使えるプロンプトの作り方、情報管理上の注意点" },
  { id: "comment", type: "text", label: "運営へのご意見・ご感想", required: false, placeholder: "よかった点や改善してほしい点など、自由にご記入ください" },
];

// Firestore から読み込んだ値を安全な形に整える。壊れた/未設定のデータの場合は
// 既定の質問セット(=これまで固定だった質問)にフォールバックする。
export function normalizeSurveyQuestions(list) {
  if (!Array.isArray(list) || !list.length) return DEFAULT_SURVEY_QUESTIONS.map(q => ({ ...q }));
  return list
    .filter(q => q && typeof q.id === "string" && q.id && SURVEY_QUESTION_TYPES.includes(q.type) && typeof q.label === "string" && q.label.trim())
    .map(q => ({
      id: q.id,
      type: q.type,
      label: q.label,
      required: !!q.required,
      options: Array.isArray(q.options) ? q.options.filter(o => typeof o === "string" && o.trim()) : [],
      placeholder: typeof q.placeholder === "string" ? q.placeholder : "",
      lowLabel: typeof q.lowLabel === "string" ? q.lowLabel : "",
      highLabel: typeof q.highLabel === "string" ? q.highLabel : "",
    }));
}

export function newSurveyQuestionId() {
  return "q" + Math.random().toString(36).slice(2, 10);
}
