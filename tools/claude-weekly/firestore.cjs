#!/usr/bin/env node
/**
 * Claude 週次解析用の Firestore 読み書きツール
 *
 * 認証はこのMacの Firebase CLI のログイン（`firebase login`）をそのまま使う。
 * トークンは画面にもファイルにも出さない。秘密情報はこのリポジトリに置かない。
 *
 *   node tools/claude-weekly/firestore.cjs read aiStudy_cases aiStudy_attendance ...
 *       → 各コレクションの全ドキュメントを JSON で標準出力
 *   node tools/claude-weekly/firestore.cjs write result.json
 *       → { "docs": [ { "path": "aiStudy_slackThreads/123_456", "data": {...} } ] } を書き込む
 *         日時は { "$date": "2026-10-05T09:00:00+09:00" } と書く
 *
 * 書き込めるのは週次解析の結果を置くコレクションだけ（下の WRITABLE）。
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = 'exceed-secretary-system';
const WRITABLE = ['aiStudy_slackThreads/', 'aiStudy_slackSync/', 'aiStudy_insights/'];

const FT = path.join(execSync('npm root -g').toString().trim(), 'firebase-tools', 'lib');
const { requireAuth } = require(path.join(FT, 'requireAuth'));
const { Client } = require(path.join(FT, 'apiv2'));
const { getGlobalDefaultAccount } = require(path.join(FT, 'auth'));

const DOCS = `projects/${PROJECT}/databases/(default)/documents`;

function fromValue(v) {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('stringValue' in v) return v.stringValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  if ('referenceValue' in v) return v.referenceValue;
  return null;
}
function fromFields(f) { const o = {}; for (const k of Object.keys(f)) o[k] = fromValue(f[k]); return o; }
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object' && v.$date) return { timestampValue: new Date(v.$date).toISOString() };
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}
function toFields(o) { const f = {}; for (const k of Object.keys(o)) f[k] = toValue(o[k]); return f; }

async function client() {
  // Firebase CLI 本体と同じく、ログイン中のアカウントで認証する
  const account = getGlobalDefaultAccount();
  if (!account) throw new Error('このMacで firebase login を実行してください');
  await requireAuth({ user: account.user, tokens: account.tokens });
  return new Client({ urlPrefix: 'https://firestore.googleapis.com', auth: true, apiVersion: 'v1' });
}

async function readCollections(cols) {
  const c = await client();
  const out = {};
  for (const col of cols) {
    if (!/^aiStudy_[A-Za-z]+$/.test(col)) throw new Error('読めるのは aiStudy_ で始まるコレクションだけです: ' + col);
    out[col] = [];
    let pageToken = '';
    do {
      const q = { pageSize: 300 };
      if (pageToken) q.pageToken = pageToken;
      const res = await c.get(`${DOCS}/${col}`, { queryParams: q });
      (res.body.documents || []).forEach(d => out[col].push({ id: d.name.split('/').pop(), ...fromFields(d.fields || {}) }));
      pageToken = res.body.nextPageToken || '';
    } while (pageToken);
  }
  return out;
}

// merge: true のときは渡した項目だけを更新し、ほかの項目は残す
async function writeDocs(docs, { allowed = WRITABLE, merge = false } = {}) {
  if (!Array.isArray(docs) || !docs.length) throw new Error('docs が空です');
  docs.forEach(d => {
    if (!allowed.some(p => d.path.startsWith(p)) || d.path.split('/').length !== 2) throw new Error('書き込めない場所です: ' + d.path);
  });
  const c = await client();
  for (let i = 0; i < docs.length; i += 400) {
    const writes = docs.slice(i, i + 400).map(d => ({
      update: { name: `${DOCS}/${d.path}`, fields: toFields(d.data) },
      ...(merge ? { updateMask: { fieldPaths: Object.keys(d.data).map(k => '`' + k + '`') } } : {}),
    }));
    await c.post(`${DOCS}:commit`, { writes });
  }
  return docs.length;
}

module.exports = { readCollections, writeDocs };

if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);
  (cmd === 'read'
    ? readCollections(args).then(out => process.stdout.write(JSON.stringify(out, null, 1)))
    : cmd === 'write'
    ? writeDocs(JSON.parse(fs.readFileSync(args[0], 'utf8')).docs).then(n => console.log(`書き込み完了: ${n}件`))
    : Promise.reject(new Error('使い方: read <collection...> | write <file.json>')))
    .catch(e => { console.error('エラー:', e.message); process.exit(1); });
}
