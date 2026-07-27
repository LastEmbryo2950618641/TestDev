const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const profile = {
  id: 'player-self',
  name: '测试玩家',
  work: '测试世界',
  factions: [{ faction: '测试社群', role: '成员', reason: '角色卡事实。' }],
  memberships: [{ orgName: '测试组织', title: '成员', reason: '角色卡事实。' }],
  certificates: [{ orgName: '认证组织', field: '测试领域', level: '一级', reason: '角色卡事实。' }],
  titles: [{ society: '认可群体', field: '测试领域', title: '测试称号', reason: '角色卡事实。' }],
};
const state = { id: 'player-self', profile, values: {} };
const context = vm.createContext({
  console,
  window: {
    GameModules: {
      currentLocationField: { displayFromCharacterState: () => '' },
      characterStateStore: { get: () => state, mergeOntoLive: () => state },
      characterSocialDrive: { presenceKindLabel: () => '具体的一个人' },
    },
  },
});
context.window.window = context.window;
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'publish', 'player-identity-actions.js'), 'utf8'),
  context,
  { filename: 'publish/player-identity-actions.js' },
);

const store = {
  ...context.window.GameModules.playerIdentityActions,
  identityTargetId: 'player-self',
  rpgStates: { 'player-self': state },
  roleCardReasonGetter: () => () => '角色卡事实。',
};
const fields = store.identityTargetFields();
const byLabel = (label) => fields.find((field) => field.label === label);

[
  ['社群角色', 'factions'],
  ['人事归属', 'memberships'],
  ['证书', 'certificates'],
  ['称号', 'titles'],
].forEach(([label, profileListKey]) => {
  const field = byLabel(label);
  assert.ok(field, `${label} should be emitted from the role card profile`);
  assert.strictEqual(field.profileListKey, profileListKey, `${label} should declare its profile list key`);
  assert.strictEqual(field.raw, profile[profileListKey], `${label} should read the profile array directly`);
});

console.log('PASS player identity profile list fields expose explicit list metadata');
