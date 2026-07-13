const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let saveCount = 0;
let touchCount = 0;
const context = {
  window: {
    GameModules: {
      characterStateStore: {
        async save() { saveCount += 1; },
      },
      rpgInitializer: {
        touch() { touchCount += 1; },
      },
    },
    Alpine: { store: () => ({}) },
  },
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'publish', 'character-card-lexicon.js'), 'utf8'),
  context,
);

(async () => {
  const lexicon = context.window.GameModules.characterCardLexicon;
  const state = { profile: { job: '学生', skills: [] }, values: {} };
  const records = await lexicon.applyToState(state, [
    { kind: '角色卡', field: '职业', value: '记者', reason: '剧情中正式入职' },
    { kind: '角色技能', field: '技能', name: '调查', value: '快速收集线索', reason: '完成专业训练' },
    { kind: '角色卡', field: '本质偏好', value: '不可覆盖', reason: '尝试修改固定层' },
  ]);

  assert.strictEqual(state.profile.job, '记者');
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(state.profile.skills)),
    [{ name: '调查', desc: '快速收集线索', reason: '完成专业训练', changeMode: '完成专业训练' }],
  );
  assert.strictEqual(records.length, 3);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(records.map((record) => record.applied))),
    [true, true, false],
  );
  assert.strictEqual(saveCount, 1);
  assert.strictEqual(touchCount, 1);

  console.log('PASS character card and skill updates preserve immutable preference layers');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
