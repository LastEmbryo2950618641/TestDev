const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function load(relativePath, context) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

const html = fs.readFileSync(path.join(root, 'publish/index.html'), 'utf8');
const actions = fs.readFileSync(path.join(root, 'publish/event-actions.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'publish/event-system.css'), 'utf8');

// --- static wiring ---
assert.ok(html.includes('日常驱动'), 'desktop label 日常驱动');
assert.ok(html.includes('日常驱动与事件系统'), 'window title');
assert.ok(html.includes('DAILY DRIVE'), 'eyebrow');
assert.ok(html.includes('setDrivePrimaryTab'), 'L1 tab wiring');
assert.ok(html.includes('currentInboxList'), 'inbox list wiring');
assert.ok(html.includes('inboxBudgetTiersView'), 'tempo table wiring');
assert.ok(/setInboxBudgetTier\s*\(/.test(actions), 'actions has setInboxBudgetTier');
assert.ok(html.includes('setInboxBudgetTier(index'), 'html calls setInboxBudgetTier');
assert.ok(html.includes('resetInboxBudgetTiers()'), 'html calls resetInboxBudgetTiers');
assert.ok(html.includes('inboxListEmptyText'), 'filter-aware empty lore');
assert.ok(css.includes('.drive-budget-table'), 'drive css present');
assert.ok(!html.includes('event-setting"><span>随机事件发生概率'), 'probability removed from header');

const androidActions = path.join(root, 'mobile/android-webview-shell/app/src/main/assets/publish/event-actions.js');
const androidHtml = path.join(root, 'mobile/android-webview-shell/app/src/main/assets/publish/index.html');
const androidCss = path.join(root, 'mobile/android-webview-shell/app/src/main/assets/publish/event-system.css');
if (fs.existsSync(androidActions)) {
  assert.strictEqual(fs.readFileSync(androidActions, 'utf8').replace(/^\uFEFF/, ''), actions.replace(/^\uFEFF/, ''), 'android event-actions synced');
}
if (fs.existsSync(androidHtml)) {
  assert.strictEqual(fs.readFileSync(androidHtml, 'utf8').replace(/^\uFEFF/, ''), html.replace(/^\uFEFF/, ''), 'android index synced');
}
if (fs.existsSync(androidCss)) {
  assert.strictEqual(fs.readFileSync(androidCss, 'utf8').replace(/^\uFEFF/, ''), css.replace(/^\uFEFF/, ''), 'android css synced');
}

// --- runtime simulation ---
const context = vm.createContext({
  window: { GameModules: {} },
  Date,
  Math,
  String,
  Array,
  Object,
  Boolean,
  Number,
  JSON,
  console,
  Promise,
  Map,
  Set,
});
load('publish/character-social-drive.js', context);
load('publish/social-inbox.js', context);
load('publish/event-system.js', context);
load('publish/ui/event/panel-view-helpers.js', context);
load('publish/ui/event/label-view-helpers.js', context);
load('publish/ui/event/view-helpers.js', context);
load('publish/event-actions.js', context);

const store = Object.assign({
  socialInbox: [],
  socialInboxPreparedIds: [],
  eventState: null,
  rpgStates: {},
  phoneDate() { return new Date('2026-07-26T15:00:00+08:00'); },
  save() { this._saved = (this._saved || 0) + 1; },
  closeDesktopApps() {},
  closeAppToDesktop() {},
  desktopUnlocked: false,
  syncEventCalendarEntries() {},
}, context.window.GameModules.eventActions, context.window.GameModules.ui.event.viewHelpers);

store.openEventApp();
assert.strictEqual(store.eventState.primaryTab, 'events');
assert.strictEqual(store.eventState.inboxBudgetTiers.length, 5);

store.socialInbox = [context.window.GameModules.socialInbox.normalizeItem({
  id: 'i1',
  actorId: 'a1',
  actorName: '刘思琪',
  channel: 'wechat',
  want: '约饭',
  needPlayerWhy: '确认方案',
  urgency: 0.8,
  relationToPlayer: '同事',
  affection: 72,
  familiarity: 55,
  status: 'pending',
  createdAt: '2026-07-26T12:00:00.000Z',
})];
store.openEventApp();
assert.strictEqual(store.eventState.primaryTab, 'inbox');
assert.strictEqual(store.eventState.inboxFilter, 'pending');
assert.strictEqual(store.currentInboxList().length, 1);
assert.strictEqual(store.selectedInboxItem().actorName, '刘思琪');
assert.strictEqual(store.drivePrimaryTabs().find((t) => t.id === 'inbox').count, 1);

store.socialInbox = [context.window.GameModules.socialInbox.normalizeItem({
  id: 'i2',
  actorId: 'a2',
  actorName: '陈默',
  channel: 'call',
  want: '回电',
  status: 'prepared',
  createdAt: '2026-07-26T13:00:00.000Z',
})];
store.openEventApp();
assert.strictEqual(store.eventState.primaryTab, 'inbox');
assert.strictEqual(store.eventState.inboxFilter, 'prepared');
assert.strictEqual(store.currentInboxList()[0].actorName, '陈默');

store.setInboxFilter('pending');
assert.strictEqual(store.currentInboxList().length, 0);
assert.strictEqual(store.selectedInboxItem(), null);
assert.match(store.inboxListEmptyText(), /待处理/);
store.setInboxFilter('prepared');
assert.match(store.inboxListEmptyText(), /已备稿/);

store.setDrivePrimaryTab('tempo');
store.setInboxBudgetTier(0, 'expected', 1.5);
assert.ok(store.eventState.inboxBudgetTiers[0].hardCap >= 2);
assert.ok(store._saved >= 1);

store.resetInboxBudgetTiers();
store.socialInbox = [];
store.rpgStates = {
  'npc-1': {
    id: 'npc-1',
    profile: {
      name: '陈默',
      socialDrive: {
        relationToPlayer: '朋友',
        familiarity: 60,
        lastContactAt: '2026-07-20T00:00:00.000Z',
        reach: ['call'],
        agenda: {
          short: '回电确认行程',
          needPlayer: true,
          needPlayerWhy: '行程有变',
          urgency: 0.7,
          cooldownUntil: '',
        },
      },
    },
    metrics: { playerFeelings: { 好感: 50 } },
  },
};

const created = context.window.GameModules.socialInbox.settle(store, 80 * 3600, {
  random: () => 0.5,
  nowMs: Date.parse('2026-07-26T15:00:00+08:00'),
});
assert.ok(created.length >= 1, 'settle should create with default tiers');

// old save without new fields
store.eventState = {
  open: true,
  tab: 'random',
  selectedId: '',
  message: '',
  currentContext: null,
  randomProbability: 10,
  events: [],
  draft: {},
};
store.initEventSystem();
assert.strictEqual(store.eventState.primaryTab, 'events');
assert.strictEqual(store.eventState.inboxFilter, 'pending');
assert.strictEqual(store.eventState.inboxBudgetTiers.length, 5);

// assign order smoke: fallback first then eventActions should win
const fallback = {
  drivePrimaryTabs() { return [{ id: 'broken' }]; },
  setDrivePrimaryTab() { throw new Error('fallback'); },
};
const merged = Object.assign({}, fallback, context.window.GameModules.eventActions);
assert.notStrictEqual(merged.drivePrimaryTabs.call(store)[0].id, 'broken');

console.log('PASS drive-app-smoke');
