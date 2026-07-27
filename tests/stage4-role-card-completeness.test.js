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
assert.ok(shortRule.includes('仅处理本轮新确认或发生变化的稳定事实'));
assert.ok(shortRule.includes('完整社群名/具体角色'));
assert.ok(shortRule.includes('完整组织名/具体职位、学籍或成员身份'));
assert.ok(shortRule.includes('完整授予组织/具体领域/具体资格或等级'));
assert.ok(shortRule.includes('完整认可群体/具体领域/具体称号'));
assert.ok(shortRule.includes('禁止模糊占位'));

const example = loop.settlementTypeJsonExample('角色卡', participants);
for (const field of ['社群角色', '人事归属', '证书', '称号']) assert.ok(example.includes(`"field":"${field}"`));

const anti = loop.settlementTypeAntiExample('角色卡');
assert.ok(anti.includes('某公司/普通职员'));
assert.ok(anti.includes('未知学校/初中生'));

const cert = loop.buildRoleCardSettlementUpdate(subject, '证书', '增加', '四川大学/计算机科学与技术/工学硕士学位', '本轮确认学历');
assert.strictEqual(cert.field, 'profile.certificates');
assert.strictEqual(cert.change.value.orgName, '四川大学');
assert.strictEqual(cert.change.value.field, '计算机科学与技术');
assert.strictEqual(cert.change.value.level, '工学硕士学位');

const title = loop.buildRoleCardSettlementUpdate(subject, '称号', '增加', '成都程序员社区/开源贡献/年度贡献者', '本轮获得认可');
assert.strictEqual(title.field, 'profile.titles');
assert.strictEqual(title.change.value.society, '成都程序员社区');
assert.strictEqual(title.change.value.title, '年度贡献者');

assert.strictEqual(loop.buildRoleCardSettlementUpdate(subject, '社群角色', '增加', '刘家', '格式不完整'), null);
assert.strictEqual(loop.buildRoleCardSettlementUpdate(subject, '证书', '增加', '工学硕士学位', '格式不完整'), null);

const malformed = loop.parseSettlementJson(JSON.stringify({
  角色卡: [{ subject: '刘悠', field: '证书', op: '增加', value: '工学硕士学位', reason: '缺少三段结构' }],
}), { requestedTypes: ['角色卡'], participants });
assert.deepStrictEqual(Array.from(malformed.completeTypes), []);
assert.deepStrictEqual(Array.from(malformed.incompleteTypes), ['角色卡']);

const missingReason = loop.parseSettlementJson(JSON.stringify({
  角色卡: [{ subject: '刘悠', field: '证书', op: '增加', value: '四川大学/计算机科学与技术/工学硕士学位' }],
}), { requestedTypes: ['角色卡'], participants });
assert.deepStrictEqual(Array.from(missingReason.completeTypes), []);
assert.deepStrictEqual(Array.from(missingReason.incompleteTypes), ['角色卡']);

const malformedKv = loop.parseSettlementKv(`角色卡结算{
结算对象：刘悠
更新1：角色卡，证书，增加，工学硕士学位，缺少三段结构
}`, { requestedTypes: ['角色卡'], participants });
assert.deepStrictEqual(Array.from(malformedKv.completeTypes), []);
assert.deepStrictEqual(Array.from(malformedKv.incompleteTypes), ['角色卡']);

const stage4 = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage4-settlement-window.md'), 'utf8');
assert.ok(stage4.includes('角色卡完整性'));
assert.ok(stage4.includes('已经加载的完整上下文'));
assert.ok(stage4.includes('类型化 `field/op/target/value/delta` 合约'));

const webStage4 = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage4-settlement-window.js'), 'utf8');
const registeredPrompt = source => {
  const promptContext = vm.createContext({ window: {} });
  vm.runInContext(source, promptContext);
  return promptContext.window.GameModules.promptTemplates.inline['inference-stage4-settlement-window']
    .replace(/\r\n/g, '\n');
};
assert.strictEqual(registeredPrompt(webStage4), stage4.replace(/\r\n/g, '\n'));

console.log('PASS Stage4 role card completeness rules and four-field parsing');
