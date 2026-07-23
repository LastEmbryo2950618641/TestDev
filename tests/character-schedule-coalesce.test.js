const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadScheduleHelpers() {
  const windowObj = { GameModules: { updateRegistry: { register() {} } } };
  windowObj.window = windowObj;
  const context = vm.createContext({ console, window: windowObj });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/update/character-schedule-update.js'), 'utf8'), context);
  return context.window.GameModules.characterScheduleUpdates;
}

test('character schedule updates coalesce to one row per subject', () => {
  const api = loadScheduleHelpers();
  const subject = { type: 'character', id: 'rel-ai-247528', name: '刘思琪' };
  const merged = api.coalesce([
    {
      updateType: 'character-schedule',
      subject,
      field: 'characterSchedules',
      change: { mode: 'merge', value: { currentLocation: '客厅', reason: '正文确认在客厅' } },
      reasons: [{ trigger: '人事安排当前地点', evidence: '正文确认在客厅', confidence: 'confirmed' }],
    },
    {
      updateType: 'emotion',
      subject,
      field: '恐惧',
      change: { mode: 'delta', value: 8 },
    },
    {
      updateType: 'character-schedule',
      subject,
      field: 'characterSchedules',
      change: { mode: 'merge', value: { currentAction: '观察四周（被附身）', reason: '正文确认观察' } },
      reasons: [{ trigger: '人事安排当前行动', evidence: '正文确认观察', confidence: 'confirmed' }],
    },
    {
      updateType: 'character-schedule',
      subject,
      field: 'characterSchedules',
      change: { mode: 'merge', value: { availability: '在场', reason: '正文确认在场' } },
      reasons: [{ trigger: '人事安排可用状态', evidence: '正文确认在场', confidence: 'confirmed' }],
    },
  ]);

  const schedules = merged.filter((item) => item.updateType === 'character-schedule');
  assert.strictEqual(schedules.length, 1);
  assert.strictEqual(schedules[0].change.value.currentLocation, '客厅');
  assert.strictEqual(schedules[0].change.value.currentAction, '观察四周（被附身）');
  assert.strictEqual(schedules[0].change.value.availability, '在场');
  assert.strictEqual(merged.filter((item) => item.updateType === 'emotion').length, 1);
});
