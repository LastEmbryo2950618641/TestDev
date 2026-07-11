import fs from 'node:fs';
import vm from 'node:vm';

const storeState = {
  rows: [
    { id: 'rw-1', text: 'hello', narration: 'world', type: 'ai' },
  ],
};

const context = {
  console,
  window: {
    GameModules: {
      platform: {
        storage: {
          realWorldLogSource: {
            append(entry = {}) {
              storeState.rows.push(entry);
              return entry;
            },
            get(id = '') {
              return storeState.rows.find((item) => item.id === id) || null;
            },
            list() {
              return storeState.rows.slice();
            },
            saveAll(entries = []) {
              storeState.rows = entries.slice();
              return storeState.rows;
            },
            count() {
              return storeState.rows.length;
            },
          },
        },
      },
    },
  },
};
context.window.window = context.window;
context.GameModules = context.window.GameModules;
vm.createContext(context);
vm.runInContext(fs.readFileSync('./publish/real-world-log-store.js', 'utf8'), context);

const api = context.window.GameModules.realWorldLogStore;
process.stdout.write(
  JSON.stringify(
    {
      runtimeFamily: 'real-world-log-store-verify',
      initialCount: api.count(),
      firstEntryId: api.get('rw-1')?.id || null,
      listSize: api.list(1, 20).length,
      appendWorks: Boolean(api.append({ id: 'rw-2', text: 'next' })),
      nextCount: api.count(),
    },
    null,
    2,
  ) + '\n',
);
