const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function load(rel, context) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
}

async function main() {
  const saves = [];
  const context = vm.createContext({
    window: { GameModules: {}, Alpine: { store: () => null } },
    console,
    Date,
    Math,
    String,
    Array,
    Object,
    Boolean,
    Number,
    JSON,
    Promise,
    Set,
    Map,
    WeakSet,
    RegExp,
  });
  context.window.window = context.window;

  // Minimal rpgState seed for item ids
  context.window.GameModules.rpgState = { seed: (s) => [...String(s)].reduce((n, c) => n + c.charCodeAt(0), 0) };
  context.window.GameModules.progression = {
    schemaSections() { return []; },
    createValues() { return {}; },
    ensureStateMechanics() {},
  };
  load('publish/progression-wearables.js', context);
  const progression = context.window.GameModules.progression;
  assert.ok(typeof progression.canonicalWearSlot === 'function');
  assert.ok(typeof progression.normalizeCarryItem === 'function');
  progression.ensureInventoryFields = (values, ownerId = '') => {
    values.items = Array.isArray(values.items) ? values.items : [];
    values.wearing = progression.defaultWearing(values.wearing, ownerId);
  };

  load('publish/metrics.js', context);
  load('publish/ai.js', context);
  load('publish/ai-lexicon.js', context);
  load('publish/character-card-lexicon.js', context);
  load('publish/inventory-actions.js', context);
  load('publish/actions.js', context);
  load('publish/result-actions.js', context);
  load('publish/real-world-clock-actions.js', context);
  load('publish/real-world-agent-loop.js', context);
  load('publish/app/wechat/chat-reply-helpers.js', context);
  load('publish/app/wechat/chat-orchestration.js', context);
  load('publish/update/generic-update-applier.js', context);

  context.window.GameModules.characterStateStore = {
    async save(state) { saves.push({ id: state.id, metrics: JSON.parse(JSON.stringify(state.metrics || {})), values: JSON.parse(JSON.stringify(state.values || {})) }); },
  };
  context.window.GameModules.initPromptRegistry = {
    ensureTemplateState() {},
  };

  const helpers = context.window.GameModules.app.wechat.chatReplyHelpers;
  const orchestration = context.window.GameModules.app.wechat.chatOrchestration;
  const inventory = context.window.GameModules.inventoryActions;
  const clock = context.window.GameModules.realWorldClockActions;
  const resultActions = context.window.GameModules.resultActions;
  const metrics = context.window.GameModules.metrics;
  const ai = context.window.GameModules.ai;

  const store = {
    phoneFixedTime: Date.parse('2026-07-27T12:00:00+08:00'),
    rpgStates: {},
    playerProfile: { initializedAt: '2026-07-27T12:00:00.000+08:00' },
    wechatMessageKey(contact) { return String(contact?.id || contact?.characterId || ''); },
    refreshPhoneClockLabels() {},
  };
  // Mix in settlement appliers (same binding style as Alpine store)
  store.ensureStateMetrics = function ensureStateMetrics(state) {
    const fresh = metrics.fresh();
    state.metrics = state.metrics || {};
    state.metrics.emotions = metrics.fill(state.metrics.emotions, metrics.emotionKeys, fresh.emotions);
    state.metrics.playerFeelings = metrics.fill(state.metrics.playerFeelings, metrics.playerKeys, fresh.playerFeelings);
    state.metrics.temporaryEmotions = state.metrics.temporaryEmotions || {};
    state.metrics.temporaryPlayerFeelings = state.metrics.temporaryPlayerFeelings || {};
    state.metrics.notes = state.metrics.notes || {};
    return state.metrics;
  };
  store.applyMetricUpdatesToState = resultActions.applyMetricUpdatesToState;
  store.applyInventoryUpdatesToState = inventory.applyInventoryUpdatesToState;
  store.persistInventoryState = inventory.persistInventoryState;
  store.writeWearingItem = inventory.writeWearingItem;
  store.ensureWearSlot = inventory.ensureWearSlot;
  store.isEmptyWear = inventory.isEmptyWear;
  store.inventoryName = inventory.inventoryName;
  store.advancePhoneTime = clock.advancePhoneTime;
  store.ensurePhoneFixedTime = clock.ensurePhoneFixedTime;
  store.applyWechatBodyStatusUpdates = orchestration.applyWechatBodyStatusUpdates;
  store.normalizeWechatBodyStatusUpdates = helpers.normalizeWechatBodyStatusUpdates;

  assert.strictEqual(typeof store.wechatMessageKey, 'function');

  const state = {
    id: 'npc-a',
    name: '陈默',
    profile: { name: '陈默', role: '同事', personality: '稳重' },
    values: { items: [], wearing: [], bodyStatus: {} },
    metrics: null,
  };
  store.rpgStates['npc-a'] = state;
  progression.ensureInventoryFields(state.values, state.id);
  store.ensureStateMetrics(state);
  const beforeJoy = state.metrics.emotions['高兴'];
  const beforeAffection = state.metrics.playerFeelings['好感'];
  const beforeTop = state.values.wearing.find((w) => w.slot === 'top');

  const raw = {
    reply: '刚发你了',
    mood: '轻松',
    elapsedSeconds: 90,
    impression: 40,
    metricUpdates: {
      emotions: [{ key: '高兴', delta: 5, status: '听到被需要有点开心', reason: '玩家主动关心工作进度' }],
      playerFeelings: [{ key: '好感', delta: 3, status: '对玩家更顺眼', reason: '玩家语气体贴' }],
    },
    lexiconUpdates: [
      {
        worldTag: '2026 现代都市现实世界',
        kind: '穿着',
        name: '未穿戴',
        value: { slot: '上衣', name: '未穿戴', action: '脱下' },
        reason: '聊天里说自己在家把外套脱了只剩内衣',
      },
      {
        worldTag: '2026 现代都市现实世界',
        kind: '角色卡',
        field: 'personality',
        name: 'personality',
        value: '稳重但会吐槽',
        reason: '聊天里确认了吐槽习惯',
      },
      {
        worldTag: '2026 现代都市现实世界',
        kind: '物品',
        name: '工牌',
        value: { name: '工牌', description: '公司门禁工牌' },
        reason: '提到出门要带工牌',
      },
    ],
    bodyStatusUpdates: [
      { part: '整体', status: '轻松发热', reason: '聊完工作后放松下来微微发热' },
    ],
  };

  const validated = helpers.validateWechatReply.call(store, raw, { id: 'npc-a', name: '陈默' });
  assert.strictEqual(validated.elapsedSeconds, 90);
  assert.ok(validated.metricUpdates.emotions.some((x) => x.key === '高兴' && x.delta === 5));
  assert.ok(validated.metricUpdates.playerFeelings.some((x) => x.key === '好感' && x.delta === 3));
  assert.ok(validated.lexiconUpdates.some((x) => x.kind === '穿着'));
  assert.ok(validated.bodyStatusUpdates.some((x) => x.partKey === 'overall'));

  // Apply same order as replyWechatContact success path
  const cardChanges = await context.window.GameModules.characterCardLexicon.applyToState(state, validated.lexiconUpdates);
  await store.applyMetricUpdatesToState(state, validated.metricUpdates);
  await store.applyInventoryUpdatesToState(state, validated.lexiconUpdates);
  const bodyApplied = await store.applyWechatBodyStatusUpdates(state, validated.bodyStatusUpdates);
  store.advancePhoneTime(validated.elapsedSeconds);

  // Time
  assert.strictEqual(store.phoneFixedTime, Date.parse('2026-07-27T12:00:00+08:00') + 90 * 1000);

  // Emotions / feelings
  assert.strictEqual(state.metrics.emotions['高兴'], metrics.clamp(beforeJoy + 5));
  assert.strictEqual(state.metrics.playerFeelings['好感'], metrics.clamp(beforeAffection + 3));

  // Character card
  assert.strictEqual(state.profile.personality, '稳重但会吐槽');
  assert.ok(cardChanges.some((x) => x.applied && String(x.field).includes('性格') || x.field === '性格' || x.name === 'personality' || x.applied));

  // Wearing: 上衣 must land on canonical slot `top`, not a parallel `上衣` slot
  const top = state.values.wearing.find((w) => w.slot === 'top');
  const rogue = state.values.wearing.find((w) => w.slot === '上衣');
  assert.ok(top, 'expected top slot');
  assert.strictEqual(top.name, '未穿戴');
  assert.ok(!rogue, 'must not create duplicate Chinese slot 上衣');
  assert.match(String(top.reason || top.changeMode || ''), /外套|脱|聊天/);

  // Item
  assert.ok(state.values.items.some((item) => item.name === '工牌'));

  // Body status
  assert.strictEqual(bodyApplied.length, 1);
  assert.ok(state.values.bodyStatus.overall);
  assert.match(state.values.bodyStatus.overall.status, /发热/);

  // Kind matching still accepts Chinese kinds after normalize
  const kinds = validated.lexiconUpdates.map((x) => x.kind);
  assert.ok(kinds.includes('穿着'));
  assert.ok(kinds.includes('物品'));
  assert.ok(kinds.includes('角色卡'));

  console.log(JSON.stringify({
    ok: true,
    phoneDeltaSec: 90,
    joy: state.metrics.emotions['高兴'],
    affection: state.metrics.playerFeelings['好感'],
    topSlot: top.slot,
    topName: top.name,
    itemNames: state.values.items.map((i) => i.name),
    bodyOverall: state.values.bodyStatus.overall.status,
    saves: saves.length,
  }, null, 2));
  console.log('PASS wechat-reply-settlement-audit');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
