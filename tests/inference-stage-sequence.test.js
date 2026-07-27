const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const context = vm.createContext({
  console,
  Date,
  JSON,
  Math,
  Number,
  Object,
  Set,
  String,
  window: { GameModules: {} },
});
context.window.window = context.window;
vm.runInContext(read('publish/real-world-agent-loop.js'), context, { filename: 'publish/real-world-agent-loop.js' });
const loop = context.window.GameModules.realWorldAgentLoop;

const expectedLabels = {
  stage4: 'Stage4 状态结算',
  stage5: 'Stage5 介绍卡更新',
  stage6: 'Stage6 外观判定',
  stage7: 'Stage7 自然外观补丁',
  stage8: 'Stage8 盛装外观补丁',
  stage9: 'Stage9 势力更新',
  stage10: 'Stage10 电子地图周围解锁',
  stage11: 'Stage11 经验结算',
  stage12: 'Stage12 世界新闻热榜',
};
Object.entries(expectedLabels).forEach(([phase, label]) => {
  assert.strictEqual(loop.stagePhaseLabel(phase), label, `${phase} label must match the final stage sequence`);
});

['stage10', 'stage11', 'stage12'].forEach((phase) => {
  const stageNumber = phase.replace('stage', '');
  const parsed = loop.parseReasoningLabel(`Stage${stageNumber} 测试阶段`);
  assert.strictEqual(parsed?.phase, phase, `${phase} must be parsed as a complete two-digit token`);
  assert.strictEqual(loop.reasoningSectionMeta({ reasoningPhase: phase }).phase, phase);
});

const expectations = [
  ['publish/real-world-profile-stage5.js', 'Stage6 外观判定'],
  ['publish/real-world-profile-stage5.js', 'Stage7 自然外观补丁'],
  ['publish/real-world-profile-stage5.js', 'Stage8 盛装外观补丁'],
  ['publish/inference/faction-stage-update.js', 'Stage9 势力更新'],
  ['publish/real-world-map-fog.js', 'Stage10 电子地图周围解锁'],
  ['publish/inference/life-energy-stage.js', 'Stage11 经验结算'],
  ['publish/inference/news-driver-stage-update.js', 'Stage12 世界新闻热榜'],
  ['publish/prompts/推演引擎/stage5-profile-gate.md', '# Stage6 外观判定'],
  ['publish/prompts/推演引擎/stage5-body-profile-patch.md', '# Stage7 自然外观补丁'],
  ['publish/prompts/推演引擎/stage5-dressed-profile-patch.md', '# Stage8 盛装外观补丁'],
  ['publish/prompts/推演引擎/stage6-faction-update.md', '# Stage9 势力更新'],
  ['publish/prompts/推演引擎/update/map-update-prompt.md', '# Stage10 地图更新'],
  ['publish/prompts/推演引擎/stage10-life-energy-exp.md', '# Stage11 经验结算'],
  ['publish/prompts/推演引擎/stage11-world-news-update.md', '# Stage12 世界新闻热榜结算'],
];
expectations.forEach(([file, text]) => assert.ok(read(file).includes(text), `${file} must include ${text}`));

const thinkingSource = read('publish/real-world-thinking-actions.js');
assert.ok(thinkingSource.includes('stage12: 120'));

console.log('PASS inference settlement stages use the final Stage4-Stage12 sequence');
