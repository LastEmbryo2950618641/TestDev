const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = {
  window: {
    GameModules: {
      ui: {
        company: {
          viewHelpers: {
            currentWorkAttendance() { return this.attendanceFixture; },
          },
        },
      },
    },
  },
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'publish', 'company-attendance-actions.js'), 'utf8'),
  context,
);

const actions = context.window.GameModules.companyAttendanceActions;
const decisions = [];
const store = {
  ...actions,
  companyState: { workPromptOpen: true, pendingWork: { id: 'pending' } },
  attendanceFixture: { status: '旷班', canCheckIn: false },
  decideWorkAttendance(mode) { decisions.push(mode); },
};

assert.strictEqual(actions.companyHolidayName.call(store, new Date(2026, 4, 2)), '劳动节假期');
assert.strictEqual(actions.companyHolidayName.call(store, new Date(2026, 6, 11)), '双休日');
assert.strictEqual(store.currentWorkAttendance(), store.attendanceFixture);

store.checkWorkReminder();
assert.deepStrictEqual(decisions, ['absent']);
assert.strictEqual(store.companyState.workPromptOpen, false);
assert.strictEqual(store.companyState.pendingWork, null);

store.attendanceFixture = { status: '迟到', canCheckIn: true };
store.checkInWork();
store.attendanceFixture = { status: '上班', canCheckIn: true };
store.checkInWork();
assert.deepStrictEqual(decisions, ['absent', 'delay', 'work']);

console.log('PASS company attendance delegates view state and preserves decision branches');
