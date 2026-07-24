const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadScript(relativePath, sandbox) {
  const file = path.join(__dirname, '..', 'publish', relativePath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: relativePath });
}

function createSandbox() {
  const window = { GameModules: {} };
  window.window = window;
  const sandbox = vm.createContext({ console, window, performance: { now: () => 0 } });
  loadScript('control-experience-stage.js', sandbox);
  loadScript('character-feedback.js', sandbox);
  return sandbox.window;
}

test('control experience defaults include controller awareness unknown', () => {
  const window = createSandbox();
  const store = {
    characterRpgState: {
      id: 'rel-ai-247528',
      values: {},
    },
    rpgStates: {},
  };
  const exp = window.GameModules.characterFeedback.ensureExperience(store);
  assert.equal(exp.controllerAwarenessLevel, 'unknown');
  assert.equal(exp.controllerAwareness, '尚不知晓控制者是谁');
});

test('normalizeControllerAwareness clamps summary to 20 chars and validates level', () => {
  const window = createSandbox();
  const stage = window.GameModules.controlExperienceStage;
  const normalized = stage.normalizeControllerAwareness({
    controllerAwarenessLevel: 'traitKnown',
    controllerAwareness: '感到操控者冷静算计、占有欲强，但不知姓名身份是谁啊多出来的字',
  });
  assert.equal(normalized.controllerAwarenessLevel, 'traitKnown');
  assert.ok(normalized.controllerAwareness.length <= 20);
  assert.match(normalized.controllerAwareness, /冷静|占有|不知/);

  const bad = stage.normalizeControllerAwareness({
    controllerAwarenessLevel: 'hacked',
    controllerAwareness: '',
  });
  assert.equal(bad.controllerAwarenessLevel, 'unknown');
  assert.equal(bad.controllerAwareness, '尚不知晓控制者是谁');
});

test('applyExperience persists controller awareness from feedback', async () => {
  const window = createSandbox();
  const saved = [];
  window.GameModules.characterStateStore = {
    save: async (state) => { saved.push(state); return true; },
  };
  const store = {
    characterRpgState: {
      id: 'rel-ai-247528',
      values: {},
    },
    rpgStates: {},
  };
  await window.GameModules.characterFeedback.applyExperience(store, {
    controlFeeling: '紧绷',
    adaptation: 12,
    experienceSummary: '身体失控但仍清醒旁观。',
    controllerAwarenessLevel: 'traitKnown',
    controllerAwareness: '察觉操控者冷静强势但不知是谁',
  });
  const exp = store.characterRpgState.values.control_experience;
  assert.equal(exp.controllerAwarenessLevel, 'traitKnown');
  assert.equal(exp.controllerAwareness, '察觉操控者冷静强势但不知是谁');
  assert.equal(exp.feeling, '紧绷');
  assert.equal(exp.onlineCount, 1);
});

test('awareness prompt rule forbids naming player when unknown', () => {
  const window = createSandbox();
  const rule = window.GameModules.controlExperienceStage.controllerAwarenessNarrationRule({
    controllerAwarenessLevel: 'unknown',
    controllerAwareness: '尚不知晓控制者是谁',
    playerName: '刘悠',
    targetName: '刘思琪',
  });
  assert.match(rule, /不知道|不知晓/);
  assert.match(rule, /禁止.*刘悠|不得点名/);
});
