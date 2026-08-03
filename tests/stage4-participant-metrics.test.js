const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console, Date, JSON, Math, Number, Object, String, window: {} });
context.window.window = context.window;
context.window.GameModules = {};

for (const relativePath of ['publish/metrics.js', 'publish/update/update-registry.js', 'publish/real-world-agent-loop.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

const loop = context.window.GameModules.realWorldAgentLoop;
const participants = [
  { type: 'player', id: 'player-self', name: '刘悠' },
  { type: 'character', id: 'rel-ai-247528', name: '刘思琪' },
];
const store = {
  playerIdentityState: () => ({ id: 'player-self', metrics: { emotions: { 兴奋: 40 }, playerFeelings: { 亲情: 50 } } }),
  itemSkillState: (id) => id === 'rel-ai-247528'
    ? { id, profile: { name: '刘思琪' }, metrics: { emotions: { 紧张: 30 }, playerFeelings: { 亲情: 60 } } }
    : null,
};

const parsed = loop.parseSettlementJson(JSON.stringify({
  情绪: [
    { subject: '刘悠', field: '兴奋', value: '+15', status: '明显兴奋', reason: '正文明确记录玩家心跳加快' },
    { subject: '刘思琪', field: '紧张', value: '+10', status: '身体紧绷', reason: '正文明确记录她面对亲密接触时紧张' },
  ],
  感觉: [
    { subject: '刘思琪', field: '亲情', value: '+8', status: '态度更依赖', reason: '正文明确记录她对玩家的态度变化' },
  ],
}), { requestedTypes: ['情绪', '感觉'], participants, store });

assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['情绪', '感觉']));
assert.strictEqual(JSON.stringify(parsed.genericUpdates.map((item) => [item.updateType, item.subject.id, item.field])), JSON.stringify([
  ['emotion', 'player-self', 'metrics.emotions.兴奋'],
  ['emotion', 'rel-ai-247528', 'metrics.emotions.紧张'],
  ['feeling', 'rel-ai-247528', 'metrics.playerFeelings.亲情'],
]));

const metrics = context.window.GameModules.metrics;
const metricState = {
  emotions: { 兴奋: 40 },
  playerFeelings: { 亲情: 50 },
  temporaryEmotions: {},
  temporaryPlayerFeelings: {},
  notes: {},
};
metrics.applyGroup(metricState.emotions, [{ key: '未预置情绪', delta: 6, status: 'AI 返回的新指标', reason: '正文明确证据' }], metricState.notes, 'emotion', metricState.temporaryEmotions);
assert.strictEqual(metricState.temporaryEmotions.未预置情绪, 6);

console.log('PASS Stage4 preserves per-participant emotion/feeling updates and new AI metric entries');
