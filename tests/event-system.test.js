const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadScript(context, relativePath) {
  const file = path.join(root, relativePath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: relativePath });
}

function createContext() {
  const context = vm.createContext({
    console,
    Math,
    Date,
    window: { GameModules: {} },
  });
  context.window.window = context.window;
  return context;
}

function createStore(modules) {
  const store = {
    eventState: modules.eventSystem.defaultState(),
    calendarState: modules.calendarSystem.defaultCalendarState(),
    realWorldSceneTitle: '约会准备',
    realWorldLocationName: '中央公园',
    realWorldStatus: '平稳',
    playerName: '玩家',
    rpgStates: {
      liu: { profile: { name: '刘思琪' } },
    },
    phoneDate: () => new Date('2026-07-10T10:00:00+08:00'),
    save() {},
  };
  return Object.assign(store, modules.eventActions, modules.calendarActions);
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('random event with 100 probability is prepared for narration context', () => {
  const context = createContext();
  loadScript(context, 'publish/event-system.js');
  loadScript(context, 'publish/event-actions.js');
  loadScript(context, 'publish/calendar-system.js');
  loadScript(context, 'publish/calendar-actions.js');
  const modules = context.window.GameModules;
  const store = createStore(modules);
  assert.strictEqual(store.eventRandomProbability(), 10);
  store.setEventRandomProbability(100);
  store.upsertEvent({
    type: 'random',
    title: '突发停电',
    startDate: '2026-07-10',
    endDate: '2026-07-10',
    location: '中央公园',
    content: '园区临时停电，影响夜间活动。',
    people: ['刘思琪'],
    tags: ['突发'],
  }, { save: false });
  const triggered = store.prepareEventsForRealWorldAction('和刘思琪去中央公园散步', 'log-1');
  assert.strictEqual(triggered.length, 1);
  assert.match(store.eventStage1PromptContext('散步'), /突发停电/);
  assert.match(store.eventNarrationPromptContext('散步'), /随机事件/);
});

test('settlement json extracts event entries into final update payload', () => {
  const context = createContext();
  context.window.GameModules.jsonUtils = {
    extractJson(text = '') {
      const raw = String(text || '').trim();
      return raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    },
    repairJson(text = '') { return String(text || ''); },
    parseLoose(text = '') { return JSON.parse(this.extractJson(text)); },
  };
  loadScript(context, 'publish/event-system.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseSettlementJson(JSON.stringify({
    事件: [{
      type: 'periodic',
      title: '国庆节',
      startDate: '2026-10-01',
      endDate: '2026-10-07',
      location: '全国',
      content: '国庆假期，所有人都会受到节日安排影响。',
      people: ['所有人'],
      tags: ['节日', '假期'],
    }],
  }), { requestedTypes: ['事件'], store: { phoneDate: () => new Date('2026-07-10T00:00:00+08:00') } });
  assert.strictEqual(parsed.completeTypes.join(','), '事件');
  assert.strictEqual(parsed.events.length, 1);
  assert.strictEqual(parsed.events[0].type, 'periodic');
  const merged = loop.mergeGroupedUpdatePatches(Object.values(parsed.patchesByType), {});
  assert.strictEqual(merged.events.length, 1);
});

test('event entries are projected into calendar day ranges', () => {
  const context = createContext();
  loadScript(context, 'publish/event-system.js');
  loadScript(context, 'publish/event-actions.js');
  loadScript(context, 'publish/calendar-system.js');
  loadScript(context, 'publish/calendar-actions.js');
  const modules = context.window.GameModules;
  const store = createStore(modules);
  store.calendarState.currentYear = 2026;
  store.calendarState.currentMonth = 6;
  store.upsertEvent({
    type: 'inference',
    title: '周末约会',
    startDate: '2026-07-10',
    endDate: '2026-07-12',
    content: '两人约定周末约会。',
    people: ['刘思琪'],
    tags: ['约会'],
  }, { save: false });
  const dayEvents = store.eventsForCalendarDay(11);
  assert.ok(dayEvents.some((event) => event.source === 'event-system' && event.title.includes('周末约会')));
});

(async () => {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
