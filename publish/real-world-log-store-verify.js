const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const storeState = {
  rows: [
    { id: 'rw-1', text: 'hello', narration: 'world', type: 'ai' },
  ],
};

const context = {
  console,
  window: {
    GameModules: {
      sqliteSave: {
        saveRealWorldLogEntry(entry = {}) {
          storeState.rows.push(entry);
          return entry;
        },
        getRealWorldLogEntry(id = '') {
          return storeState.rows.find((item) => item.id === id) || null;
        },
        deleteRealWorldLogEntry(id = '') {
          storeState.rows = storeState.rows.filter((item) => item.id !== id);
        },
        listRealWorldLogEntries() {
          return storeState.rows.slice();
        },
        saveRealWorldLogEntries(entries = []) {
          storeState.rows = entries.slice();
          return storeState.rows;
        },
        countRealWorldLogEntries() {
          return storeState.rows.length;
        },
      },
    },
  },
};
context.window.window = context.window;
context.GameModules = context.window.GameModules;
vm.createContext(context);
vm.runInContext(fs.readFileSync('./publish/platform/storage/real-world-log-source.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('./publish/real-world-log-store.js', 'utf8'), context);

const api = context.window.GameModules.realWorldLogStore;
assert.equal(api.count(), 1);
api.remove('rw-1');
assert.equal(api.get('rw-1'), null);
assert.equal(api.list(1, 20).length, 0);
assert.ok(api.append({ id: 'rw-2', text: 'next' }));
assert.equal(api.count(), 1);

const report = {
  runtimeFamily: 'real-world-log-store-verify',
  initialCount: 1,
  removedEntryMissing: true,
  listSizeAfterRemove: 0,
  appendWorks: true,
  nextCount: 1,
};
process.stdout.write(
  JSON.stringify(report, null, 2) + '\n',
);
