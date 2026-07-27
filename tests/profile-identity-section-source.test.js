const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = vm.createContext({
  console,
  window: {
    GameModules: {
      initPromptRegistry: { uiFor: () => ({}), fields: () => [] },
    },
  },
});
context.window.window = context.window;
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish', 'rpg-field-ui.js'), 'utf8'), context, { filename: 'publish/rpg-field-ui.js' });

const ui = context.window.GameModules.rpgFieldUi;
const state = {
  id: 'demo',
  worldTag: '测试世界',
  profile: { name: '测试角色', work: '测试世界' },
  values: {
    world_tag: 'RPG世界',
    age: 99,
    factions: [{ faction: 'RPG社群', role: '成员', reason: 'RPG值。' }],
    memberships: [{ orgName: 'RPG组织', title: '成员', reason: 'RPG值。' }],
  },
};
const identityFields = [
  { key: 'id-demo-name', label: '姓名', value: '测试角色', raw: '测试角色', profileGroup: '', stateId: 'demo' },
  { key: 'id-demo-age', label: '年龄', value: 18, raw: 18, profileGroup: '', stateId: 'demo' },
  { key: 'id-demo-certificates', label: '证书', value: [], raw: [], profileGroup: '', stateId: 'demo' },
  { key: 'id-demo-titles', label: '称号', value: [], raw: [], profileGroup: '', stateId: 'demo' },
];
const sections = ui.profileSections.call(ui, state, identityFields);
const identity = sections.find((section) => section.title === '身份信息');

assert.ok(identity, 'identity section should exist');
const labels = identity.fields.map((field) => field.label);
['姓名', '年龄', '证书', '称号'].forEach((label) => assert.ok(labels.includes(label), `${label} should come from profile identity fields`));
assert.ok(!identity.fields.some((field) => ['world_tag', 'age', 'factions', 'memberships'].includes(field.key)), 'identity section must not append raw RPG entries');
console.log('PASS identity section uses profile fields only');
