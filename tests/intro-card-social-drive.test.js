const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({
  window: { GameModules: {} },
  Array,
  Boolean,
  Date,
  JSON,
  Map,
  Math,
  Number,
  Object,
  Promise,
  RegExp,
  Set,
  String,
  console,
});

function load(relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

load('publish/character-social-drive.js');
load('publish/inference/intro-card-stage-update.js');

const stage = context.window.GameModules.inferenceIntroCardStageUpdate;
const card = {
  id: 'intro-test-1',
  name: '林青',
  agenda: { short: '准备期末考试', needPlayer: false, urgency: 0.6 },
  ideas: [
    { id: 'idea-1', title: '洗澡', detail: '放松一下', status: 'active' },
    { id: 'idea-2', title: '玩游戏', detail: '转换心情', status: 'active' },
  ],
};

(async () => {
  const result = await stage.applyOps({}, [card], [{
    id: card.id,
    field: 'ideas',
    op: 'replace',
    value: [
      { id: 'idea-1', title: '洗澡', detail: '放松一下', status: 'active', reason: '当前疲劳' },
      { id: 'idea-2', title: '玩游戏', detail: '转换心情', status: 'active', reason: '需要缓冲' },
      { id: 'idea-3', title: '出去走走', detail: '呼吸新鲜空气', status: 'active', reason: '时间与地点允许' },
    ],
    reason: '本轮正文和人物资料',
  }]);
  assert.strictEqual(result.applied.length, 1);
  assert.strictEqual(card.agenda.short, '准备期末考试');
  assert.strictEqual(card.ideas.length, 3);
  assert.strictEqual(stage.buildUpdatePrompt({}).includes('field="ideas"'), true);
  console.log('PASS intro-card social-drive ideas');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
