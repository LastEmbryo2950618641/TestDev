const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'publish', 'platform', 'storage', 'wechat-history-source.js');
const storePath = path.join(root, 'publish', 'wechat-history-store.js');
const helperPath = path.join(root, 'publish', 'app', 'wechat', 'history-context-helpers.js');

assert.ok(fs.existsSync(sourcePath), 'WeChat history platform source must exist');
assert.ok(fs.existsSync(storePath), 'WeChat history shared store must exist');

const helperSource = fs.readFileSync(helperPath, 'utf8');
assert.doesNotMatch(helperSource, /sqliteSave|\.db\.(?:run|prepare)/u, 'WeChat history helper must not access SQLite directly');

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  const sourceIndex = scripts.indexOf('platform/storage/wechat-history-source.js');
  const storeIndex = scripts.indexOf('wechat-history-store.js');
  const helperIndex = scripts.indexOf('app/wechat/history-context-helpers.js');
  assert.ok(sourceIndex >= 0 && sourceIndex < storeIndex, `${relativePath} must load the WeChat history source before its store`);
  assert.ok(storeIndex < helperIndex, `${relativePath} must load the WeChat history store before its application helper`);
}

async function run() {
  const writes = [];
  const bindings = [];
  let persisted = 0;
  let freed = 0;
  const rows = [
    { message_json: JSON.stringify({ text: 'newer' }) },
    { message_json: '{invalid' },
    { message_json: JSON.stringify({ text: 'older' }) },
  ];
  let rowIndex = -1;
  const sqliteSave = {
    db: {
      run(sql, params) { writes.push({ sql, params }); },
      prepare(sql) {
        assert.match(sql, /ORDER BY created_at DESC LIMIT \?/u);
        return {
          bind(params) { bindings.push(params); },
          step() { rowIndex += 1; return rowIndex < rows.length; },
          getAsObject() { return rows[rowIndex]; },
          free() { freed += 1; },
        };
      },
    },
    async persist() { persisted += 1; },
  };
  const context = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    window: { GameModules: { sqliteSave } },
  });

  vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: 'wechat-history-source.js' });
  vm.runInContext(fs.readFileSync(storePath, 'utf8'), context, { filename: 'wechat-history-store.js' });
  const store = context.window.GameModules.wechatHistoryStore;
  const entry = { id: 'row-1', contactId: 'c1', message: { side: 'self', text: 'hello' }, createdAt: '2026-07-14T10:00:00' };

  assert.strictEqual(store.ensure(), true);
  writes.length = 0;
  await store.append(entry);
  assert.match(writes[0].sql, /CREATE TABLE IF NOT EXISTS wechat_history/u);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(writes[1].params)), ['row-1', 'c1', JSON.stringify(entry.message), entry.createdAt]);
  assert.strictEqual(persisted, 1);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(store.list('c1', 12))), [{ text: 'older' }, { text: 'newer' }]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(bindings)), [['c1', 12]]);
  assert.strictEqual(freed, 1);
  assert.strictEqual(context.window.GameModules.platform.core.storage.wechatHistorySource, context.window.GameModules.platform.storage.wechatHistorySource);

  const appended = [];
  context.window.GameModules.wechatHistoryStore = {
    ensure: () => true,
    append: async (value) => { appended.push(value); },
    list: () => [{ text: 'stored' }],
  };
  context.window.GameModules.rpgState = { seed: () => 42 };
  vm.runInContext(helperSource, context, { filename: 'history-context-helpers.js' });
  const helper = context.window.GameModules.app.wechat.historyContextHelpers;
  const message = { side: 'self', text: 'hello', time: '2026-07-14T10:00:00' };
  await helper.saveWechatHistoryRow('c1', message);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(appended)), [{
    id: 'c1_2026-07-14T10:00:00_s_42',
    contactId: 'c1',
    message,
    createdAt: '2026-07-14T10:00:00',
  }]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(helper.listWechatHistoryRows('c1', 12))), [{ text: 'stored' }]);

  console.log('PASS WeChat history uses a shared store and preserves SQLite row behavior');
}

run();
