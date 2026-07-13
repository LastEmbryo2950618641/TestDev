const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const queryPath = path.join(root, 'publish/past-event-query.js');
const querySource = fs.readFileSync(queryPath, 'utf8');
assert.doesNotMatch(querySource, /window\.GameModules\.sqliteSave|\.db\.prepare/u, 'past-event query must use shared stores');

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  const sourceIndex = scripts.indexOf('platform/storage/real-world-log-source.js');
  const storeIndex = scripts.indexOf('real-world-log-store.js');
  const queryIndex = scripts.indexOf('past-event-query.js');
  assert.ok(sourceIndex >= 0 && sourceIndex < storeIndex, `${relativePath} must load realWorldLogSource before realWorldLogStore`);
  assert.ok(storeIndex < queryIndex, `${relativePath} must load realWorldLogStore before past-event query`);
}

const context = vm.createContext({
  window: {
    GameModules: {
      realWorldLogStore: {
        listRecent(limit) {
          assert.strictEqual(limit, 600);
          return [{ id: 'real-1', sceneTitle: 'Scene', createdAt: '2026-07-14T10:00:00Z', text: 'real text' }];
        },
      },
      wechatHistoryStore: {
        listRecent(contactId, limit) {
          assert.strictEqual(contactId, 'c1');
          assert.strictEqual(limit, 300);
          return [{ contactId: 'c1', createdAt: '2026-07-14T11:00:00Z', message: { side: 'self', text: 'wechat text' } }];
        },
      },
    },
  },
});
vm.runInContext(querySource, context, { filename: 'past-event-query.js' });
const query = context.window.GameModules.pastEventQuery;
const realRows = query.realRows();
const wechatRows = query.wechatRows({}, { contactId: 'c1' });
assert.strictEqual(realRows[0].title, 'Scene');
assert.strictEqual(realRows[0].time, '2026-07-14T10:00:00Z');
assert.strictEqual(wechatRows[0].text, 'wechat text');
assert.strictEqual(wechatRows[0].time, '2026-07-14T11:00:00Z');

const calls = [];
const sourceContext = vm.createContext({
  window: {
    GameModules: {
      sqliteSave: {
        listRecentRealWorldLogEntries(limit) { calls.push(['real', limit]); return [{ id: 'real-1' }]; },
        db: {
          run() {},
          prepare(sql) {
            calls.push(['wechatSql', sql]);
            let stepped = false;
            return {
              bind(params) { calls.push(['wechatBind', params]); },
              step() { if (stepped) return false; stepped = true; return true; },
              getAsObject() { return { contact_id: 'c1', message_json: JSON.stringify({ text: 'stored' }), created_at: '2026-07-14T11:00:00Z' }; },
              free() { calls.push(['free']); },
            };
          },
        },
      },
    },
  },
});
for (const relativePath of [
  'publish/platform/storage/real-world-log-source.js',
  'publish/real-world-log-store.js',
  'publish/platform/storage/wechat-history-source.js',
  'publish/wechat-history-store.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), sourceContext, { filename: relativePath });
}
assert.deepStrictEqual(JSON.parse(JSON.stringify(sourceContext.window.GameModules.realWorldLogStore.listRecent(600))), [{ id: 'real-1' }]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(sourceContext.window.GameModules.wechatHistoryStore.listRecent('c1', 300))), [{ contactId: 'c1', message: { text: 'stored' }, createdAt: '2026-07-14T11:00:00Z' }]);
assert.ok(calls.some(([name, sql]) => name === 'wechatSql' && /WHERE contact_id=\? ORDER BY created_at DESC LIMIT \?/u.test(sql)));
assert.deepStrictEqual(JSON.parse(JSON.stringify(calls.find(([name]) => name === 'wechatBind')[1])), ['c1', 300]);

console.log('PASS past-event query uses recent log and WeChat store records');
