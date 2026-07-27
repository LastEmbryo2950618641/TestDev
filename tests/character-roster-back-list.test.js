const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadRosterActions() {
  const context = {
    console,
    Date,
    window: {
      GameModules: {
        characterStateStore: {
          list(store) {
            return Object.values(store.rpgStates || {});
          },
        },
        characterIntroStore: {
          list() {
            return [];
          },
        },
        characterSocialDrive: {
          isSharedCharacterId() {
            return false;
          },
        },
        characterIntroCard: {
          isIncompleteRoleStub() {
            return false;
          },
        },
      },
    },
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish', 'character-roster-actions.js'), 'utf8'), context);
  return context.window.GameModules.characterRosterActions;
}

test('clearCharacterRosterSelection suppresses immediate reselection', () => {
  const actions = loadRosterActions();
  const realNow = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    const store = {
      characterRosterState: { open: true, query: '', message: '', selectedKey: '2026::刘思琪', suppressSelectUntil: 0, tab: 'role' },
      rpgStates: {
        'rel-ai-247528': {
          id: 'rel-ai-247528',
          name: '刘思琪',
          profile: { id: 'rel-ai-247528', name: '刘思琪', work: '2026', socialDrive: {} },
        },
      },
      ...actions,
    };

    const beforeClear = store.characterRosterState;
    store.clearCharacterRosterSelection();
    assert.notStrictEqual(store.characterRosterState, beforeClear, 'state object should be replaced to trigger UI refresh');
    assert.strictEqual(store.characterRosterState.selectedKey, '');
    assert.ok(store.characterRosterState.suppressSelectUntil > now);

    store.selectCharacterRosterPerson('2026::刘思琪');
    assert.strictEqual(store.characterRosterState.selectedKey, '', 'same-click reselection should be ignored');

    now = 2000;
    const beforeSelect = store.characterRosterState;
    store.selectCharacterRosterPerson('2026::刘思琪');
    assert.notStrictEqual(store.characterRosterState, beforeSelect, 'selection should also replace state object');
    assert.strictEqual(store.characterRosterState.selectedKey, '2026::刘思琪');
  } finally {
    Date.now = realNow;
  }
});

test('openRosterRoleAsIdentity switches to identity shell immediately', () => {
  const actions = loadRosterActions();
  let shellArgs = null;
  let hydrateArgs = null;
  const store = {
    characterRosterState: { open: true, query: '', message: '', selectedKey: '2026::刘思琪', suppressSelectUntil: 0, tab: 'role' },
    rpgStates: {
      'rel-ai-247528': {
        id: 'rel-ai-247528',
        name: '刘思琪',
        profile: {
          id: 'rel-ai-247528',
          name: '刘思琪',
          work: '2026',
          socialDrive: { relationToPlayer: '妹妹', agenda: { short: '备考' } },
        },
      },
    },
    showIdentityAppShell(id, returnTo) {
      shellArgs = [id, returnTo];
    },
    hydrateIdentityTargetForApp(id) {
      hydrateArgs = [id];
      return Promise.resolve();
    },
    ...actions,
  };

  store.openRosterRoleAsIdentity();

  assert.strictEqual(store.characterRosterState.open, false);
  assert.deepStrictEqual(shellArgs, ['rel-ai-247528', 'character-roster']);
  assert.deepStrictEqual(hydrateArgs, ['rel-ai-247528']);
});
