const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const html = read('publish/index.html');
assert.ok(html.includes("!entry.transientError && ($store.game.hasRealWorldThinking(entry) || entry.promptPack)"));
assert.ok(html.includes('aria-label="查看生成提示词">提示词</button>'));
assert.ok(html.includes('realWorldThinkingLines(entry)'));
assert.ok(html.includes('AI结算思考'));
assert.ok(html.includes('realWorldSettlementThinkingLines(entry)'));
assert.ok(html.indexOf('entry.narration || entry.statusText || entry.text') < html.indexOf('现实AI结算思考'));
assert.ok(html.indexOf('现实AI结算思考') < html.indexOf('real-world-settlement-btn'));
assert.ok(html.includes('&& entry.settlementThinkingOpen'));
assert.ok(html.includes('<template x-if="!entry.transientError && $store.game.hasRealWorldSettlementThinking(entry) && entry.settlementThinkingOpen"'));
assert.ok(html.includes('<template x-if="entry.cardChangesOpen"'));
assert.ok(!html.includes('entry.streaming || entry.settlementThinkingOpen'));
assert.ok(!html.includes('realWorldTraceLines(entry)"'));
assert.ok(html.includes('real-world-hud-emblem'));
assert.ok(html.includes('realWorldMatterButtonText()'));
assert.ok(html.includes('realWorldEntryIcon(entry)'));
assert.ok(html.includes('realWorldChoiceIcon(choice)'));
assert.ok(html.includes('realWorldStatusIcon($store.game.realWorldStatus)'));
assert.ok(html.includes('realWorldDisplayLog()'));
assert.ok(html.includes('offlineSharedControlRole()'));
assert.ok(html.includes('退出当前附身控制，把身体控制权交还给被控制者。'));
assert.ok(!html.includes('real-world-paired-player'));
assert.ok(!read('publish/real-world-clock-actions.js').includes('this.sharedControlActive = false;'));
const clockActions = read('publish/real-world-clock-actions.js');
assert.ok(clockActions.includes('const total = window.GameModules.realWorldLogStore?.count?.() || 0'));
assert.ok(clockActions.includes('const loadedLatest = total > 0'));
assert.ok(clockActions.includes('if (!loadedLatest) this.refreshRealWorldLogPage?.(999999)'));
assert.ok(!read('publish/current-world-actions.js').includes('if (this.realWorldOpen) this.openRealWorldPanel?.()'));
const sqliteRealWorldLog = read('publish/platform/storage/sqlite/real-world-log.js');
assert.ok(sqliteRealWorldLog.includes('LIMIT ? OFFSET ?'));
assert.ok(sqliteRealWorldLog.includes("ORDER BY CASE WHEN entry_type='system' THEN 0 ELSE 1 END, created_at ASC, id ASC"));
assert.ok(!sqliteRealWorldLog.includes("SELECT entry_json FROM real_world_log');"));
const restorePostFlow = read('publish/app/storage/restore-post-flow.js');
assert.ok(restorePostFlow.includes("realWorldLogStore?.count?.() || 0) <= 0"));
assert.ok(restorePostFlow.indexOf("realWorldLogStore?.count") < restorePostFlow.indexOf("realWorldLogStore?.saveAll?.(store.realWorldLog)"));
assert.ok(restorePostFlow.includes('schedulePostRestoreSideEffects(store)'));
assert.ok(restorePostFlow.includes('store.scheduleIdleLoad?.bind(store)'));
assert.ok(!restorePostFlow.includes('    store.initFactionSystem?.();\n    window.GameModules.orgTerritory?.validateWorldConsistency?.(store);\n    store.initTaobaoApp?.();'));
assert.ok(!read('publish/home-actions.js').includes('      this.loadSavedRpgStates?.();'));
assert.ok(read('publish/home-actions.js').includes('this.scheduleIdleLoad?.(() =>'));
assert.ok(read('publish/home-actions.js').includes('if (!Object.keys(this.saveMetas || {}).length) await this.refreshSaveMetas?.();'));
assert.ok(!read('publish/home-actions.js').includes('      await this.refreshSaveMetas?.();\n      if (!this.phoneSetupDone)'));
assert.ok(!read('publish/home-actions.js').includes('      await this.openSlot(slot);'));
assert.ok(read('publish/home-actions.js').includes('window.GameModules.storage.restore(this, save);'));
assert.ok(read('publish/home-actions.js').includes("const stateIds = [...new Set(['player-self', this.selectedCharacterId, this.rpgPanelCharacterId].filter(Boolean))];"));
assert.ok(read('publish/app/save/slot-flow.js').includes('await this.loadWritingStyles({ readOnly: true });'));
assert.ok(read('publish/style-actions.js').includes('if (options.readOnly !== true) await this.saveWritingStyles(options);'));

const actions = read('publish/real-world-actions.js');
assert.ok(actions.includes('promptPack: null'));
assert.ok(actions.includes('thinkingSections: []'));
assert.ok(actions.includes('settlementThinkingSections: []'));
assert.ok(actions.includes('streamTrace: []'));
assert.ok(actions.includes("replace(/-ai$/u, '-user')"));

const context = { window: { GameModules: { domain: { control: {
  linkRules: {
    sharedControlState() { return this.rpgStates?.[this.sharedControlTargetId] || null; },
    sharedControlTargetName(state) { return state?.name || state?.profile?.name || '被控制者'; },
    sharedControlLabel() { return ''; },
    realWorldDisplayState() { return null; },
    realWorldDisplayCharacter() { return null; },
  },
  controlPatchHelpers: {
    buildOfflineControlLinkPatch(_state, narration) { return { active: false, lastAction: '下线交还控制权', reason: narration }; },
  },
} } } }, console };
vm.runInNewContext(read('publish/real-world-thinking-actions.js'), context, { filename: 'real-world-thinking-actions.js' });
const thinking = context.window.GameModules.realWorldThinkingActions;
const store = {
  realWorldLog: [],
  ...thinking,
};
assert.strictEqual(store.hasRealWorldThinking({ transientError: true, promptPack: { systemPrompt: 'x' }, thinking: '=' }), false);
assert.strictEqual(store.hasRealWorldSettlementThinking({ transientError: true, settlementThinking: '不显示' }), false);
assert.strictEqual(store.cleanRealWorldThinkingText('='), '');
assert.strictEqual(store.cleanRealWorldThinkingText('===---'), '');
assert.strictEqual(store.cleanRealWorldThinkingText('有效推演'), '有效推演');
assert.deepStrictEqual(JSON.parse(JSON.stringify(store.realWorldSettlementThinkingLines({
  settlementThinkingSections: [{ id: 'stage4', label: 'Stage4滑动结算', text: '检查更新' }],
}))), [{ id: 'stage4', label: 'Stage4滑动结算', text: '检查更新' }]);
assert.strictEqual(store.normalizeRealWorldLog([{ id: 'done', settlementThinking: '已完成' }])[0].settlementThinkingOpen, false);
assert.strictEqual(store.normalizeRealWorldLog([{ id: 'live', streaming: true, settlementThinking: '进行中' }])[0].settlementThinkingOpen, true);
assert.strictEqual(store.realWorldDisplayLog([
  { id: 'u1', type: 'user', text: 'same action' },
  { id: 'u2', type: 'user', text: 'same action' },
  { id: 'a1', type: 'ai', narration: 'AI request failed', transientError: true },
  { id: 'u3', type: 'user', text: 'same action' },
  { id: 'a2', type: 'ai', narration: 'AI request failed', transientError: true },
  { id: 'u4', type: 'user', text: 'new action' },
  { id: 'a3', type: 'ai', narration: 'normal result' },
  { id: 'u5', type: 'user', text: 'same action' },
]).map((entry) => entry.id).join(','), 'u1,a1,u3,a2,u4,a3,u5');

vm.runInNewContext(read('publish/real-world-utility-actions.js'), context, { filename: 'real-world-utility-actions.js' });
const utility = context.window.GameModules.realWorldUtilityActions;
assert.strictEqual(utility.realWorldChoiceIcon('检查手机记录'), '📱');
assert.strictEqual(utility.realWorldChoiceIcon('观察居住环境'), '🔎');
assert.strictEqual(utility.realWorldEntryIcon({ type: 'user' }), '🧍');
assert.strictEqual(utility.realWorldEntryIcon({ transientError: true }), '⚠️');
assert.strictEqual(utility.realWorldStatusIcon('当前目标'), '🎯');

vm.runInNewContext(read('publish/control-link-actions.js'), context, { filename: 'control-link-actions.js' });
const control = context.window.GameModules.controlLinkActions;
const savedEntries = [];
const savedStates = [];
context.window.GameModules.sqliteSave = {
  saveRealWorldLogEntry: async (entry) => { savedEntries.push(entry); },
  countRealWorldLogEntries: () => savedEntries.length,
  saveCharacterState: async (state) => { savedStates.push(state); },
};
context.window.GameModules.characterStateStore = {
  save: async (state) => { savedStates.push(state); },
};
context.window.GameModules.realWorldLogStore = {
  append: async (entry) => { savedEntries.push(entry); },
  count: () => savedEntries.length,
};
const npc = { id: 'npc-1', name: '刘思琪', profile: { name: '刘思琪' }, values: { control_link: {} } };
const controlStore = {
  ...control,
  sharedControlActive: true,
  sharedControlTargetId: 'npc-1',
  rpgStates: { 'npc-1': npc },
  realWorldBusy: false,
  realWorldFunctionOpen: true,
  realWorldFunctionView: 'menu',
  realWorldLog: [],
  realWorldLogPageSize: 12,
  realWorldChoices: ['观察'],
  realWorldSceneTitle: '测试场景',
  realWorldLocationName: '测试地点',
  realWorldStatus: '测试状态',
  realWorldQuest: '测试目标',
  phoneDate: () => new Date('2026-07-10T10:00:00+08:00'),
  phoneDateText: () => '2026年7月10日 周五',
  phoneTimeText: () => '10:00:00',
  normalizeRealWorldLog(log) { return log; },
  realWorldLogMaxPage() { return 1; },
  refreshRealWorldLogPage() {},
  scrollRealWorldLogBottom() {},
  assignRealWorldlineEntry: async () => {},
  refreshControlLinkStates: async () => {},
  save: async () => {},
};

(async () => {
  await controlStore.offlineSharedControlRole();
  assert.strictEqual(controlStore.sharedControlActive, false);
  assert.strictEqual(savedEntries.length, 1);
  assert.strictEqual(savedEntries[0].type, 'ai');
  assert.strictEqual(savedEntries[0].promptPack, null);
  assert.match(savedEntries[0].narration, /你意识从刘思琪的肉体深处缓缓抽离/);
  assert.match(savedEntries[0].narration, /控制权重新回到刘思琪自己的意识里/);
  assert.strictEqual(savedStates[0].values.control_link.lastAction, '下线交还控制权');
  console.log('PASS real world log UI hides failed prompt/thinking noise and shared-control offline appends context narration');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
