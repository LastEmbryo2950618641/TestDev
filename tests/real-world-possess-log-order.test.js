const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadSqliteRealWorldLog() {
  const windowObj = { GameModules: { sqliteSave: {
    migrate() {},
    readFallbackState() { return {}; },
    db: null,
    fallback: true,
    fallbackState: { realWorldLogEntries: {} },
    async persist() {},
  } } };
  windowObj.window = windowObj;
  const context = vm.createContext({ console, window: windowObj });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/platform/storage/sqlite/real-world-log.js'), 'utf8'), context);
  return context.window.GameModules.sqliteSave;
}

test('online possess system logs sort by timestamp extracted from id, not after later actions', () => {
  const save = loadSqliteRealWorldLog();
  const possessTs = 1780000000000;
  const actionTs = possessTs + 60_000;
  const possess = { id: `possess-${possessTs}`, type: 'system', text: '你已上线附身控制刘思琪。' };
  const user = { id: `real-${actionTs}-abc-user`, type: 'user', text: '我观察了周围', createdAt: new Date(actionTs).toISOString() };
  const ai = { id: `real-${actionTs}-abc-ai`, type: 'ai', narration: '你环顾四周。', createdAt: new Date(actionTs + 1).toISOString() };
  const sorted = save.sortedRealWorldLogEntries([user, ai, possess]);
  assert.deepStrictEqual(sorted.map((entry) => entry.type), ['system', 'user', 'ai']);
  assert.ok(save.realWorldLogSortKey(possess) < save.realWorldLogSortKey(user));
});
