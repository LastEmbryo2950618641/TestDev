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
  }, {
    id: 'intro-old-chen',
    name: '陈默',
    worldTag: '2026 现代都市现实世界',
    identity: { role: '旧介绍卡' },
    social: {},
    agenda: {},
    links: { roleCardId: '', scheduleId: 'intro-old-chen' },
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
    }, {
      id: 'npc-b',
      name: '林舟',
      profile: {
        name: '林舟',
        work: '2026 现代都市现实世界',
        relationships: '姐姐：刘悠；同学：周末',
        socialDrive: { agenda: {} },
      },
    }];
  },
};

const store = {
  rpgStates: { 'player-self': { profile: { name: '刘悠' } } },
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
assert.strictEqual(chen.hasIntro, false, '完整角色卡存在时不重复展示同名旧介绍卡');
store.selectCharacterRosterPerson(chen.key);
assert.strictEqual(store.characterRosterState.tab, 'role');
store.openRosterRoleAsIdentity();
assert.strictEqual(store._opened?.id || store.identityTargetId, 'npc-a');
assert.strictEqual(store._opened?.ret || store.identityReturnTo, 'character-roster');

const lin = people.find((p) => p.name === '林舟');
assert.strictEqual(lin.relation, '姐姐', '完整角色卡应回退展示已存的人际关系');

const solidifySrc = fs.readFileSync(path.join(root, 'publish/solidify-actions.js'), 'utf8');
assert.match(solidifySrc, /roleCardId/);
assert.match(solidifySrc, /solidifyStatus:\s*'solidified'/);

const html = fs.readFileSync(path.join(root, 'publish/index.html'), 'utf8');
assert.match(html, /角色管理/);
assert.match(html, /characterRosterState/);
assert.match(html, /openRosterRoleAsIdentity/);

const stage5 = fs.readFileSync(path.join(root, 'publish/inference/intro-card-stage-update.js'), 'utf8');
assert.match(stage5, /narrationParticipants/u, 'Stage5 应从正文角色标签识别更新对象');
assert.match(stage5, /applyRoleDriveOps/u, 'Stage5 应写入完整角色卡的社交驱动');
assert.match(stage5, /stateStore\?\.save/u, '完整角色卡社交驱动更新必须持久化');

const loop = fs.readFileSync(path.join(root, 'publish/real-world-agent-loop.js'), 'utf8');
assert.match(loop, /Stage4-13 社交驱动/u, '社交驱动必须在 Stage4 末尾执行');
assert.match(loop, /Stage4-14 角色想法补足/u, '想法补足必须作为独立的 Stage4 后续步骤执行');
assert.match(loop, /runRoleDriveAfterStage4/u, '主循环必须调用 Stage4 社交驱动结算');

const scripts = JSON.parse(fs.readFileSync(path.join(root, 'publish/boot/scripts.json'), 'utf8'));
assert.ok(scripts.includes('character-roster-actions.js'));

console.log('PASS character-roster');
