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

const context = {
  window: { GameModules: {} },
  console,
  String,
  Boolean,
  Array,
  Object,
  Error,
  JSON,
  Math,
  Date,
  Number,
  Set,
  Map,
  RegExp,
};
loadScript(context, 'publish/character-goal-system.js');

// Minimal rpg-field-ui slice: load full file needs many deps; instead unit-test helpers by eval extract.
// Load rpg-field-ui into a stub store object pattern used by the app.
const rpgUiSource = read('publish/rpg-field-ui.js');
const stub = {
  window: context.window,
  console,
  String,
  Boolean,
  Array,
  Object,
  Error,
  JSON,
  Math,
  Date,
  Number,
  Set,
  Map,
  RegExp,
};
// rpg-field-ui assigns onto an existing object via Object.assign or similar — inspect top of file
loadScript(stub, 'publish/rpg-field-ui.js');

const game = stub.window.GameModules?.rpgFieldUi
  || stub.GameModules?.rpgFieldUi
  || Object.values(stub.window.GameModules || {}).find((mod) => mod && typeof mod.profileSections === 'function')
  || null;

// Fallback: many files attach methods onto a shared actions object. Search for profileSections.
let host = game;
if (!host) {
  // rpg-field-ui.js may be a plain object assignment — re-read header
  const match = rpgUiSource.match(/window\.GameModules\.(\w+)\s*=/);
  if (match) host = stub.window.GameModules[match[1]];
}
assert.ok(host && typeof host.profileSections === 'function', 'profileSections host missing');
assert.ok(typeof host.isGoalSystemField === 'function');
assert.ok(typeof host.lifeOrientationPresentation === 'function');
assert.ok(typeof host.goalsPresentation === 'function');

assert.strictEqual(host.isGoalSystemField({ profileGroup: '长期目标', label: '短期目标' }), true);
assert.strictEqual(host.isGoalSystemField({ profileGroup: '人生取向', label: '价值立场' }), false);
assert.strictEqual(host.isGoalSystemField({ label: '阶段成果', goalsRole: 'achievements' }), true);

const identityFields = [
  { label: '价值立场', profileGroup: '人生取向', value: '守序邪恶' },
  { label: '人生总结', profileGroup: '人生取向', value: '总结正文' },
  { label: '短期目标', profileGroup: '长期目标', goalsRole: 'short', value: '完成汇报', goalTier: { content: '完成汇报', deadline: '', progress: 0, detail: '' } },
  { label: '中期目标', profileGroup: '长期目标', goalsRole: 'medium', value: '升主管', goalTier: { content: '升主管', deadline: '', progress: 0, detail: '' } },
  { label: '长期目标', profileGroup: '长期目标', goalsRole: 'long', value: '高管', goalTier: { content: '高管', deadline: '', progress: 0, detail: '' } },
  { label: '阶段成果', profileGroup: '长期目标', goalsRole: 'achievements', value: '未记录', goalAchievements: [] },
];

const sections = host.profileSections({ id: 'player-self', profile: {}, values: {} }, identityFields);
const titles = sections.map((section) => section.title);
assert.ok(titles.includes('人生取向'), titles.join(','));
assert.ok(titles.includes('长期目标'), titles.join(','));

const orient = sections.find((section) => section.title === '人生取向');
const goals = sections.find((section) => section.title === '长期目标');
assert.strictEqual(orient.view, 'lifeOrientation');
assert.strictEqual(goals.view, 'goalSystem');
assert.ok(orient.fields.every((field) => !host.isGoalSystemField(field)));
assert.ok(goals.fields.every((field) => host.isGoalSystemField(field)));
assert.ok(!orient.fields.some((field) => /目标|成果/.test(field.label)));
assert.ok(!goals.fields.some((field) => field.label === '价值立场'));

const orientView = host.lifeOrientationPresentation(orient.fields);
assert.ok((orientView.support || []).length >= 1);

const goalsView = host.goalsPresentation(goals.fields);
assert.strictEqual(goalsView.cards.length, 3);
assert.strictEqual(goalsView.cards[0].progress, 0);
assert.strictEqual(goalsView.cards[0].deadlineLabel, '未设期限');
assert.ok(goalsView.cards[0].preview.includes('完成汇报'));
assert.strictEqual(goalsView.empty, false);

const tabGoal = host.profileSectionTabMeta(goals);
assert.strictEqual(tabGoal.label, '目标');
const tabOrient = host.profileSectionTabMeta(orient);
assert.strictEqual(tabOrient.label, '取向');

const api = context.window.GameModules.characterGoalSystem;
const lex = api.lexiconFields(api.normalize({ short: { content: 'x' } }));
assert.ok(lex.every((row) => row.profileGroup === '长期目标'));

console.log('identity-goal-tab-split: ok');
