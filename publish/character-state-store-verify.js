import fs from 'node:fs';
import vm from 'node:vm';

const rows = [
  { id: 'npc-1', name: 'Alice', profile: { name: 'Alice' } },
  { id: 'npc-2', name: 'Bob', profile: { name: 'Bob' } },
];

const context = {
  console,
  window: {
    GameModules: {
      platform: {
        storage: {
          characterStateSource: {
            get(id = '') {
              return rows.find((item) => item.id === id) || null;
            },
            getByName(name = '') {
              return rows.find((item) => item.name === name || item.profile?.name === name) || null;
            },
            resolve(target = '') {
              return this.get(target) || this.getByName(target) || null;
            },
            list() {
              return rows.slice();
            },
            save(state = null) {
              return state;
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
vm.runInContext(fs.readFileSync('./publish/character-state-store.js', 'utf8'), context);

const api = context.window.GameModules.characterStateStore;
process.stdout.write(
  JSON.stringify(
    {
      runtimeFamily: 'character-state-store-verify',
      firstId: api.get('npc-1')?.id || null,
      resolveByName: api.resolve('Bob')?.id || null,
      listSize: api.list().length,
      saveReturnsState: Boolean(api.save({ id: 'npc-3' })?.id === 'npc-3'),
    },
    null,
    2,
  ) + '\n',
);
