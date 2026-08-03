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
const participants = [
  { type: 'player', id: 'player-self', name: '刘悠', idOrName: 'player-self' },
  { type: 'character', id: 'rel-ai-247528', name: '刘思琪', idOrName: 'rel-ai-247528' },
];

assert.strictEqual(loop.inferReasoningPhase({ sourceTitle: '现实Stage4-1 角色卡状态结算' }), 'stage4-1');
assert.strictEqual(loop.inferReasoningPhase({ sourceTitle: '现实Stage4-2 角色卡物品结算' }), 'stage4-2');
assert.strictEqual(loop.inferReasoningPhase({ sourceTitle: '现实Stage4-3 角色卡状态再次更新' }), 'stage4-3');
assert.strictEqual(loop.stagePhaseLabel('stage4-1'), 'Stage4-1 角色卡状态结算');
assert.strictEqual(loop.stagePhaseLabel('stage4-2'), 'Stage4-2 角色卡物品结算');
assert.strictEqual(loop.stagePhaseLabel('stage4-3'), 'Stage4-3 角色卡状态再次更新');

const queue = loop.settlementTypeQueue(loop.realConfig(), {});
assert.ok(!queue.includes('角色卡'));
assert.ok(!queue.includes('物品'));

const itemParsed = loop.parseSettlementJson(JSON.stringify({
  角色卡物品: [{
    subject: '刘悠',
    action: 'transfer',
    itemName: '门禁卡',
    item: { name: '门禁卡', description: '小区单元门门禁卡', quantity: 1, type: 'item' },
    quantity: 1,
    to: '刘思琪',
    reason: '正文明确将门禁卡交给刘思琪',
  }],
}), { requestedTypes: ['角色卡物品'], participants });
assert.deepStrictEqual(JSON.parse(JSON.stringify(itemParsed.completeTypes)), ['角色卡物品']);
assert.strictEqual(itemParsed.genericUpdates[0].updateType, 'inventory-operation');
assert.strictEqual(itemParsed.genericUpdates[0].change.value.action, 'transfer');
assert.strictEqual(itemParsed.genericUpdates[0].change.value.target.id, 'rel-ai-247528');

const reviewParsed = loop.parseSettlementJson(JSON.stringify({
  角色卡复核: [{
    subject: '刘思琪',
    field: 'profile.detail',
    op: '替换',
    value: '复核后的完整人物说明',
    reason: '正文与前两段结算共同确认',
  }],
}), { requestedTypes: ['角色卡复核'], participants });
assert.deepStrictEqual(JSON.parse(JSON.stringify(reviewParsed.completeTypes)), ['角色卡复核']);
assert.strictEqual(reviewParsed.genericUpdates[0].field, 'profile.detail');
assert.strictEqual(reviewParsed.genericUpdates[0].change.mode, 'set');

const unsafeReview = loop.parseSettlementJson(JSON.stringify({
  角色卡复核: [{
    subject: '刘思琪', field: 'profile.roleCardUpdatedAt', op: '替换', value: 'x', reason: 'x',
  }],
}), { requestedTypes: ['角色卡复核'], participants });
assert.deepStrictEqual(JSON.parse(JSON.stringify(unsafeReview.incompleteTypes)), ['角色卡复核']);

context.window.GameModules.rpgState = { stripProfileOwnedValues: () => false };
vm.runInContext(fs.readFileSync(path.join(root, 'publish/update/generic-update-applier.js'), 'utf8'), context);
context.window.GameModules.updateRegistry.reasonText = (update, fallback = '') => String(update?.reasons?.[0]?.evidence || fallback);
const playerState = { id: 'player-self', profile: { items: [{ name: '门禁卡', quantity: 1 }], wearingItems: [] }, values: {} };
const sisterState = { id: 'rel-ai-247528', profile: { items: [], wearingItems: [], detail: '旧说明' }, values: {} };
const applyStore = {
  rpgStates: { 'player-self': playerState, 'rel-ai-247528': sisterState },
  playerIdentityState: () => playerState,
  itemSkillState: (id) => ({ 'player-self': playerState, 'rel-ai-247528': sisterState }[id] || null),
};
assert.strictEqual(context.window.GameModules.updateRegistry.applyOne(applyStore, itemParsed.genericUpdates[0]), true);
assert.strictEqual(playerState.profile.items.length, 0);
assert.strictEqual(sisterState.profile.items[0].name, '门禁卡');
assert.strictEqual(context.window.GameModules.updateRegistry.applyOne(applyStore, reviewParsed.genericUpdates[0]), true);
assert.strictEqual(sisterState.profile.detail, '复核后的完整人物说明');

console.log('PASS Stage4 role-card passes expose distinct labels, item operations, and full-field review');
