const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({
  console,
  window: { GameModules: {} },
});
context.window.window = context.window;

vm.runInContext(fs.readFileSync(path.join(root, 'publish/json-utils.js'), 'utf8'), context, { filename: 'publish/json-utils.js' });

const jsonUtils = context.window.GameModules.jsonUtils;
const broken = '{"factions":[{"name":"刘悠家庭（四川省-成都市-武侯区-）","id":","status":"待创建"},{"name":"成都市高新区科创有限公司","id":","status":"待创建"}]}';
const parsed = jsonUtils.parseLoose(broken);

assert.strictEqual(parsed.factions.length, 2);
assert.strictEqual(parsed.factions[0].id, '');
assert.strictEqual(parsed.factions[0].status, '待创建');
assert.strictEqual(parsed.factions[1].id, '');
assert.strictEqual(parsed.factions[1].status, '待创建');

console.log('PASS json-utils repairs empty string value before next property');
