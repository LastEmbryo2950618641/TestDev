const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function createHarness() {
  const cards = [
    { id: 'intro-only', name: '林晴', worldTag: '现实世界', identity: { role: '同学' }, social: {}, agenda: {} },
    { id: 'full-role', name: '周岚', worldTag: '现实世界', identity: { role: '同事' }, social: {}, agenda: {} },
    { id: 'not-present', name: '沈月', worldTag: '现实世界', identity: { role: '朋友' }, social: {}, agenda: {} },
  ];
  const aiCalls = [];
  const applied = [];
  const synced = [];
  const prompts = [];
  const fullRoleState = { id: 'full-role', profile: { name: '周岚', solidifyComplete: true } };
  const context = vm.createContext({
    console,
    JSON,
    Set,
    String,
    window: {
      GameModules: {
        characterIntroStore: {
          list: () => cards,
          getById: (id) => cards.find((card) => card.id === id) || null,
          get: (name) => cards.find((card) => card.name === name) || null,
        },
        characterIntroCard: {
          roleCardState: (card) => card.id === 'full-role' ? fullRoleState : null,
          isIncompleteRoleStub: () => false,
        },
        characterIntroUpdateOperations: {
          async applyMany(_store, ops) {
            applied.push(...ops);
            return {
              applied: ops.map((operation) => ({ applied: true, operation })),
              rejected: [],
            };
          },
          async syncRoleToIntro(roleState, introCard) {
            synced.push({ roleState, introCard });
            return introCard;
          },
        },
      },
    },
  });
  context.window.window = context.window;
  vm.runInContext(
    fs.readFileSync(path.join(root, 'publish/inference/intro-card-stage-update.js'), 'utf8'),
    context,
    { filename: 'publish/inference/intro-card-stage-update.js' },
  );
  const loop = {
    async renderPrompt(id, vars) {
      prompts.push({ id, vars });
      return `PROMPT:${id}`;
    },
    async completeConfiguredStep(store, prompt, logId, streamToUi, config) {
      aiCalls.push({ store, prompt, logId, streamToUi, config });
      return JSON.stringify({
        ops: [
          { subject: { id: 'intro-only', name: '林晴' }, field: 'identity.job', op: 'set', value: '成都市第一中学高三学生', reason: '本轮正文确认其学生身份' },
          { subject: { id: 'not-present', name: '沈月' }, field: 'identity.job', op: 'set', value: '不应更新', reason: '越界操作' },
        ],
        done: true,
      });
    },
  };
  return {
    module: context.window.GameModules.introCardStageUpdate,
    cards,
    aiCalls,
    applied,
    synced,
    prompts,
    loop,
  };
}

(async () => {
  const loopSource = fs.readFileSync(path.join(root, 'publish/real-world-agent-loop.js'), 'utf8');
  const introStageIndex = loopSource.indexOf('introCardStageUpdate');
  const appearanceStageIndex = loopSource.indexOf('realWorldProfileStage5', introStageIndex);
  assert.ok(introStageIndex >= 0, 'main loop should invoke introCardStageUpdate');
  assert.ok(appearanceStageIndex > introStageIndex, 'intro-card Stage5 must run before appearance stages');
  assert.ok(loopSource.includes('Stage5 介绍卡更新失败'));
  assert.ok(loopSource.includes('introStage5Result'));
  const runtimeScripts = JSON.parse(fs.readFileSync(path.join(root, 'publish/boot/scripts.json'), 'utf8'));
  assert.ok(runtimeScripts.indexOf('inference/intro-card-stage-update.js') < runtimeScripts.indexOf('real-world-agent-loop.js'));

  const harness = createHarness();
  const kvCacheSession = { id: 'post-stage3-fork', messages: [{ role: 'assistant', content: '正文前已加载角色资料' }] };
  const store = { modelId: 'test-model' };
  const result = await harness.module.runAfterStage4({
    store,
    action: '询问学校近况',
    narration: '林晴谈到了最近的课程，周岚也在场。',
    participants: [
      { type: 'character', id: 'intro-only', name: '林晴' },
      { type: 'character', id: 'full-role', name: '周岚' },
      { type: 'character', id: 'missing-intro', name: '陌生人' },
      { type: 'player', id: 'player-self', name: '玩家' },
    ],
    logId: 'log-1',
    config: { mode: 'real', label: '现实', kvCacheSession },
    loop: harness.loop,
  });

  assert.strictEqual(harness.aiCalls.length, 1, 'Stage5 每轮最多发起一次 AI 请求');
  assert.strictEqual(harness.aiCalls[0].config.kvCacheSession, kvCacheSession, '必须复用正文后同一个 KV fork/session');
  assert.strictEqual(harness.aiCalls[0].config.promptId, 'inference-stage5-intro-card-update');
  assert.strictEqual(harness.prompts[0].id, 'inference-stage5-intro-card-update');
  assert.match(harness.prompts[0].vars['介绍卡候选资料'], /intro-only/);
  assert.doesNotMatch(harness.prompts[0].vars['介绍卡候选资料'], /not-present/);
  assert.doesNotMatch(harness.prompts[0].vars['介绍卡候选资料'], /full-role/);
  assert.deepStrictEqual(harness.applied.map((operation) => operation.subject.id), ['intro-only'], '越界人物操作必须在应用前过滤');
  assert.deepStrictEqual(harness.synced.map((item) => item.introCard.id), ['full-role'], '完整角色卡只做确定性同步');
  assert.strictEqual(result.aiRequested, true);
  assert.strictEqual(result.candidateCount, 1);

  const noAi = createHarness();
  const noAiResult = await noAi.module.runAfterStage4({
    store,
    action: '继续工作',
    narration: '周岚整理了资料。',
    participants: [{ type: 'character', id: 'full-role', name: '周岚' }],
    logId: 'log-2',
    config: { mode: 'real', label: '现实', kvCacheSession },
    loop: noAi.loop,
  });
  assert.strictEqual(noAi.aiCalls.length, 0, '没有介绍卡候选时不得请求 AI');
  assert.deepStrictEqual(noAi.synced.map((item) => item.introCard.id), ['full-role']);
  assert.strictEqual(noAiResult.aiRequested, false);
  assert.strictEqual(noAiResult.candidateCount, 0);

  console.log('PASS Stage5 updates only current intro-only participants with at most one AI request');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
