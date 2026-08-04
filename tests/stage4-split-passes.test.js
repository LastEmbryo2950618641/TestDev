const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({
  console,
  performance: { now: () => 0 },
  window: {
    GameModules: {
      jsonUtils: {
        extractJson: (text) => String(text || '').trim(),
        repairJson: (text) => String(text || '').trim(),
        parseLoose: (text) => JSON.parse(String(text || '{}')),
      },
      aiRequest: { outputTailLooksTruncated: () => false },
      ai: { normalizeChoices: (choices = []) => choices },
      promptTemplates: { render: async () => '' },
    },
  },
});
context.window.window = context.window;

vm.runInContext(fs.readFileSync(path.join(root, 'publish/real-world-agent-loop.js'), 'utf8'), context);
const loop = context.window.GameModules.realWorldAgentLoop;

assert.strictEqual(typeof loop.stage4SettlementPasses, 'function');
const passes = loop.stage4SettlementPasses(loop.realConfig(), {});
assert.strictEqual(passes.length, 12);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes.map((item) => item.id))), [
  'stage4-1',
  'stage4-2',
  'stage4-3',
  'stage4-4',
  'stage4-5',
  'stage4-6',
  'stage4-7',
  'stage4-8',
  'stage4-9',
  'stage4-10',
  'stage4-11',
  'stage4-12',
]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[0].types)), ['基础结算']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[1].types)), ['情绪', '感觉']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[2].types)), ['生命体征']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[3].types)), ['身体状态', '穿着状态']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[4].types)), ['性经历', '性历史']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[5].types)), ['关系', '长期目标']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[6].types)), ['人事安排']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[7].types)), ['角色卡', '人事归属']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[8].types)), ['角色卡物品']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[9].types)), ['系统记录', '通用固化', '事件']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[10].types)), []);
assert.deepStrictEqual(JSON.parse(JSON.stringify(passes[11].types)), ['角色卡复核']);
assert.ok(passes[11].label.includes('角色卡补充更新'));
assert.strictEqual(loop.stagePhaseLabel('stage4-12'), 'Stage4-12 角色卡补充更新');
assert.strictEqual(loop.inferReasoningPhase({ sourceTitle: '现实Stage4-12 角色卡补充更新' }), 'stage4-12');
assert.strictEqual(loop.inferReasoningPhase({ sourceTitle: '现实Stage4-13 社交驱动' }), 'stage4-13');
assert.strictEqual(loop.inferReasoningPhase({ sourceTitle: '现实Stage4-14 角色想法补足' }), 'stage4-14');
assert.strictEqual(loop.isSettlementReasoning({ reasoningPhase: 'stage4' }), true);
for (let stage = 1; stage <= 14; stage += 1) {
  assert.strictEqual(loop.isSettlementReasoning({ reasoningPhase: `stage4-${stage}` }), true, `Stage4-${stage} must use settlement thinking`);
}
assert.strictEqual(loop.isSettlementReasoning({ reasoningPhase: 'stage3' }), false);

const possessedPasses = loop.stage4SettlementPasses(loop.realConfig(), { sharedControlState: () => ({ id: 'shared' }) });
assert.deepStrictEqual(JSON.parse(JSON.stringify(possessedPasses[10].types)), ['操控体验']);

console.log('PASS Stage4 split exposes 12 focused passes');
