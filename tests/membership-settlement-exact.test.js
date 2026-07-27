const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const calls = [];
const context = vm.createContext({
  console,
  window: {
    GameModules: {
      app: { orgTerritory: {} },
      characterCardUpdateOperations: {
        apply(store, operation) {
          calls.push({ store, operation });
          return operation.target?.orgName === '不存在组织'
            ? { applied: false, reason: 'memberships 找不到指定 target', operation }
            : { applied: true, reason: operation.reason, operation, value: operation.value || operation.target };
        },
      },
    },
  },
});
context.window.window = context.window;
vm.runInContext(fs.readFileSync(path.join(root, 'publish/app/org-territory/settlement-actions.js'), 'utf8'), context, { filename: 'publish/app/org-territory/settlement-actions.js' });

const actions = context.window.GameModules.app.orgTerritory.settlementActions;
const store = { id: 'store' };
const replacement = {
  subject: { id: 'role-liuyou', name: '刘悠' },
  field: 'memberships',
  op: 'replace',
  target: { orgName: '成都悠云科技有限公司', title: '程序工程师', department: '平台研发部' },
  value: { orgName: '成都悠云科技有限公司', title: '高级程序工程师', department: '平台研发部', reason: '晋升事实' },
  reason: '正文确认晋升',
};

let result = actions.applyMembershipUpdate(store, { updateType: 'membership', operation: replacement });
assert.strictEqual(result.ok, true);
assert.strictEqual(calls.length, 1);
assert.strictEqual(calls[0].operation.op, 'replace');
assert.deepStrictEqual(JSON.parse(JSON.stringify(calls[0].operation.target)), replacement.target);

result = actions.applyMembershipUpdate(store, {
  updateType: 'membership',
  operation: {
    ...replacement,
    target: { orgName: '不存在组织', title: '旧职位' },
    value: { orgName: '不存在组织', title: '新职位', reason: '无效替换' },
  },
});
assert.strictEqual(result.ok, false);
assert.match(result.text, /找不到指定 target/);

const source = fs.readFileSync(path.join(root, 'publish/app/org-territory/settlement-actions.js'), 'utf8').replace(/\r\n/g, '\n');
const membershipBody = source.match(/applyMembershipUpdate\(store, update = \{\}\) \{([\s\S]*?)\n  \},\n\n  applyOrgStatus/u)?.[1] || '';
assert.ok(membershipBody);
assert.doesNotMatch(membershipBody, /upsertCharacterMembership|change\.mode/);

console.log('PASS membership settlement delegates exact typed operations');
