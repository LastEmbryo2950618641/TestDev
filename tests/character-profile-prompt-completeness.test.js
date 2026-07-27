const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const part1 = read('publish/prompts/character-profile-part1-base-identity.md');
const missing = read('publish/prompts/character-profile-missing-fields.md');
const roleCardUpdate = read('publish/prompts/推演引擎/update/role-card-update-prompt.md');
const membershipUpdate = read('publish/prompts/推演引擎/update/membership-update-prompt.md');

assert.ok(part1.includes('有事实或背景依据时必须生成并完整补全'));
assert.ok(part1.includes('完全没有事实或背景依据时才允许为空'));
assert.ok(part1.includes('合理推演完整组织名'));
assert.ok(part1.includes('成都第一中学 / 初三学生'));
assert.ok(part1.includes('完整授予组织 / 具体领域 / 具体资格或等级'));
assert.ok(part1.includes('完整认可群体 / 具体领域 / 具体称号'));
assert.ok(part1.includes('输出前逐项自检'));
assert.ok(!part1.includes('仍不要编造未出现的组织或角色'));
assert.ok(!part1.includes('学生尽量写到'));

assert.ok(missing.includes('有事实或背景依据时必须完整补全'));
assert.ok(missing.includes('完全没有事实或背景依据时才允许为空'));
assert.ok(missing.includes('禁止模糊占位'));
assert.ok(missing.includes('输出前逐项自检'));

assert.ok(roleCardUpdate.includes('仅更新玩家或已有完整角色卡的人物'));
assert.ok(roleCardUpdate.includes('类型化操作合约'));
assert.ok(roleCardUpdate.includes('`factions`'));
assert.ok(roleCardUpdate.includes('`certificates`'));
assert.ok(roleCardUpdate.includes('禁止整组替换'));
assert.ok(!roleCardUpdate.includes('change.mode'));

assert.ok(membershipUpdate.includes('仅处理本轮新确认或发生变化的稳定事实'));
assert.ok(membershipUpdate.includes('有事实或背景依据时必须完整补全'));
assert.ok(membershipUpdate.includes('完整组织名 / 具体职位、学籍或成员身份'));
assert.ok(!membershipUpdate.includes('仍禁止编造未出现的组织或职位'));

console.log('PASS character profile prompts require complete contextual inference');
