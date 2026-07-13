const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const relativeScriptPath = 'faction-membership-actions.js';

function run() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'publish', 'boot', 'scripts.json'), 'utf8'));
  assert.ok(manifest.includes(relativeScriptPath), 'faction membership actions must load at runtime');

  const calls = [];
  const context = vm.createContext({
    console,
    Object,
    window: {
      GameModules: {
        orgTerritory: {
          collectFactionMemberships: (_store, faction) => [{ orgName: faction.name, title: '成员' }],
          ensurePresetFamilyMemberships: () => calls.push('preset'),
          syncCharacterOrgMemberships: (state) => calls.push(state.id),
        },
      },
    },
  });
  const source = fs.readFileSync(path.join(root, 'publish', relativeScriptPath), 'utf8');
  vm.runInContext(source, context, { filename: `publish/${relativeScriptPath}` });
  const actions = context.window.GameModules.factionMembershipActions;
  const runtime = {
    ...actions,
    selectedFaction: () => ({ id: 'family-liu', name: '刘家' }),
    rpgStates: { a: { id: 'player-self' }, b: { id: 'npc-1' } },
  };

  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(runtime.factionMembershipRows())),
    [{ orgName: '刘家', title: '成员' }],
  );
  runtime.syncAllCharacterMemberships();
  assert.deepStrictEqual(calls, ['preset', 'player-self', 'npc-1']);

  console.log('PASS faction membership facade preserves member rows and character organization synchronization');
}

run();
