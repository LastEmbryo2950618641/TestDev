const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function load(rel, context) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
}

const context = vm.createContext({
  window: { GameModules: {} },
  Date,
  Math,
  String,
  Array,
  Object,
  Boolean,
  Number,
  JSON,
  Promise,
  console,
});

load('publish/character-social-drive.js', context);
load('publish/character-intro-card.js', context);
load('publish/character-roster-actions.js', context);

const savedIntros = [];
context.window.GameModules.characterIntroStore = {
  list: () => [{
    id: 'intro-e',
    name: '钱进',
    worldTag: '2026 现代都市现实世界',
    identity: { role: '同事' },
    persona: { background: '同事', appearance: '', personality: '' },
    social: { relationToPlayer: '同事', familiarity: 40, reach: ['call'] },
    agenda: { short: '问报表', needPlayer: true, needPlayerWhy: '发文件', urgency: 0.6 },
    links: { roleCardId: '', scheduleId: 'intro-e' },
    meta: { solidifyStatus: 'none', source: 'scene' },
  }],
  get(name) { return this.list().find((c) => c.name === name) || null; },
  save(card) { savedIntros.push(card); return Promise.resolve(card); },
};

context.window.GameModules.characterStateStore = {
  list() {
    return [{
      id: 'npc-a',
      name: '陈默',
      profile: {
        name: '陈默',
        work: '2026 现代都市现实世界',
        socialDrive: {
          relationToPlayer: '普通同事',
          agenda: { short: '赶方案', needPlayer: true, urgency: 0.7 },
        },
      },
    }];
  },
};

const store = {
  rpgStates: {},
  characterRosterState: null,
  desktopUnlocked: false,
  closeDesktopApps() {},
  closeAppToDesktop() { this.desktopUnlocked = false; },
  openIdentityApp(id, ret) { this._opened = { id, ret }; },
  async solidifySelectedIntroCard() { this._solidified = true; },
};
Object.assign(store, context.window.GameModules.characterRosterActions);

store.openCharacterRosterApp();
assert.ok(store.characterRosterState.open);

const people = store.characterRosterPeople();
assert.ok(people.some((p) => p.name === '陈默' && p.hasRole));
assert.ok(people.some((p) => p.name === '钱进' && p.hasIntro && !p.hasRole));

const qian = people.find((p) => p.name === '钱进');
store.selectCharacterRosterPerson(qian.key);
assert.strictEqual(store.characterRosterState.tab, 'intro');
const rows = store.characterRosterIntroRows(qian.introCard);
assert.ok(rows.some((r) => r.label === '当前事务' && /问报表/.test(r.value)));

const chen = people.find((p) => p.name === '陈默');
store.selectCharacterRosterPerson(chen.key);
assert.strictEqual(store.characterRosterState.tab, 'role');
store.openRosterRoleAsIdentity();
assert.strictEqual(store._opened.id, 'npc-a');
assert.strictEqual(store._opened.ret, 'character-roster');

const solidifySrc = fs.readFileSync(path.join(root, 'publish/solidify-actions.js'), 'utf8');
assert.match(solidifySrc, /roleCardId/);
assert.match(solidifySrc, /solidifyStatus:\s*'solidified'/);

const html = fs.readFileSync(path.join(root, 'publish/index.html'), 'utf8');
assert.match(html, /角色管理/);
assert.match(html, /characterRosterState/);
assert.match(html, /打开身份证（角色卡）/);

const scripts = JSON.parse(fs.readFileSync(path.join(root, 'publish/boot/scripts.json'), 'utf8'));
assert.ok(scripts.includes('character-roster-actions.js'));

console.log('PASS character-roster');
