const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function load(rel, context) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
}

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
});

load('publish/social-event-boundary.js', context);
load('publish/character-social-drive.js', context);
load('publish/character-intro-card.js', context);
load('publish/social-inbox.js', context);
load('publish/event-system.js', context);
load('publish/event-actions.js', context);

const boundary = context.window.GameModules.socialEventBoundary;
assert.ok(boundary);
assert.match(boundary.divisionBlock(), /日常驱动与事件系统分工/);
assert.match(boundary.divisionBlock(), /Social Inbox/);
assert.match(boundary.divisionBlock(), /大地图事件/);
assert.match(boundary.divisionBlock(), /禁止/);
assert.match(boundary.stage1Ops(), /Stage1/);
assert.match(boundary.stage2Ops(), /Stage2/);
assert.match(boundary.stage4EventSettlementLines().join('\n'), /Social Inbox/);

const inbox = context.window.GameModules.socialInbox;
const inboxCtx = inbox.formatContext([{
  id: 'i1',
  actorName: '陈默',
  relationToPlayer: '同事',
  affection: 40,
  familiarity: 50,
  channel: 'call',
  want: '问表格',
  needPlayerWhy: '赶方案',
  urgency: 0.6,
  hasWechatContact: false,
  mayRequestWechat: true,
  status: 'pending',
}]);
assert.match(inboxCtx, /日常驱动与事件系统分工/);
assert.match(inboxCtx, /陈默/);
assert.match(inboxCtx, /禁止写成「为了服务玩家剧情」/);
assert.match(inboxCtx, /好友申请|禁止直接把对方加为/);

const store = {
  eventState: context.window.GameModules.eventSystem.defaultState(),
  phoneDate: () => new Date('2026-07-10T10:00:00+08:00'),
  playerName: '玩家',
  rpgStates: {},
  realWorldLocationName: '天府大道',
  save() {},
};
Object.assign(store, context.window.GameModules.eventActions);
store.initEventSystem();
store.upsertEvent({
  type: 'inference',
  title: '市级马拉松',
  startDate: '2026-07-10',
  endDate: '2026-07-10',
  location: '天府大道',
  content: '交通管制',
  people: ['所有人'],
  tags: ['比赛'],
}, { save: false });
const narration = store.eventNarrationPromptContext('去公司');
assert.match(narration, /日常驱动与事件系统分工/);
assert.match(narration, /市级马拉松/);
assert.match(narration, /Social Inbox/);

const stage1Md = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage1-guided-query.md'), 'utf8');
const stage2Md = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage2-scene-anchor.md'), 'utf8');
assert.match(stage1Md, /日常驱动与事件Stage1要点/);
assert.match(stage2Md, /日常驱动与事件系统分工/);
assert.match(stage2Md, /日常驱动与事件Stage2要点/);
assert.match(stage2Md, /日常驱动与事件Stage2要点/);

const scripts = JSON.parse(fs.readFileSync(path.join(root, 'publish/boot/scripts.json'), 'utf8'));
assert.ok(scripts.includes('social-event-boundary.js'));
assert.ok(scripts.indexOf('social-event-boundary.js') < scripts.indexOf('social-inbox.js'));

const loopSrc = fs.readFileSync(path.join(root, 'publish/real-world-agent-loop.js'), 'utf8');
assert.match(loopSrc, /socialEventBoundary/);
assert.match(loopSrc, /stage4EventSettlementLines|stage1Ops/);

const ctxSrc = fs.readFileSync(path.join(root, 'publish/real-world-agent-context.js'), 'utf8');
assert.match(ctxSrc, /divisionBlock/);

console.log('PASS social-event-boundary');
