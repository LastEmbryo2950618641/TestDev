const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const relativeScriptPath = 'real-world-thinking-actions.js';

function loadActions(storeRows = []) {
  const calls = { get: [], list: [], count: 0 };
  const context = vm.createContext({
    console,
    Date,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Set,
    String,
    document: { querySelector: () => null },
    requestAnimationFrame: (callback) => callback(),
    setTimeout: (callback) => callback(),
    window: {
      GameModules: {
        realWorldAgentLoop: {
          reasoningStageGroupKey: (meta) => `${meta.phase || 'unknown'}-${meta.step || 0}`,
          assignReasoningSectionMetas: (sections) => sections.map((section, index) => ({
            section,
            meta: { id: section.id || `stage-${index}`, phase: section.phase || 'stage1', step: section.step || index + 1, label: section.label || `阶段 ${index + 1}` },
          })),
          parseReasoningLabel: (label) => ({ phase: 'stage1', step: 1, label }),
        },
        realWorldLogStore: {
          get: (id) => {
            calls.get.push(id);
            return storeRows.find((entry) => entry.id === id) || null;
          },
          count: () => {
            calls.count += 1;
            return storeRows.length;
          },
          list: (page, size) => {
            calls.list.push([page, size]);
            return storeRows.slice((page - 1) * size, page * size);
          },
        },
      },
    },
  });
  const source = fs.readFileSync(path.join(root, 'publish', relativeScriptPath), 'utf8');
  vm.runInContext(source, context, { filename: `publish/${relativeScriptPath}` });
  return { actions: context.window.GameModules.realWorldThinkingActions, calls };
}

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

function run() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'publish', 'boot', 'scripts.json'), 'utf8'));
  assert.ok(manifest.includes(relativeScriptPath), 'real-world thinking actions must load at runtime');

  const stored = [
    { id: 'real-100-a-user', type: 'user', text: '调查', createdAt: '2026-07-14T10:00:00.000Z' },
    { id: 'real-100-a-ai', type: 'ai', narration: '结果', createdAt: '2026-07-14T10:00:01.000Z' },
    { id: 'saved-only', type: 'ai', narration: '旧记录', createdAt: '2026-07-14T11:00:00.000Z' },
  ];
  const { actions, calls } = loadActions(stored);
  const runtime = {
    ...actions,
    realWorldLog: [],
    realWorldLogPage: 1,
    realWorldLogPageSize: 2,
    realWorldLogTotal: 0,
  };

  assert.strictEqual(runtime.cleanRealWorldThinkingText('===---'), '');
  assert.strictEqual(runtime.cleanRealWorldThinkingText('有效推演'), '有效推演');
  assert.strictEqual(runtime.hasRealWorldThinking({ transientError: true, thinking: '不应显示' }), false);
  assert.strictEqual(runtime.realWorldEntryCacheText({ deepseekCache: { promptCacheHitTokens: 75, promptCacheMissTokens: 25 } }), '缓存命中：75 / 100 tokens（75%）');

  const groups = runtime.realWorldThinkingStageGroups({
    thinkingSections: [{ id: 'stage2-1', phase: 'stage2', step: 1, label: '资料整合', text: '整理人物资料' }],
    agentTrace: [{ step: 1, type: 'request_context', reason: '需要背景', requests: [{ skill: 'character', method: 'query', params: { id: 'npc-1' } }] }],
  });
  const reasoningGroup = groups.find((group) => group.id === 'stage2-1');
  const traceGroup = groups.find((group) => group.id === 'stage1-1');
  assert.strictEqual(reasoningGroup.label, '资料整合');
  assert.strictEqual(reasoningGroup.reasoning, '整理人物资料');
  assert.strictEqual(traceGroup.traceLines[0], '阶段 1｜请求外部资料');

  const combinedStage = runtime.realWorldThinkingStageGroups({
    thinkingSections: [
      { id: 'stage1-1', phase: 'stage1', step: 1, label: 'Stage1 资料查询 - 1', text: '资料判断过程' },
      { id: 'stage1-1-json', phase: 'stage1', step: 1, label: 'Stage1 资料查询 - 1', text: '正在接收 JSON：\n{}' },
    ],
  });
  assert.strictEqual(combinedStage.length, 1);
  assert.strictEqual(combinedStage[0].reasoning, '资料判断过程\n\n正在接收 JSON：\n{}');

  assert.strictEqual(runtime.patchRealWorldLogEntry('saved-only', { narration: '已更新' }), true);
  assert.deepStrictEqual(calls.get, ['saved-only']);
  assert.strictEqual(runtime.realWorldLog.find((entry) => entry.id === 'saved-only').narration, '已更新');

  runtime.refreshRealWorldLogPage(1);
  assert.strictEqual(runtime.realWorldLogTotal, 3);
  assert.deepStrictEqual(calls.list[0], [1, 2]);
  assert.strictEqual(runtime.realWorldLogPageLabel(), '第 1 / 2 页，共 3 条');

  assert.deepStrictEqual(
    json(runtime.realWorldTraceLines({ streaming: true })),
    ['1. 步骤进行中｜正在推演', '2. 正在接收现实 AI 的推演内容。'],
  );
  assert.deepStrictEqual(
    json(runtime.realWorldTraceItemLines({ step: 2, type: 'final', loaded: [{ title: '角色资料' }] })),
    ['阶段 2｜生成最终内容', '载入：角色资料'],
  );
  assert.ok(runtime.realWorldLogSortKey({ id: 'x', type: 'ai', time: { label: '2026年7月14日 12:30:45' } }).startsWith('1000-'));

  console.log('PASS real-world thinking runtime preserves grouping, log-store paging, sorting, and trace text');
}

run();
