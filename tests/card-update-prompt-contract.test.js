const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

const sharedPath = 'publish/prompts/推演引擎/shared-character-card-update-policy.md';
const rolePath = 'publish/prompts/推演引擎/update/role-card-update-prompt.md';
const introPath = 'publish/prompts/推演引擎/stage5-intro-card-update.md';
const membershipPath = 'publish/prompts/推演引擎/update/membership-update-prompt.md';
const shared = read(sharedPath);
const rolePrompt = read(rolePath);
const introPrompt = read(introPath);
const membershipPrompt = read(membershipPath);

assert.match(shared, /存在推演锚点[\s\S]*必须[\s\S]*完整补全/);
assert.match(shared, /缺少具体名称[\s\S]*不是[“"]?没有依据/);
assert.match(shared, /只有连该字段类别是否适用[\s\S]*才允许为空/);
assert.match(shared, /禁止模糊占位/);
assert.match(shared, /学生[\s\S]*学校[\s\S]*具体年级/);

for (const token of ['"ops"', '"field"', '"op"', '"target"', '"value"']) {
  assert.ok(rolePrompt.includes(token), `角色卡合约必须包含 ${token}`);
}
assert.doesNotMatch(rolePrompt, /change\.mode|upsert/);
assert.match(rolePrompt, /禁止整组替换/);
for (const field of ['factions', 'memberships', 'certificates', 'titles', 'skills', 'knowledge', 'professions']) {
  assert.ok(rolePrompt.includes(`\`${field}\``), `角色卡提示词必须声明 ${field}`);
}

assert.match(introPrompt, /仅处理没有完整角色卡/);
for (const token of ['"ops"', '"field"', '"op"', '"delta"']) {
  assert.ok(introPrompt.includes(token), `介绍卡合约必须包含 ${token}`);
}

const templateContext = vm.createContext({ window: { GameModules: {} }, URL, location: { href: 'file:///' }, document: { baseURI: 'file:///' } });
vm.runInContext(read('publish/prompt-templates.js'), templateContext, { filename: 'publish/prompt-templates.js' });
const templates = templateContext.window.GameModules.promptTemplates;
assert.strictEqual(templates.sharedCharacterCardUpdatePolicyId, 'shared-character-card-update-policy');
for (const id of ['inference-stage4-settlement-window', 'inference-update-role-card', 'inference-stage5-intro-card-update']) {
  assert.ok(templates.characterCardUpdatePolicyPromptIds.includes(id), `${id} 必须自动注入共享卡片规则`);
}
for (const field of ['social.affection', 'social.familiarity', 'persona.preferences', 'persona.attraction', 'routine.tags', 'memory.facts']) {
  assert.ok(introPrompt.includes(`\`${field}\``), `介绍卡提示词必须声明 ${field}`);
}
assert.match(membershipPrompt, /"field"\s*:\s*"memberships"/);
assert.match(membershipPrompt, /"op"\s*:\s*"add\|replace\|delete"/);
assert.match(membershipPrompt, /"target"/);
assert.doesNotMatch(membershipPrompt, /upsert|change\.mode/);

const generated = [
  ['shared-character-card-update-policy', sharedPath],
  ['stage5-intro-card-update', introPath],
];
for (const [base, mdPath] of generated) {
  const jsPath = mdPath.replace(/\.md$/u, '.js');
  const context = vm.createContext({ window: {} });
  vm.runInContext(read(jsPath), context, { filename: jsPath });
  const inline = context.window.GameModules.promptTemplates.inline;
  assert.ok(Object.values(inline).includes(read(mdPath)), `${base}.js 必须由对应 Markdown 生成`);
}

console.log('PASS card update prompts use shared typed contracts');
