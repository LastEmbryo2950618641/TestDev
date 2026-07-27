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
            return String(value || '').length;
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

test('inputSignature changes when organizational or educational evidence changes', () => {
  const tool = createContext().window.GameModules.characterProfile;
  const base = tool.normalize(makeRaw());
  const changed = { ...base, education: '软件工程博士' };

  assert.notStrictEqual(tool.inputSignature(base, '', null), tool.inputSignature(changed, '', null));
});

test('partFieldComplete only checks membership and certificate structure', () => {
  const tool = createContext().window.GameModules.characterProfile;
  const memberships = [{ orgName: '某公司', title: '职员', reason: '结构完整但语义质量由提示词负责。' }];

  assert.strictEqual(tool.partFieldComplete(1, 'memberships', memberships, [], {}), true);
  assert.strictEqual(tool.partFieldComplete(1, 'certificates', [], [], {}), true);
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
