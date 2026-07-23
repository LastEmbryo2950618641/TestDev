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
      platform: {
        storage: {
          characterStateSource: {
            get(id) { return persisted.get(id) ? JSON.parse(JSON.stringify(persisted.get(id))) : null; },
            getByName(name) {
              const hit = [...persisted.values()].find((item) => item.name === name || item.profile?.name === name);
              return hit ? JSON.parse(JSON.stringify(hit)) : null;
            },
            resolve(target) {
              return this.get(target) || this.getByName(target);
            },
            list() {
              return [...persisted.values()].map((item) => JSON.parse(JSON.stringify(item)));
            },
            save(state) {
              persisted.set(state.id, JSON.parse(JSON.stringify(state)));
              return state;
            },
          },
        },
      },
    },
  },
  console,
};
loadScript(context, 'publish/character-state-store.js');
const api = context.window.GameModules.characterStateStore;

const host = {
  rpgStates: {
    'rel-ai-247528': {
      id: 'rel-ai-247528',
      name: '刘思琪',
      profile: { id: 'rel-ai-247528', name: '刘思琪', currentLocation: '' },
      values: {},
    },
  },
};
api.bindLiveHost(host);

persisted.set('rel-ai-247528', {
  id: 'rel-ai-247528',
  name: '刘思琪',
  profile: { id: 'rel-ai-247528', name: '刘思琪', currentLocation: '旧库位置' },
  values: {},
});

const live = api.get('rel-ai-247528');
assert.strictEqual(live, host.rpgStates['rel-ai-247528'], 'get(id) must return live rpgStates object');

const byName = api.getByName('刘思琪');
assert.strictEqual(byName, live, 'getByName must return the same live object');

const staleCopy = {
  id: 'rel-ai-247528',
  name: '刘思琪',
  profile: { id: 'rel-ai-247528', name: '刘思琪', currentLocation: '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601' },
  values: { current_location: { currentLocation: '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601' } },
};
api.save(staleCopy);
assert.strictEqual(host.rpgStates['rel-ai-247528'], live, 'save must keep one live object by id');
assert.strictEqual(
  live.profile.currentLocation,
  '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601',
  'save must merge onto live profile',
);
assert.strictEqual(
  persisted.get('rel-ai-247528').profile.currentLocation,
  '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601',
  'save must persist live profile to storage',
);

const listed = api.list();
assert.strictEqual(listed.length, 1);
assert.strictEqual(listed[0], live, 'list must return live objects only');

console.log('PASS character-state-store id-canonical live registry');
