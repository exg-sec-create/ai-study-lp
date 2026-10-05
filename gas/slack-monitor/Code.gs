/**
 * Slack #ask-ai勉強会 自動確認スクリプト（Google Apps Script）
 *
 * 1時間ごとにチャンネルを読み、質問スレッドごとに
 *   ・質問した人 ・回答した人と回答数 ・質問者が✅を付けた回答 ・最初の回答までの時間
 * を Firestore（aiStudy_slackThreads）に記録する。運営コンソールの「Slack相談の対応状況」に表示される。
 *
 * 認証:
 *   Slack   … スクリプトプロパティ SLACK_BOT_TOKEN（xoxb-…）。コードには書かない。
 *   Firebase … このスクリプトを実行する Google アカウントの権限（ScriptApp.getOAuthToken）。
 *              サービスアカウントの鍵は不要。実行者は Firebase プロジェクトの編集権限が必要。
 *
 * 初回: スクリプトプロパティを設定 → setup() を1回実行。
 */

const DEFAULTS = {
  SLACK_CHANNEL_ID: 'C0BU68QP8M6',          // #ask-ai勉強会
  FIREBASE_PROJECT_ID: 'exceed-secretary-system',
  LOOKBACK_DAYS: '60',                      // 何日前までの質問を毎回見直すか（✅の後付けを拾うため）
  REMIND_UNANSWERED: 'false',               // true にすると未回答の質問を毎朝チャンネルでお知らせ（chat:write が必要）
  REMIND_AFTER_HOURS: '24',
};
const CHECK_REACTIONS = ['white_check_mark', 'heavy_check_mark', 'ballot_box_with_check'];

function prop_(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  return v == null || v === '' ? DEFAULTS[key] : v;
}

/** 初回に1回だけ実行：自動実行（トリガー）を登録して、すぐに1回同期する */
function setup() {
  if (!prop_('SLACK_BOT_TOKEN')) throw new Error('スクリプトプロパティ SLACK_BOT_TOKEN を設定してください');
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncSlack').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('remindUnanswered').timeBased().atHour(9).everyDays(1).inTimezone('Asia/Tokyo').create();
  syncSlack();
}

/** チャンネルを読み、スレッドごとの対応状況を Firestore に保存する（1時間ごとに自動実行） */
function syncSlack() {
  const started = new Date();
  try {
    const channel = prop_('SLACK_CHANNEL_ID');
    const oldest = (Date.now() / 1000 - Number(prop_('LOOKBACK_DAYS')) * 86400).toFixed(0);
    const team = slack_('auth.test', {});
    const base = (team.url || '').replace(/\/$/, '');

    const parents = [];
    let cursor = '';
    do {
      const res = slack_('conversations.history', { channel, oldest, limit: 200, cursor });
      (res.messages || []).forEach(m => {
        // 参加通知・Bot投稿・スレッド内の返信は対象外
        if (m.subtype && m.subtype !== 'thread_broadcast') return;
        if (m.bot_id) return;
        if (m.thread_ts && m.thread_ts !== m.ts) return;
        parents.push(m);
      });
      cursor = res.response_metadata && res.response_metadata.next_cursor;
    } while (cursor);

    const users = {};
    const writes = parents.map(p => {
      const replies = p.reply_count ? fetchReplies_(channel, p.ts).filter(r => r.ts !== p.ts && !r.bot_id && !r.subtype) : [];
      const asker = p.user;
      const byUser = {};
      let firstReplyTs = null;
      replies.forEach(r => {
        if (!r.user || r.user === asker) return;
        if (!firstReplyTs) firstReplyTs = r.ts;
        const checked = (r.reactions || []).some(x => CHECK_REACTIONS.includes(x.name) && (x.users || []).includes(asker));
        byUser[r.user] = byUser[r.user] || { id: r.user, count: 0, checked: false };
        byUser[r.user].count++;
        if (checked) byUser[r.user].checked = true;
      });
      const parentChecked = (p.reactions || []).some(x => CHECK_REACTIONS.includes(x.name) && (x.users || []).includes(asker));
      const responders = Object.values(byUser).map(r => Object.assign(r, userInfo_(r.id, users)));
      const resolved = responders.some(r => r.checked) || (parentChecked && responders.length > 0);
      const askerInfo = userInfo_(asker, users);
      const lastTs = replies.length ? replies[replies.length - 1].ts : p.ts;
      return {
        id: p.ts.replace('.', '_'),
        data: {
          ts: p.ts,
          text: String(p.text || '').slice(0, 400),
          url: base ? base + '/archives/' + channel + '/p' + p.ts.replace('.', '') : '',
          askerId: asker || '',
          askerName: askerInfo.name,
          askerEmail: askerInfo.email,
          createdAt: tsToDate_(p.ts),
          lastActivityAt: tsToDate_(lastTs),
          replyCount: replies.length,
          firstReplyMinutes: firstReplyTs ? Math.round((Number(firstReplyTs) - Number(p.ts)) / 60) : null,
          responders: responders,
          status: resolved ? 'resolved' : responders.length ? 'answered' : 'unanswered',
          syncedAt: started,
        },
      };
    });

    for (let i = 0; i < writes.length; i += 400) {
      firestoreCommit_(writes.slice(i, i + 400).map(w => ({ path: 'aiStudy_slackThreads/' + w.id, data: w.data })));
    }
    writeStatus_({ ok: true, threads: writes.length, error: '', lastSyncAt: started, channelId: channel });
  } catch (e) {
    console.error(e);
    writeStatus_({ ok: false, threads: 0, error: String(e.message || e).slice(0, 300), lastSyncAt: started, channelId: prop_('SLACK_CHANNEL_ID') });
    throw e;
  }
}

/** 未回答の質問をチャンネルでお知らせする（REMIND_UNANSWERED=true のときだけ。毎朝9時） */
function remindUnanswered() {
  if (prop_('REMIND_UNANSWERED') !== 'true') return;
  const channel = prop_('SLACK_CHANNEL_ID');
  const limitSec = Date.now() / 1000 - Number(prop_('REMIND_AFTER_HOURS')) * 3600;
  const res = slack_('conversations.history', { channel, oldest: (Date.now() / 1000 - 14 * 86400).toFixed(0), limit: 200 });
  const open = (res.messages || []).filter(m => !m.subtype && !m.bot_id && !m.reply_count && Number(m.ts) < limitSec);
  if (!open.length) return;
  const team = slack_('auth.test', {});
  const links = open.slice(0, 10).map(m => '• ' + (team.url || '').replace(/\/$/, '') + '/archives/' + channel + '/p' + m.ts.replace('.', ''));
  slack_('chat.postMessage', { channel, text: ':raising_hand: まだ回答がない質問があります。分かる方はスレッドで返信をお願いします！\n' + links.join('\n') }, 'post');
}

/* ---------------- Slack ---------------- */
function slack_(method, params, httpMethod) {
  const token = prop_('SLACK_BOT_TOKEN');
  const opts = { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true };
  let url = 'https://slack.com/api/' + method;
  if (httpMethod === 'post') {
    opts.method = 'post'; opts.contentType = 'application/json; charset=utf-8'; opts.payload = JSON.stringify(params);
  } else {
    const q = Object.keys(params).filter(k => params[k] !== '' && params[k] != null).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
    if (q) url += '?' + q;
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = UrlFetchApp.fetch(url, opts);
    if (r.getResponseCode() === 429) { Utilities.sleep(1000 * (Number(r.getHeaders()['Retry-After']) || 5)); continue; }
    const body = JSON.parse(r.getContentText());
    if (!body.ok) throw new Error('Slack ' + method + ': ' + body.error);
    return body;
  }
  throw new Error('Slack ' + method + ': rate limited');
}
function fetchReplies_(channel, ts) {
  const out = [];
  let cursor = '';
  do {
    const res = slack_('conversations.replies', { channel, ts, limit: 200, cursor });
    out.push.apply(out, res.messages || []);
    cursor = res.response_metadata && res.response_metadata.next_cursor;
    Utilities.sleep(250);
  } while (cursor);
  return out;
}
function userInfo_(id, cache) {
  if (!id) return { name: '', email: '' };
  if (!cache[id]) {
    try {
      const u = slack_('users.info', { user: id }).user;
      cache[id] = { name: (u.profile && (u.profile.real_name || u.profile.display_name)) || u.name || '', email: ((u.profile && u.profile.email) || '').toLowerCase() };
    } catch (e) { cache[id] = { name: '', email: '' }; }
  }
  return { name: cache[id].name, email: cache[id].email };
}
function tsToDate_(ts) { return new Date(Number(ts) * 1000); }

/* ---------------- Firestore（REST） ---------------- */
function firestoreBase_() {
  return 'https://firestore.googleapis.com/v1/projects/' + prop_('FIREBASE_PROJECT_ID') + '/databases/(default)/documents';
}
function firestoreCommit_(docs) {
  const name = p => 'projects/' + prop_('FIREBASE_PROJECT_ID') + '/databases/(default)/documents/' + p;
  const payload = { writes: docs.map(d => ({ update: { name: name(d.path), fields: toFields_(d.data) } })) };
  const r = UrlFetchApp.fetch(firestoreBase_() + ':commit', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(payload), muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 300) throw new Error('Firestore ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
}
function writeStatus_(data) {
  try { firestoreCommit_([{ path: 'aiStudy_slackSync/status', data: data }]); } catch (e) { console.error(e); }
}
function toFields_(obj) {
  const f = {};
  Object.keys(obj).forEach(k => { f[k] = toValue_(obj[k]); });
  return f;
}
function toValue_(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue_) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object') return { mapValue: { fields: toFields_(v) } };
  return { stringValue: String(v) };
}
