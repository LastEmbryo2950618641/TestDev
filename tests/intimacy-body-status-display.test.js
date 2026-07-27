const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadRpgFieldUi() {
  const context = { console, window: { GameModules: {} } };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish', 'rpg-field-ui.js'), 'utf8'), context);
  return context.window.GameModules.rpgFieldUi;
}

test('body status presentation shows recorded values even when pendingAiInit is true', () => {
  const ui = loadRpgFieldUi();
  ui.identityTargetId = 'npc-1';
  ui.rpgStates = {
    'npc-1': {
      id: 'npc-1',
      profile: { id: 'npc-1', name: '刘思琪', gender: '女', work: '2026 现代都市现实世界' },
    },
  };

  const bodyField = {
    key: 'bodyStatus',
    stateId: 'npc-1',
    pendingAiInit: true,
    raw: [
      {
        partKey: 'overall',
        part: '整体',
        status: '稳定',
        description: '整体娇躯柔嫩，肌肤光洁如脂。',
        pendingAiInit: true,
        initializedByAi: false,
      },
    ],
  };

  const view = ui.intimacyBodyPresentation([bodyField]);
  assert.strictEqual(view.bodyRows.length, 1);
  assert.strictEqual(view.bodyRows[0].title, '整体');
  assert.strictEqual(view.bodyRows[0].value, '稳定');
  assert.strictEqual(view.bodyRows[0].preview, '整体娇躯柔嫩，肌肤光洁如脂。');
});

