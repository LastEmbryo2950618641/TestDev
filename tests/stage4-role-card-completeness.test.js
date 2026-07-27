const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console, performance: { now: () => 0 }, setTimeout, window: {} });
context.window.window = context.window;
context.window.console = console;
context.window.GameModules = {};
vm.runInContext(fs.readFileSync(path.join(root, 'publish/real-world-agent-loop.js'), 'utf8'), context);

const loop = context.window.GameModules.realWorldAgentLoop;
const subject = { type: 'character', id: 'role-liuyou', name: '刘悠' };
const participants = [subject];

const shortRule = loop.settlementTypeShortRule('角色卡');
assert.ok(shortRule.includes('已经加载的完整上下文'));
assert.ok(shortRule.includes('缺失、模糊、不完整'));
assert.ok(shortRule.includes('factions'));
assert.ok(shortRule.includes('memberships'));
assert.ok(shortRule.includes('certificates'));
assert.ok(shortRule.includes('titles'));
assert.ok(shortRule.includes('禁止整组替换'));

const example = loop.settlementTypeJsonExample('角色卡', participants);
for (const field of ['memberships', 'certificates', 'titles']) assert.ok(example.includes(`"field":"${field}"`));
assert.ok(example.includes('"op":"replace"'));
assert.ok(example.includes('"target"'));

const anti = loop.settlementTypeAntiExample('角色卡');
assert.ok(anti.includes('旧输出格式'));
assert.ok(anti.includes('找不到 target'));

const parsed = loop.parseSettlementJson(JSON.stringify({
  角色卡: [
    {
      subject: { id: subject.id, name: subject.name },
      field: 'memberships',
      op: 'replace',
      target: { orgName: '成都悠云科技有限公司', title: '程序工程师', department: '平台研发部' },
      value: { orgName: '成都悠云科技有限公司', title: '高级程序工程师', department: '平台研发部', reason: '晋升事实' },
      reason: '正文确认晋升',
    },
    {
      subject: { id: subject.id, name: subject.name },
      field: 'certificates',
      op: 'add',
      value: { orgName: '中华人民共和国人力资源和社会保障部', field: '软件技术', level: '高级资格', reason: '通过认证' },
      reason: '正文确认通过认证',
    },
    {
      subject: { id: subject.id, name: subject.name },
      field: 'titles',
      op: 'delete',
      target: { society: '成都程序员社区', field: '开源贡献', title: '年度贡献者' },
      reason: '正文确认称号撤销',
    },
  ],
}), { requestedTypes: ['角色卡'], participants });

assert.deepStrictEqual(Array.from(parsed.completeTypes), ['角色卡']);
assert.deepStrictEqual(Array.from(parsed.incompleteTypes), []);
assert.strictEqual(parsed.genericUpdates.length, 3);
for (const update of parsed.genericUpdates) {
  assert.strictEqual(update.updateType, 'role-card-operation');
  assert.ok(update.operation.subject.id === subject.id);
}
assert.strictEqual(parsed.genericUpdates[0].operation.field, 'memberships');
assert.strictEqual(parsed.genericUpdates[0].operation.op, 'replace');

const membershipType = loop.parseSettlementJson(JSON.stringify({
  人事归属: [{
    subject: { id: subject.id, name: subject.name },
    field: 'memberships',
    op: 'replace',
    target: { orgName: '成都悠云科技有限公司', title: '程序工程师', department: '平台研发部' },
    value: { orgName: '成都悠云科技有限公司', title: '高级程序工程师', department: '平台研发部', reason: '晋升事实' },
    reason: '正文确认晋升',
  }],
}), { requestedTypes: ['人事归属'], participants });
assert.deepStrictEqual(Array.from(membershipType.completeTypes), ['人事归属']);
assert.strictEqual(membershipType.genericUpdates[0].updateType, 'role-card-operation');
assert.strictEqual(membershipType.genericUpdates[0].operation.op, 'replace');

for (const invalidEntry of [
  { subject: subject.name, field: '证书', op: '增加', value: '四川大学/软件工程/硕士', reason: '旧输出格式' },
  { subject: { id: subject.id, name: subject.name }, field: 'name', op: 'set', value: '新姓名', reason: '锁定字段' },
  { subject: { id: subject.id, name: subject.name }, field: 'skills', op: 'replace', target: { name: '编程' }, value: { name: '开发' }, reason: '非法修改' },
  { subject: { id: subject.id, name: subject.name }, field: 'certificates', op: 'add', value: { orgName: '四川大学', field: '软件工程', level: '硕士' } },
]) {
  const invalid = loop.parseSettlementJson(JSON.stringify({ 角色卡: [invalidEntry] }), { requestedTypes: ['角色卡'], participants });
  assert.deepStrictEqual(Array.from(invalid.completeTypes), []);
  assert.deepStrictEqual(Array.from(invalid.incompleteTypes), ['角色卡']);
  assert.strictEqual(invalid.genericUpdates.length, 0);
}

const stage4 = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage4-settlement-window.md'), 'utf8').replace(/\r\n/g, '\n');
assert.ok(stage4.includes('角色卡完整性'));
assert.ok(stage4.includes('已经加载的完整上下文'));
assert.ok(stage4.includes('类型化 `field/op/target/value/delta` 合约'));

const webStage4 = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage4-settlement-window.js'), 'utf8');
const promptContext = vm.createContext({ window: {} });
vm.runInContext(webStage4, promptContext);
assert.strictEqual(
  promptContext.window.GameModules.promptTemplates.inline['inference-stage4-settlement-window'].replace(/\r\n/g, '\n'),
  stage4,
);

console.log('PASS Stage4 role card parser uses typed operations');
