const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const context = {
  console,
  window: {
    GameModules: {
      currentLocationField: {
        normalize(value) {
          return String(value || '').trim();
        },
      },
      characterReasonFallback: {
        apply(profile) {
          return profile;
        },
      },
      professionInfo: {
        normalizeJobName(value) {
          return String(value || '').trim();
        },
      },
      progression: {
        schemaSections() {
          return [];
        },
      },
      characterSocialDrive: {
        normalizeForRoleCard() {
          return null;
        },
        empty() {
          return null;
        },
      },
      playerAspirationPreferenceLayers: {
        ensureOnProfile() {},
      },
    },
  },
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'publish', 'character-profile.js'), 'utf8'), context);

const profileTool = context.window.GameModules.characterProfile;
const location = '中华人民共和国·四川省·成都市武侯区·锦苑小区3栋·2单元601号';
const validated = profileTool.validate({
  name: '刘悠',
  gender: '男',
  age: 27,
  worldTag: '2026 现代都市现实世界',
  relationships: '本人：刘悠',
  role: '程序工程师',
  currentLocation: location,
  detail: '玩家本人。',
  appearance: '黑发。',
  preferences: '简约。',
  personality: '沉稳。',
  factions: [],
  memberships: [],
  skills: [],
  knowledge: [],
  professions: [],
}, {
  id: 'player-self',
  name: '刘悠',
  isPlayer: true,
  work: '2026 现代都市现实世界',
}, {}, null, null, { skipInitialMetrics: true });

assert.strictEqual(validated.currentLocation, location);

const inherited = profileTool.validate({
  name: '刘悠',
  gender: '男',
  age: 27,
  worldTag: '2026 现代都市现实世界',
  relationships: '本人：刘悠',
  role: '程序工程师',
  detail: '玩家本人。',
  appearance: '黑发。',
  preferences: '简约。',
  personality: '沉稳。',
  factions: [],
  memberships: [],
  skills: [],
  knowledge: [],
  professions: [],
}, {
  id: 'player-self',
  name: '刘悠',
  isPlayer: true,
  work: '2026 现代都市现实世界',
  currentLocation: location,
}, {}, null, null, { skipInitialMetrics: true });

assert.strictEqual(inherited.currentLocation, location);

console.log('PASS character profile preserves currentLocation');
