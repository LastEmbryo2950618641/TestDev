const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadScript(context, relativePath) {
  const file = path.join(root, relativePath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relativePath });
}

function createApplySandbox() {
  const window = {
    GameModules: {
      updateRegistry: {
        types: [],
        register(type) { this.types = this.types.filter((item) => item.id !== type.id).concat(type); },
        typeForChange() { return null; },
      },
    },
  };
  window.window = window;
  const sandbox = vm.createContext({ console, window, performance: { now: () => 0 } });
  loadScript(sandbox, 'publish/control-experience-stage.js');
  loadScript(sandbox, 'publish/update/control-experience-update.js');
  loadScript(sandbox, 'publish/update/generic-update-applier.js');
  return sandbox.window;
}

function createLoopContext() {
  const context = {
    console,
    performance: { now: () => 0 },
    setTimeout,
    clearTimeout,
    window: {},
  };
  context.window.window = context.window;
  context.window.console = console;
  context.window.GameModules = {
    jsonUtils: {
      extractJson(text = '') {
        const raw = String(text || '').trim();
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start < 0 || end < start) throw new Error('JSON missing');
        return raw.slice(start, end + 1);
      },
      repairJson(text = '') { return String(text || ''); },
      parseLoose(text = '') { return JSON.parse(this.extractJson(text)); },
    },
    aiRequest: { outputTailLooksTruncated: () => false, complete: async () => '{}' },
    ai: {
      normalizeChoices: (choices, fallback = []) => (
        Array.isArray(choices) && choices.length ? choices.slice(0, 4) : fallback.slice(0, 4)
      ),
    },
    promptTemplates: { render: async (_id, vars) => JSON.stringify(vars) },
    updateRegistry: null,
    characterScheduleUpdates: { coalesce: (rows) => rows },
  };
  return vm.createContext(context);
}

function createStore(state) {
  return {
    rpgStates: { [state.id]: state },
    sharedControlState: () => state,
    itemSkillState: (id) => (id === state.id ? state : null),
  };
}

test('apply control-experience: adaptation delta, text overwrite, onlineCount +1', () => {
  const window = createApplySandbox();
  const state = {
    id: 'rel-ai-247528',
    name: '刘思琪',
    values: {
      control_experience: {
        onlineCount: 2,
        feeling: '疑惑',
        adaptation: 10,
        summary: '身体失控旁观。',
        controllerAwarenessLevel: 'unknown',
        controllerAwareness: '尚不知晓控制者是谁',
        lastUpdated: '',
      },
    },
  };
  const store = createStore(state);
  const ok = window.GameModules.updateRegistry.applyOne(store, {
    updateType: 'control-experience',
    subject: { type: 'character', id: 'rel-ai-247528', name: '刘思琪' },
    field: 'values.control_experience',
    change: {
      mode: 'merge',
      value: {
        needUpdate: true,
        updateFields: ['feeling', 'adaptation', 'summary', 'controllerAwarenessLevel', 'controllerAwareness'],
        feeling: '紧绷抗拒',
        adaptation: '+5',
        summary: '被迫自触并旁观失控。',
        controllerAwarenessLevel: 'traitKnown',
        controllerAwareness: '感到操控者冷静强势但不知是谁',
        reason: '正文中她察觉操控风格冷静算计',
      },
    },
    reasons: [{ evidence: '正文证据' }],
  });
  assert.equal(ok, true);
  const exp = state.values.control_experience;
  assert.equal(exp.onlineCount, 3);
  assert.equal(exp.adaptation, 15);
  assert.equal(exp.feeling, '紧绷抗拒');
  assert.equal(exp.summary, '被迫自触并旁观失控。');
  assert.equal(exp.controllerAwarenessLevel, 'traitKnown');
  assert.equal(exp.controllerAwareness, '感到操控者冷静强势但不知是谁');
});

test('needUpdate false does not change experience', () => {
  const window = createApplySandbox();
  const state = {
    id: 'rel-ai-247528',
    values: {
      control_experience: {
        onlineCount: 1,
        feeling: '疑惑',
        adaptation: 8,
        summary: '初遇失控。',
        controllerAwarenessLevel: 'unknown',
        controllerAwareness: '尚不知晓控制者是谁',
      },
    },
  };
  const store = createStore(state);
  const ok = window.GameModules.updateRegistry.applyOne(store, {
    updateType: 'control-experience',
    subject: { type: 'character', id: 'rel-ai-247528' },
    field: 'values.control_experience',
    change: { mode: 'merge', value: { needUpdate: false } },
  });
  assert.equal(ok, false);
  assert.equal(state.values.control_experience.onlineCount, 1);
  assert.equal(state.values.control_experience.adaptation, 8);
});

test('Stage4 parseSettlementJson + queue for 操控体验', () => {
  const context = createLoopContext();
  loadScript(context, 'publish/control-experience-stage.js');
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/update/generic-update-applier.js');
  loadScript(context, 'publish/update/control-experience-update.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  assert.ok(loop);

  assert.ok(loop.settlementTypeQueue({ mode: 'story' }, {}).includes('操控体验'));
  assert.ok(!loop.settlementTypeQueue({ mode: 'real' }, { sharedControlState: () => null }).includes('操控体验'));
  assert.ok(loop.settlementTypeQueue({ mode: 'real' }, { sharedControlState: () => ({ id: 'rel-ai-247528' }) }).includes('操控体验'));

  const participants = [{ type: 'character', id: 'rel-ai-247528', name: '刘思琪', idOrName: 'rel-ai-247528' }];
  const parsed = loop.parseSettlementJson(
    JSON.stringify({
      操控体验: [{
        subject: '刘思琪',
        needUpdate: true,
        updateFields: ['feeling', 'adaptation', 'summary', 'controllerAwarenessLevel', 'controllerAwareness'],
        feeling: '紧绷抗拒',
        adaptation: '+5',
        summary: '被迫旁观身体失控。',
        controllerAwarenessLevel: 'traitKnown',
        controllerAwareness: '感到操控者冷静强势但不知是谁',
        reason: '正文明确被控体验证据',
      }],
    }),
    { requestedTypes: ['操控体验'], participants, store: {}, config: { mode: 'real' } },
  );
  assert.ok(parsed.completeTypes.includes('操控体验'));
  assert.equal(parsed.genericUpdates.length, 1);
  assert.equal(parsed.genericUpdates[0].updateType, 'control-experience');
  assert.equal(parsed.genericUpdates[0].change.value.adaptation, '+5');

  const rejected = loop.parseControlExperienceJsonEntry({
    needUpdate: true,
    updateFields: ['adaptation'],
    adaptation: '45',
    reason: 'x',
  }, participants[0], participants);
  assert.equal(rejected, null);

  const skipped = loop.parseSettlementJson(
    JSON.stringify({ 操控体验: [{ subject: '刘思琪', needUpdate: false }] }),
    { requestedTypes: ['操控体验'], participants, store: {}, config: { mode: 'real' } },
  );
  assert.ok(skipped.completeTypes.includes('操控体验'));
  assert.equal(skipped.genericUpdates[0].change.value.needUpdate, false);
});
