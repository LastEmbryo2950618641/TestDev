const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadIdentityActions(overrides = {}) {
  const context = {
    console: { warn() {}, log() {}, error() {} },
    window: {
      GameModules: {
        characterStateStore: {
          get(id, store) {
            return store.rpgStates?.[id] || null;
          },
          resolve() {
            return null;
          },
          mergeOntoLive() {},
          async save() {},
        },
        currentLocationField: {
          fromCharacterState() {
            return '';
          },
          normalize(value) {
            return String(value || '').trim();
          },
          isRecordedLocation(value) {
            return value === 'loc';
          },
          buildSceneProfileLocation() {
            return 'loc';
          },
        },
        realWorldMapFog: {
          writeCharacterProfileLocation() {
            throw new Error('boom');
          },
        },
        progression: {
          ensureStateMechanics() {
            return false;
          },
        },
        ...overrides,
      },
    },
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish', 'identity-app-actions.js'), 'utf8'), context);
  return context.window.GameModules.identityAppActions;
}

test('openIdentityApp still opens when pre-processing throws', async () => {
  const actions = loadIdentityActions();
  const store = {
    rpgStates: {
      'rel-1': { id: 'rel-1', profile: { currentLocation: '' } },
    },
    characterRosterState: { open: true, selectedKey: 'k', tab: 'role' },
    ensureIdentityMetricSources() {
      return this.rpgStates['rel-1'];
    },
    appearingLocationById: {},
    characterSchedules: {},
    identityAppOpen: false,
    identityReturnTo: '',
    identityTargetId: '',
    desktopUnlocked: false,
    ...actions,
  };

  await store.openIdentityApp('rel-1', 'character-roster');

  assert.strictEqual(store.identityAppOpen, true);
  assert.strictEqual(store.identityTargetId, 'rel-1');
  assert.strictEqual(store.identityReturnTo, 'character-roster');
  assert.strictEqual(store.desktopUnlocked, true);
  assert.strictEqual(store.characterRosterState.open, false);
});

test('openIdentityApp switches UI immediately even if background save hangs', async () => {
  const actions = loadIdentityActions({
    progression: {
      ensureStateMechanics() {
        return true;
      },
    },
    characterStateStore: {
      get(id, store) {
        return store.rpgStates?.[id] || null;
      },
      resolve() {
        return null;
      },
      mergeOntoLive() {},
      save() {
        return new Promise(() => {});
      },
    },
  });

  const store = {
    rpgStates: {
      'rel-2': { id: 'rel-2', profile: { currentLocation: '' } },
    },
    characterRosterState: { open: true, selectedKey: 'k', tab: 'role' },
    ensureIdentityMetricSources() {
      return this.rpgStates['rel-2'];
    },
    appearingLocationById: {},
    characterSchedules: {},
    identityAppOpen: false,
    identityReturnTo: '',
    identityTargetId: '',
    desktopUnlocked: false,
    ...actions,
  };

  const promise = store.openIdentityApp('rel-2', 'character-roster');

  assert.strictEqual(store.identityAppOpen, true);
  assert.strictEqual(store.identityTargetId, 'rel-2');
  assert.strictEqual(store.identityReturnTo, 'character-roster');
  assert.strictEqual(store.desktopUnlocked, true);
  assert.strictEqual(store.characterRosterState.open, false);

  await promise;
});
