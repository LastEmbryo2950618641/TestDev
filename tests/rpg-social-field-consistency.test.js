const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let orgSyncCalls = 0;
const context = vm.createContext({
  console,
  Date,
  window: {
    GameModules: {
      orgTerritory: {
        syncCharacterOrgMemberships() {
          orgSyncCalls += 1;
        },
      },
    },
  },
});
context.window.window = context.window;
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'publish', 'rpg-state.js'), 'utf8'),
  context,
  { filename: 'publish/rpg-state.js' },
);

const api = context.window.GameModules.rpgState;
const json = (value) => JSON.parse(JSON.stringify(value));
const profileFactions = [{ faction: '角色卡社群', role: '成员', reason: '角色卡事实。' }];
const profileMemberships = [{ orgName: '角色卡组织', title: '成员', reason: '角色卡事实。' }];
const state = {
  id: 'demo',
  profile: {
    name: '测试角色',
    factions: profileFactions,
    memberships: profileMemberships,
    certificates: [{ orgName: '认证组织', field: '测试领域', level: '一级', reason: '角色卡事实。' }],
    titles: [{ society: '认可群体', field: '测试领域', title: '测试称号', reason: '角色卡事实。' }],
  },
  values: { factions: [], memberships: [] },
};

assert.strictEqual(api.syncSocialFields(state, 'profile', { phoneDateText: () => '2026-07-27 12:00' }), true);
assert.deepStrictEqual(json(state.values.factions), json(profileFactions));
assert.deepStrictEqual(json(state.values.memberships), json(profileMemberships));
assert.notStrictEqual(state.profile.factions, state.values.factions);
assert.notStrictEqual(state.profile.memberships, state.values.memberships);
assert.ok(!Object.prototype.hasOwnProperty.call(state.values, 'certificates'));
assert.ok(!Object.prototype.hasOwnProperty.call(state.values, 'titles'));
assert.strictEqual(state.profile.roleCardUpdatedAt, '2026-07-27 12:00');

const valueFactions = [{ faction: '结算社群', role: '协调人', reason: '本轮结算确认。' }];
const valueMemberships = [{ orgName: '结算组织', title: '负责人', reason: '本轮结算确认。' }];
state.values.factions = valueFactions;
state.values.memberships = valueMemberships;
assert.strictEqual(api.syncSocialFields(state, 'values', { phoneDateText: () => '2026-07-27 12:01' }), true);
assert.deepStrictEqual(json(state.profile.factions), json(valueFactions));
assert.deepStrictEqual(json(state.profile.memberships), json(valueMemberships));
assert.notStrictEqual(state.profile.factions, state.values.factions);
assert.notStrictEqual(state.profile.memberships, state.values.memberships);

state.values.factions = [];
state.values.memberships = [];
assert.strictEqual(api.syncSocialFields(state, 'values', { phoneDateText: () => '2026-07-27 12:02' }), true);
assert.deepStrictEqual(json(state.profile.factions), []);
assert.deepStrictEqual(json(state.profile.memberships), []);
assert.deepStrictEqual(json(state.values.factions), []);
assert.deepStrictEqual(json(state.values.memberships), []);
assert.ok(orgSyncCalls >= 2);

console.log('PASS profile and RPG social fields stay consistent with explicit source direction');
