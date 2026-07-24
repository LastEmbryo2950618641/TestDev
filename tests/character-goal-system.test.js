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
const api = context.window.GameModules.characterGoalSystem;
assert.ok(api);

const normalized = api.normalize({
  short: { content: '完成本周汇报', deadline: '2026-07-31', progress: '40%', detail: '材料写了一半' },
  medium: '争取升主管',
  achievements: ['已与妹妹表白，成为女朋友关系'],
});
assert.strictEqual(normalized.short.content, '完成本周汇报');
assert.strictEqual(normalized.short.deadline, '2026-07-31');
assert.strictEqual(normalized.short.progress, 40);
assert.strictEqual(normalized.medium.content, '争取升主管');
assert.strictEqual(normalized.achievements[0].text, '已与妹妹表白，成为女朋友关系');

const profile = {};
assert.ok(api.applyToProfile(profile, {
  short: { progress: 55, detail: '提纲已定' },
  achievement: '日报已连续提交一周',
}));
assert.strictEqual(profile.goalSystem.short.progress, 55);
assert.ok(profile.goalSystem.achievements.some((item) => item.text.includes('日报')));

const text = api.formatText(profile.goalSystem);
assert.ok(text.includes('短期目标'));
assert.ok(text.includes('阶段成果'));

const fields = api.lexiconFields(profile.goalSystem, { targetId: 'player-self' });
assert.ok(fields.some((item) => item.label === '短期目标' && item.goalTier));
assert.ok(fields.some((item) => item.label === '阶段成果'));

const legacyProfile = {
  lifeOrientation: {
    goals: {
      short: '先稳住妹妹关系',
      medium: '升到公司主管',
      long: '建立自己的事业版图',
    },
  },
};
const seeded = api.ensureOnProfile(legacyProfile, []);
assert.strictEqual(seeded.short.content, '先稳住妹妹关系');
assert.strictEqual(seeded.medium.content, '升到公司主管');

const fromBundle = api.parseLegacyGoalBundle('近期目标：本周完成汇报\n中期目标：争取主管\n长期目标：独立创业');
assert.strictEqual(fromBundle.short.content, '本周完成汇报');
assert.strictEqual(fromBundle.long.content, '独立创业');

assert.ok(read('publish/real-world-agent-loop.js').includes("'长期目标'"));
assert.ok(read('publish/boot/script-manifest.js').includes('character-goal-system.js'));
assert.ok(read('publish/prompts/推演引擎/update/character-goal-update-prompt.md').includes('阶段成果'));
assert.ok(read('publish/rpg-field-ui.js').includes('人生总结'));

console.log('character-goal-system tests passed');
