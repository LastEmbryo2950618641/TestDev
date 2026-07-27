const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relPath });
}

function createContext() {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        rpgState: {
          seed(value) {
            return Array.from(String(value || '')).reduce((hash, char) => ((hash * 31) ^ char.charCodeAt(0)) >>> 0, 2166136261);
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/prompt-sections.js');
  loadScript(context, 'publish/character-profile.js');
  return context;
}

function makeRaw() {
  const entries = Array.from({ length: 17 }, (_, index) => index + 1);
  return {
    name: '刘悠',
    role: '程序工程师，计算机科学与技术硕士',
    workplace: ' 成都悠云科技有限公司 ',
    position: ' 程序工程师 ',
    department: ' 平台研发部 ',
    school: ' 电子科技大学 ',
    grade: ' 硕士毕业 ',
    education: ' 计算机科学与技术硕士 ',
    factions: entries.map((index) => ({ faction: `研发社群${index}`, role: '成员', reason: '既有社群角色依据。' })),
    memberships: entries.map((index) => ({ orgName: `悠云组织${index}`, title: '工程师', reason: '既有人事归属依据。' })),
    certificates: entries.map((index) => ({ orgName: `发证机构${index}`, field: '软件工程', level: '专业级', reason: '既有证书依据。' })),
    titles: entries.map((index) => ({ society: `技术社群${index}`, field: '软件工程', title: '技术骨干', reason: '已有称号依据。' })),
  };
}

function evidenceChanges(base) {
  return [
    ['workplace', '新的工作单位'], ['position', '新的职位'], ['department', '新的部门'], ['school', '新的学校'], ['grade', '新的年级'], ['education', '软件工程博士'],
    ['factions', base.factions.map((item, index) => index ? item : { ...item, faction: '新的社群' })],
    ['memberships', base.memberships.map((item, index) => index ? item : { ...item, orgName: '新的组织' })],
    ['certificates', base.certificates.map((item, index) => index ? item : { ...item, level: '新的证书等级' })],
    ['titles', base.titles.map((item, index) => index ? item : { ...item, title: '新的称号' })],
  ];
}

test('normalize preserves trimmed organizational and educational evidence', () => {
  const tool = createContext().window.GameModules.characterProfile;
  const raw = makeRaw();
  const normalized = tool.normalize(raw);

  assert.strictEqual(normalized.workplace, '成都悠云科技有限公司');
  assert.strictEqual(normalized.position, '程序工程师');
  assert.strictEqual(normalized.department, '平台研发部');
  assert.strictEqual(normalized.school, '电子科技大学');
  assert.strictEqual(normalized.grade, '硕士毕业');
  assert.strictEqual(normalized.education, '计算机科学与技术硕士');
  ['factions', 'memberships', 'certificates', 'titles'].forEach((key) => {
    assert.strictEqual(JSON.stringify(normalized[key]), JSON.stringify(raw[key].slice(0, 16)));
  });
});

test('characterBase supplies organizational and educational evidence to the prompt', () => {
  const context = createContext();
  const raw = makeRaw();
  const normalized = context.window.GameModules.characterProfile.normalize(raw);
  const text = context.window.GameModules.promptSections.characterBase(normalized);

  ['成都悠云科技有限公司', '程序工程师', '平台研发部', '电子科技大学', '硕士毕业', '计算机科学与技术硕士'].forEach((value) => {
    assert.ok(text.includes(value), `missing ${value}`);
  });
  ['factions', 'memberships', 'certificates', 'titles'].forEach((key) => {
    assert.ok(text.includes(JSON.stringify(raw[key].slice(0, 16))), `missing ${key} evidence`);
  });
});

test('normalize snapshots evidence arrays with bounded structural fields', () => {
  const tool = createContext().window.GameModules.characterProfile;
  const raw = makeRaw();
  raw.factions = [{ faction: ` ${'社'.repeat(100)} `, role: ` ${'员'.repeat(60)} `, reason: ` ${'据'.repeat(160)} `, ignored: { mutable: true } }];
  raw.memberships = [{ orgName: ` ${'组'.repeat(100)} `, department: ` ${'部'.repeat(100)} `, title: ` ${'职'.repeat(60)} `, reason: ` ${'据'.repeat(160)} `, departmentFog: false, ignored: { mutable: true } }];
  raw.certificates = [{ orgName: ` ${'证'.repeat(100)} `, field: ` ${'域'.repeat(100)} `, level: ` ${'级'.repeat(60)} `, reason: ` ${'据'.repeat(160)} `, ignored: { mutable: true } }];
  raw.titles = [{ society: ` ${'群'.repeat(100)} `, field: ` ${'域'.repeat(100)} `, title: ` ${'号'.repeat(60)} `, reason: ` ${'据'.repeat(160)} `, ignored: { mutable: true } }];

  const normalized = tool.normalize(raw);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.factions[0])), { faction: '社'.repeat(80), role: '员'.repeat(48), reason: '据'.repeat(120) });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.memberships[0])), { orgName: '组'.repeat(80), department: '部'.repeat(80), title: '职'.repeat(48), reason: '据'.repeat(120), departmentFog: false });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.certificates[0])), { orgName: '证'.repeat(80), field: '域'.repeat(80), level: '级'.repeat(48), reason: '据'.repeat(120) });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.titles[0])), { society: '群'.repeat(80), field: '域'.repeat(80), title: '号'.repeat(48), reason: '据'.repeat(120) });

  raw.factions[0].faction = '已变更';
  raw.factions[0].ignored.mutable = false;
  assert.strictEqual(normalized.factions[0].faction, '社'.repeat(80));
  assert.strictEqual(Object.hasOwn(normalized.factions[0], 'ignored'), false);
});

test('inputSignature changes for every organizational and educational evidence field', () => {
  const tool = createContext().window.GameModules.characterProfile;
  const base = tool.normalize(makeRaw());
  const original = tool.inputSignature(base, '', null);

  evidenceChanges(base).forEach(([key, value]) => {
    assert.notStrictEqual(tool.inputSignature({ ...base, [key]: value }, '', null), original, `signature should include ${key}`);
  });
});

test('findSavedRoleCard rejects stale signed cards after evidence changes', () => {
  const context = createContext();
  const tool = context.window.GameModules.characterProfile;
  const prior = tool.normalize(makeRaw());
  tool.isReusableRoleCard = (profile, signature) => signature === null || profile.roleCardInputSignature === signature;

  evidenceChanges(prior).forEach(([key, value]) => {
    const current = { ...prior, [key]: value };
    const stale = { profile: { name: current.name, work: current.work, roleCardInputSignature: tool.inputSignature(prior, '', null) } };
    context.window.GameModules.characterStateStore = { get: () => stale, getByName: () => null };
    assert.strictEqual(tool.findSavedRoleCard(current, tool.inputSignature(current, '', null)), null, `stale ${key} signature should not be reused`);
  });
});

test('partFieldComplete only checks membership and certificate structure', () => {
  const tool = createContext().window.GameModules.characterProfile;
  const memberships = [{ orgName: '某公司', title: '职员', reason: '结构完整但语义质量由提示词负责。' }];

  assert.strictEqual(tool.partFieldComplete(1, 'memberships', memberships, [], {}), true);
  assert.strictEqual(tool.partFieldComplete(1, 'certificates', [], [], {}), true);
});

test('all role card parts receive shared completeness rules', () => {
  const tool = createContext().window.GameModules.characterProfile;
  const wrapped = tool.partPromptWithTemplate('PART3 原始提示', { skills: [] }, 3);

  assert.ok(wrapped.includes('有事实或背景依据时必须完整生成'));
  assert.ok(wrapped.includes('完全没有事实或背景依据时才允许为空'));
  assert.ok(wrapped.includes('不得使用“某公司”“未知学校”“相关机构”'));
  assert.ok(wrapped.includes('输出前逐项自检'));
  assert.ok(wrapped.includes('PART3 原始提示'));
  assert.ok(wrapped.includes('"skills"'));
});

(async () => {
  for (const item of tests) {
    await item.fn();
    console.log(`PASS ${item.name}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
