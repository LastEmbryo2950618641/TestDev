const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
function loadScript(context, relativePath) {
  vm.runInNewContext(read(relativePath), context, { filename: relativePath });
}

const persisted = new Map();
const context = {
  window: {
    Alpine: { store() { return null; } },
    GameModules: {
      realWorld2026: { label: '2026 现代都市现实世界' },
      currentLocationField: null,
      characterStateStore: null,
      rpgState: {
        async ensureSchema(worldTag) { return { worldTag, sections: [] }; },
        createCharacterState(profile, schema) {
          return { id: profile.id, name: profile.name, profile: { ...profile }, values: {}, schema, worldTag: schema.worldTag };
        },
        upgradeCharacterState() {},
      },
      rpgLexicon: { async syncState() {} },
      rpgProfileMetrics: { rebase() {} },
      orgTerritory: { ensurePresetFamilyMemberships() {} },
      platform: {
        storage: {
          capabilities: { isReady() { return true; } },
          characterStateSource: {
            get(id) { return persisted.get(id) ? JSON.parse(JSON.stringify(persisted.get(id))) : null; },
            getByName(name) {
              const hit = [...persisted.values()].find((item) => item.name === name || item.profile?.name === name);
              return hit ? JSON.parse(JSON.stringify(hit)) : null;
            },
            list() { return [...persisted.values()].map((item) => JSON.parse(JSON.stringify(item))); },
            save(state) {
              persisted.set(state.id, JSON.parse(JSON.stringify(state)));
              return state;
            },
          },
        },
      },
      characterProfile: { hasRequiredInitialMetrics() { return false; } },
    },
  },
  console,
};

loadScript(context, 'publish/current-location-field.js');
loadScript(context, 'publish/character-state-store.js');
loadScript(context, 'publish/predefined-role-cards.js');

context.window.GameModules.currentLocationField = context.window.GameModules.currentLocationField;
context.window.GameModules.characterStateStore = context.window.GameModules.characterStateStore;

const storeApi = context.window.GameModules.characterStateStore;
const cardsApi = context.window.GameModules.predefinedRoleCards;
const full = '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601室内客厅沙发';

const host = {
  rpgStates: {
    'rel-ai-247528': {
      id: 'rel-ai-247528',
      name: '刘思琪',
      profile: { id: 'rel-ai-247528', name: '刘思琪', currentLocation: full, work: '2026 现代都市现实世界' },
      values: {
        current_location: {
          name: '锦苑小区3栋',
          currentLocation: full,
        },
      },
      worldTag: '2026 现代都市现实世界',
    },
  },
  characterSchedules: {
    'rel-ai-247528': { profileCurrentLocation: full, characterName: '刘思琪' },
  },
  initFactionSystem() {},
};
storeApi.bindLiveHost(host);
persisted.set('rel-ai-247528', JSON.parse(JSON.stringify(host.rpgStates['rel-ai-247528'])));

(async () => {
  const rebuilt = await cardsApi.createState(
    { id: 'rel-ai-247528', name: '刘思琪', work: '2026 现代都市现实世界', role: '妹妹', detail: 'test' },
    host,
    'rel-ai-247528',
  );

  assert.strictEqual(
    rebuilt.profile.currentLocation,
    full,
    'createState must preserve runtime currentLocation',
  );
  assert.strictEqual(
    host.rpgStates['rel-ai-247528'].profile.currentLocation,
    full,
    'live rpgStates must keep currentLocation after rebuild',
  );
  assert.strictEqual(
    host.rpgStates['rel-ai-247528'].values.current_location,
    undefined,
    'values.current_location must not be recreated',
  );

  console.log('PASS createState preserves currentLocation');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
