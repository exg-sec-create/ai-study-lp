#!/usr/bin/env node
/**
 * 週次解析用：社員ごとの活動プロフィールを1つのJSONにまとめて標準出力する。
 * Claude はこれを読んで「アンバサダー候補の所見（考え方・姿勢）」を書く。
 * 数値のスコアは運営コンソール側で計算するので、ここでは材料（事実と自由記述）だけを出す。
 *
 *   node tools/claude-weekly/profiles.cjs > /tmp/profiles.json
 */
const { execFileSync } = require('child_process');
const path = require('path');

const COLS = ['aiStudy_employees', 'aiStudy_cases', 'aiStudy_attendance', 'aiStudy_surveys',
  'aiStudy_aiDiagnosticResponses', 'aiStudy_licenses', 'aiStudy_slackThreads'];
const raw = JSON.parse(execFileSync('node', [path.join(__dirname, 'firestore.cjs'), 'read', ...COLS], { maxBuffer: 64 * 1024 * 1024 }).toString());
const lower = s => String(s || '').trim().toLowerCase();
const cut = (s, n) => String(s || '').replace(/\s+/g, ' ').slice(0, n);

const people = {};
const P = email => {
  const e = lower(email);
  if (!e) return null;
  return people[e] = people[e] || { email: e, name: '', dept: '', sessions: [], absent: 0, cases: [], surveys: [], diagnosis: [], slack: { asked: 0, answered: 0, resolved: 0, texts: [] }, ambassador: null };
};

raw.aiStudy_employees.forEach(d => { const p = P(d.id); p.name = d.name || ''; p.dept = d.dept || ''; });
raw.aiStudy_cases.forEach(d => { const p = P(d.email); if (!p) return; p.name = p.name || d.name || ''; p.dept = p.dept || d.dept || '';
  p.cases.push({ at: d.createdAt, task: d.task || d.scene || '', title: cut(d.title, 60), effect: cut(d.effect, 80), savedMin: d.beforeMin > 0 && d.afterMin != null ? d.beforeMin - d.afterMin : null, monthlyCount: d.monthlyCount || null }); });
raw.aiStudy_attendance.forEach(d => { const p = P(d.email); if (!p) return; if (d.status === 'present') p.sessions.push(d.date); else p.absent++; });
raw.aiStudy_surveys.forEach(d => { const p = P(d.email); if (!p) return; p.name = p.name || d.name || '';
  if (d.eventDate && !p.sessions.includes(d.eventDate)) p.sessions.push(d.eventDate);
  p.surveys.push({ date: d.eventDate, usefulness: d.usefulness, takeaway: cut(d.takeaway, 160), nextTopic: cut(d.nextTopic, 100), comment: cut(d.comment, 160) }); });
raw.aiStudy_aiDiagnosticResponses.forEach(d => { const p = P(d.email); if (!p) return; p.name = p.name || d.name || '';
  const a = d.answers || {};
  p.diagnosis.push({ at: d.submittedAt, level: d.level, score: d.score, share: a.share, experiment: a.experiment, paidTools: d.paidToolsInterest, scenes: a.scenes, free: cut(a.goal || a.freeText || a.comment || '', 160) }); });
raw.aiStudy_licenses.forEach(d => { if (d.id === '__config') return; const p = P(d.id); p.name = p.name || d.name || ''; p.ambassador = { tool: d.tool, status: d.status, appointedAt: d.grantedAt }; });
raw.aiStudy_slackThreads.forEach(t => {
  if (t.kind && t.kind !== 'question') return;
  const a = P(t.askerEmail); if (a) { a.slack.asked++; a.slack.texts.push(cut(t.text, 100)); }
  (t.responders || []).forEach(r => { const p = P(r.email); if (!p) return; p.slack.answered += r.count || 0; if (r.checked) p.slack.resolved++; });
});

Object.values(people).forEach(p => { p.diagnosis.sort((a, b) => String(a.at).localeCompare(String(b.at))); p.sessions = [...new Set(p.sessions)].sort(); });
const out = Object.values(people).filter(p => p.sessions.length || p.cases.length || p.surveys.length || p.diagnosis.length || p.slack.asked || p.slack.answered || p.ambassador);
process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), people: out }, null, 1));
