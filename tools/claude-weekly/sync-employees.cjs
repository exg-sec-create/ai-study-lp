#!/usr/bin/env node
/**
 * 社員マスタ同期：スプレッドシート「基本社員データ（システム→スプシ）」→ Firestore
 *
 *   node tools/claude-weekly/sync-employees.cjs <sheet.csv> [emails.json] [--dry-run]
 *
 *  sheet.csv   … Google Drive コネクタで読んだシートの内容（「社員ID,社員番号,氏名,…」の見出し行を含む）
 *  emails.json … { "slackUsers": [ { "name": "[部署]氏名", "email": "..." } ], "byId": { "社員ID": "メール" } }
 *                シートにメール列がないため、Slack の利用者一覧（slack_search_users で社内ドメインを検索）を渡すと
 *                氏名で照合する。byId は名前が一致しない人（英字表記など）の手動指定。
 *                一度紐付けたメールは Firestore に残るので、次回からは新しく入った人だけが対象になる。
 *
 * 書き込み先：
 *  aiStudy_staffRoster/{社員ID} … シートの全員（在職・退職）。メールの紐付けもここで保持
 *  aiStudy_employees/{メール}    … メールが分かる人だけ。事例投稿の氏名・部署判定と、退職者の利用停止（active:false）に使う
 * 権限（運営・管理・アンバサダー）はここでは変更しない。新しく入った人は「一般」から始まる。
 *
 * 最後に、メール未紐付けの在職者（unlinked）などを JSON で出力する。
 */
const fs = require('fs');
const { readCollections, writeDocs } = require('./firestore.cjs');

const [file, emailsFile] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const DRY = process.argv.includes('--dry-run');
if (!file) { console.error('使い方: sync-employees.cjs <sheet.csv> [emails.json] [--dry-run]'); process.exit(1); }

const nameKey = s => String(s || '').normalize('NFKC').replace(/[\s　]/g, '');
const isEmail = s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || ''));

function parseSheet(text) {
  const lines = text.split(/\r?\n/).map(l => l.replace(/^\|\s*|\s*\|$/g, '').trim());
  const h = lines.findIndex(l => /^社員ID\s*,\s*社員番号/.test(l));
  if (h < 0) throw new Error('見出し行（社員ID,社員番号,…）が見つかりません');
  const cols = lines[h].split(',').map(s => s.trim());
  const idx = k => cols.indexOf(k);
  return lines.slice(h + 1).filter(l => l && !l.startsWith('```')).map(l => {
    const c = l.split(',').map(s => s.trim());
    const deptPath = c[idx('所属部署')] || '';
    const parts = deptPath.split('|').map(s => s.trim()).filter(Boolean);
    return {
      id: c[idx('社員ID')], employeeNo: c[idx('社員番号')] || '', name: (c[idx('氏名')] || '').replace(/[\s　]+/g, ' ').trim(),
      joinedAt: c[idx('入社日')] || '', leftAt: c[idx('退職日')] || '', deptPath,
      division: parts[0] || '', dept: parts[1] || parts[0] || '', status: c[idx('在職状態')] || '',
    };
  }).filter(r => r.id && r.name);
}

(async () => {
  const rows = parseSheet(fs.readFileSync(file, 'utf8'));
  const manual = emailsFile ? JSON.parse(fs.readFileSync(emailsFile, 'utf8')) : {};
  const db = await readCollections(['aiStudy_staffRoster', 'aiStudy_employees', 'aiStudy_cases', 'aiStudy_surveys',
    'aiStudy_aiDiagnosticResponses', 'aiStudy_licenses', 'aiStudy_slackThreads']);
  const roster = Object.fromEntries(db.aiStudy_staffRoster.map(d => [d.id, d]));
  // 氏名→メールの手がかり：社員マスタ・事例・アンケート・診断・名簿・Slack にすでにある「名前とメールの組」
  const empByName = {};
  const addPair = (name, email) => {
    const k = nameKey(name), e = String(email || '').toLowerCase();
    if (!k || !isEmail(e)) return;
    empByName[k] = [...new Set([...(empByName[k] || []), e])];
  };
  db.aiStudy_employees.forEach(e => addPair(e.name, e.id));
  db.aiStudy_cases.forEach(c => addPair(c.name, c.email));
  db.aiStudy_surveys.forEach(v => addPair(v.name, v.email));
  db.aiStudy_aiDiagnosticResponses.forEach(d => addPair(d.name, d.email));
  db.aiStudy_licenses.forEach(l => addPair(l.name, l.id));
  // Slack の利用者一覧（"[部署]氏名" の [] は除いて照合）。共有アカウントなど "/" を含む名前は使わない
  (manual.slackUsers || []).forEach(u => { const n = String(u.name || '').replace(/^\[[^\]]*\]/, ''); if (!/[\/／]/.test(n)) addPair(n, u.email); });
  db.aiStudy_slackThreads.forEach(t => { addPair(String(t.askerName || '').replace(/^\[[^\]]*\]/, ''), t.askerEmail);
    (t.responders || []).forEach(r => addPair(String(r.name || '').replace(/^\[[^\]]*\]/, ''), r.email)); });

  const now = { $date: new Date().toISOString() };
  const docs = [], unlinked = [], ambiguous = [], linkedNow = [], empDocs = {};
  const activeNames = new Set(rows.filter(r => r.status === '在職').map(r => nameKey(r.name)));
  for (const r of rows) {
    const active = r.status === '在職' && (!r.leftAt || new Date(r.leftAt) > new Date());
    let email = String((manual.byId || {})[r.id] || roster[r.id]?.email || '').toLowerCase();
    // 氏名での自動照合：在職者は常に、退職者は同じ氏名の在職者がいない場合だけ（利用停止にするため）
    if (!email && (r.status === '在職' || !activeNames.has(nameKey(r.name)))) {
      const hits = empByName[nameKey(r.name)] || [];
      if (hits.length === 1) email = hits[0];
      else if (hits.length > 1) ambiguous.push({ id: r.id, name: r.name, candidates: hits });
    }
    if (email && !isEmail(email)) email = '';
    if (email && !roster[r.id]?.email) linkedNow.push({ id: r.id, name: r.name, email });
    if (!email && active) unlinked.push({ id: r.id, name: r.name, dept: r.dept });
    docs.push({ path: `aiStudy_staffRoster/${r.id}`, data: {
      employeeNo: r.employeeNo, name: r.name, nameKey: nameKey(r.name), division: r.division, dept: r.dept, deptPath: r.deptPath,
      joinedAt: r.joinedAt, leftAt: r.leftAt, status: r.status, active, email: email || null,
      emailLinkedBy: roster[r.id]?.emailLinkedBy || (email ? 'sync' : null), syncedAt: now } });
    if (email) {
      // 同じメールに複数の行（再入社・同姓同名など）があるときは在職中の行を優先する
      const prev = empDocs[email];
      if (!prev || (active && !prev.active)) empDocs[email] = {
        name: r.name, dept: r.dept, division: r.division, employeeId: r.id, employeeNo: r.employeeNo,
        joinedAt: r.joinedAt, active, syncedAt: now };
    }
  }
  Object.entries(empDocs).forEach(([email, data]) => docs.push({ path: `aiStudy_employees/${email}`, data }));
  // シートから消えた人（社員IDがない）は何もしない：勤怠システムの出力ミスで全員が消えた場合に備える
  const summary = {
    sheetRows: rows.length, active: rows.filter(r => r.status === '在職').length,
    retired: rows.filter(r => r.status !== '在職').length, linkedNow, unlinked, ambiguous,
  };
  if (!DRY) {
    if (rows.length < 10) throw new Error('シートの行数が少なすぎます（読み取りに失敗した可能性）。書き込みを中止しました');
    await writeDocs(docs.filter(d => d.path.startsWith('aiStudy_staffRoster/')), { allowed: ['aiStudy_staffRoster/'] });
    const empDocs = docs.filter(d => d.path.startsWith('aiStudy_employees/'));
    if (empDocs.length) await writeDocs(empDocs, { allowed: ['aiStudy_employees/'], merge: true });
    await writeDocs([{ path: 'aiStudy_slackSync/employeesSync', data: { ok: true, lastSyncAt: now, sheetRows: rows.length, active: summary.active, unlinked: unlinked.length } }],
      { allowed: ['aiStudy_slackSync/'] });
  }
  process.stdout.write(JSON.stringify({ dryRun: DRY, ...summary }, null, 1));
})().catch(e => { console.error('エラー:', e.message); process.exit(1); });
