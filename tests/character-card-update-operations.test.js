const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const state = {
  id: 'role-liuyou',
  profile: {
    id: 'role-liuyou',
    name: '刘悠',
    role: '程序工程师',
    job: '程序工程师',
    detail: '旧说明',
    personality: '沉稳',
    preferences: '实用主义',
    worldTag: '现代都市现实世界',
    factions: [{ faction: '刘家', role: '长兄', reason: '家庭事实' }],
    memberships: [{ orgName: '成都悠云科技有限公司', title: '程序工程师', department: '平台研发部', reason: '任职事实' }],
    certificates: [{ orgName: '四川大学', field: '计算机科学与技术', level: '工学硕士学位', reason: '学历事实' }],
    titles: [{ society: '成都程序员社区', field: '开源贡献', title: '年度贡献者', reason: '社区认可' }],
    socialDrive: {
      relationToPlayer: '本人',
      relationDetail: '角色即玩家本人',
      familiarity: 48,
      agenda: { short: '完成项目', deadline: '', needPlayer: false, needPlayerWhy: '', urgency: 20 },
    },
  },
  values: {
    factions: [{ faction: '刘家', role: '长兄', reason: '家庭事实' }],
    memberships: [{ orgName: '成都悠云科技有限公司', title: '程序工程师', department: '平台研发部', reason: '任职事实' }],
    skills: [],
    knowledge: [],
    professions: [],
  },
};

const saved = [];
const context = vm.createContext({
  console,
  window: {
    GameModules: {
      characterStateStore: {
        get: (id) => id === state.id ? state : null,
        getByName: (name) => name === state.profile.name ? state : null,
        save: (next) => { saved.push(next.id); return next; },
      },
      rpgState: {
        syncSocialFields(next, source) {
          if (source === 'profile') {
            next.values.factions = next.profile.factions.map((item) => ({ ...item }));
            next.values.memberships = next.profile.memberships.map((item) => ({ ...item }));
          }
        },
      },
    },
  },
});
context.window.window = context.window;
for (const file of ['publish/progression.js', 'publish/progression-definitions.js', 'publish/character-card-update-operations.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const operations = context.window.GameModules.characterCardUpdateOperations;
const subject = { id: state.id, name: state.profile.name };

function apply(field, op, value, target, extra = {}) {
  return operations.apply(null, { subject, field, op, value, target, reason: '测试依据', ...extra });
}

let result = apply(
  'memberships',
  'replace',
  { orgName: '成都悠云科技有限公司', title: '高级程序工程师', department: '平台研发部', reason: '晋升事实' },
  { orgName: '成都悠云科技有限公司', title: '程序工程师', department: '平台研发部' },
);
assert.strictEqual(result.applied, true);
assert.strictEqual(state.profile.memberships.length, 1);
assert.strictEqual(state.profile.memberships[0].title, '高级程序工程师');
assert.strictEqual(state.values.memberships[0].title, '高级程序工程师');

result = apply(
  'memberships',
  'replace',
  { orgName: '不存在组织', title: '新职位', reason: '无效替换' },
  { orgName: '不存在组织', title: '旧职位' },
);
assert.strictEqual(result.applied, false);
assert.match(result.reason, /找不到.*target/);
assert.strictEqual(state.profile.memberships.length, 1, '找不到目标不能降级为新增');

result = apply('certificates', 'delete', null, { orgName: '四川大学', field: '计算机科学与技术', level: '工学硕士学位' });
assert.strictEqual(result.applied, true);
assert.strictEqual(state.profile.certificates.length, 0);

result = apply(
  'titles',
  'replace',
  { society: '成都程序员社区', field: '开源贡献', title: '终身贡献者', reason: '新认可' },
  { society: '成都程序员社区', field: '开源贡献', title: '年度贡献者' },
);
assert.strictEqual(result.applied, true);
assert.strictEqual(state.profile.titles[0].title, '终身贡献者');

result = apply('factions', 'set', [{ faction: '错误整组', role: '成员', reason: '不允许' }]);
assert.strictEqual(result.applied, false);
assert.match(result.reason, /不允许.*set/);
assert.strictEqual(state.profile.factions[0].faction, '刘家');

result = apply('skills', 'add', { name: '系统设计', desc: '设计软件系统', level: 3, linkedStats: ['intelligence'] });
assert.strictEqual(result.applied, true);
assert.strictEqual(state.values.skills[0].name, '系统设计');
assert.strictEqual(state.values.skills[0].level, 3);
assert.strictEqual(state.values.skills[0].exp.current, 0);
assert.ok(Number.isFinite(state.values.skills[0].exp.next));

result = apply('skills', 'add', { name: ' 系统-设计 ', desc: '重复别名', level: 1, linkedStats: ['intelligence'] });
assert.strictEqual(result.applied, false);
assert.match(result.reason, /重复/);
assert.strictEqual(state.values.skills.length, 1);

for (const op of ['replace', 'delete', 'set']) {
  result = apply('skills', op, { name: '系统设计' }, { name: '系统设计' });
  assert.strictEqual(result.applied, false, `skills 不允许 ${op}`);
}

result = apply('detail', 'set', '新的完整人物说明');
assert.strictEqual(result.applied, true);
assert.strictEqual(state.profile.detail, '新的完整人物说明');

result = apply('socialDrive.familiarity', 'delta', null, null, { delta: 60 });
assert.strictEqual(result.applied, true);
assert.strictEqual(state.profile.socialDrive.familiarity, 100);

for (const field of ['name', 'gender', 'birthday', 'worldTag', 'learningAbility', 'rpgField', 'bodyProfile', 'items']) {
  result = apply(field, 'set', '禁止值');
  assert.strictEqual(result.applied, false, `${field} 必须拒绝`);
}

assert.ok(saved.length >= 1);
console.log('PASS character card updates are typed, exact, and field-owned');
