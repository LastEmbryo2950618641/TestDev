const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const runtimeScripts = JSON.parse(fs.readFileSync(path.join(root, 'publish/boot/scripts.json'), 'utf8'));
const operationsIndex = runtimeScripts.indexOf('character-card-update-operations.js');
assert.ok(operationsIndex >= 0, 'character card update operations must be loaded by the browser runtime');
assert.ok(operationsIndex < runtimeScripts.indexOf('update/generic-update-applier.js'));
assert.ok(operationsIndex < runtimeScripts.indexOf('real-world-actions.js'));

const calls = [];
const context = vm.createContext({
  console,
  window: {
    GameModules: {
      characterCardUpdateOperations: {
        async applyMany(store, operations) {
          calls.push({ store, operations });
          return {
            applied: [{ operation: operations[0], value: '已应用' }],
            rejected: [{ operation: operations[1], reason: '找不到指定 target' }],
          };
        },
      },
    },
  },
});
context.window.window = context.window;
vm.runInContext(fs.readFileSync(path.join(root, 'publish/real-world-actions.js'), 'utf8'), context, { filename: 'publish/real-world-actions.js' });

(async () => {
  const actions = context.window.GameModules.realWorldActions;
  const store = { id: 'store' };
  const generic = { updateType: 'generic', field: 'status_tags.test' };
  const first = { updateType: 'role-card-operation', operation: { subject: { id: 'a', name: '甲' }, field: 'detail', op: 'set', value: '新说明', reason: '依据' } };
  const second = { updateType: 'role-card-operation', operation: { subject: { id: 'b', name: '乙' }, field: 'memberships', op: 'replace', target: {}, value: {}, reason: '依据' } };
  const result = await actions.applyRoleCardOperations(store, [generic, first, second]);

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].store, store);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(calls[0].operations)), [first.operation, second.operation]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.remaining)), [generic]);
  assert.strictEqual(result.lines.length, 2);
  assert.match(result.lines[0], /角色卡：甲.*detail.*已更新/);
  assert.match(result.lines[1], /角色卡：乙.*memberships.*已拒绝.*找不到指定 target/);

  const registryContext = vm.createContext({ console, window: { GameModules: {} } });
  registryContext.window.window = registryContext.window;
  vm.runInContext(fs.readFileSync(path.join(root, 'publish/update/generic-update-applier.js'), 'utf8'), registryContext, { filename: 'publish/update/generic-update-applier.js' });
  assert.strictEqual(registryContext.window.GameModules.updateRegistry.applyOne({}, first), false);

  console.log('PASS role card operations bypass the generic update applier');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
