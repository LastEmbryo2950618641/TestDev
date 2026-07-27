# Role Card Context Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让角色卡所有可推演字段在存在事实或背景依据时一次性生成完整具体内容，同时让代码只校验结构、不判断自然语言名称是否足够完整。

**Architecture:** 在 `characterProfile.normalize()` 与 `promptSections.characterBase()` 中保留并传递组织、职位、学校、年级、学历和既有社会字段依据；在所有角色卡分段提示词的公共组装处注入统一完整性规则，并强化 Part1、缺失字段及 Stage4 结算提示词。Stage4 主提示词、专用提示词、动态短规则、JSON 合约、示例和反例使用同一套四类身份格式；现有代码继续只检查结构，不新增组织名称词典、模糊词黑名单、旧存档迁移或额外 AI 请求。

**Tech Stack:** 浏览器全局模块 `window.GameModules`、原生 JavaScript、Markdown 提示词、Node.js `assert`/`vm` 测试、`tools/sync-prompt-md.js`、`scripts/sync-inline-assets.js`、Android WebView 静态资源镜像。

---

## 文件职责与变更边界

- `publish/character-profile.js`：保留角色原始推演依据；为所有角色卡分段注入通用完整性规则；维持纯结构校验。
- `publish/prompt-sections.js`：把标准化后的单位、岗位、学校、年级、学历及既有四类身份依据写入人物基础区。
- `publish/prompts/character-profile-part1-base-identity.md`：规定四类身份字段的完整名称、具体角色和单次输出前自检。
- `publish/prompts/character-profile-missing-fields.md`：确保结构缺失修复同样遵守“有依据必补全、禁止模糊占位”。
- `publish/prompts/推演引擎/update/role-card-update-prompt.md`：稳定事实更新时完整归类并补齐角色卡字段。
- `publish/prompts/推演引擎/update/membership-update-prompt.md`：删除“未逐字出现就禁止生成”的歧义，要求依据上下文补成完整组织与具体身份。
- `publish/prompts/推演引擎/stage4-settlement-window.md`：本轮存在角色卡稳定变化时不得以空数组为由省略更新，同时保留“无本轮变化可为空”的边界。
- `publish/real-world-agent-loop.js`：统一 Stage4 动态类型短规则、JSON 合约、正确示例和反例中的四类身份格式。
- 上述 Markdown 对应 `.js`、`publish/inference-prompts-runtime.js`：生成文件，不直接手工编辑。
- `mobile/android-webview-shell/app/src/main/assets/publish/**`：通过资产同步命令生成的 Android 镜像，不直接手工编辑。
- `tests/character-profile-context-completeness.test.js`：验证依据保留、公共规则注入和纯结构校验边界。
- `tests/character-profile-prompt-completeness.test.js`：验证提示词强制规则、事实读取边界及 Markdown/JS 内容一致。
- `tests/stage4-role-card-completeness.test.js`：验证 Stage4 主提示词和动态输出规则完整覆盖四类身份，并保持介绍卡与旧存档边界。

### Task 1: 用测试锁定原始依据保留与结构校验边界

**Files:**
- Create: `tests/character-profile-context-completeness.test.js`
- Modify: `publish/character-profile.js:129-160,718-728,890-906,2670-2690`
- Modify: `publish/prompt-sections.js:44-50`

- [ ] **Step 1: 编写失败测试，证明标准化当前会丢失组织与教育依据**

创建 `tests/character-profile-context-completeness.test.js`，使用 `vm` 加载两个浏览器模块，并加入以下核心断言：

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const context = vm.createContext({ console, window: { GameModules: {} } });
context.window.window = context.window;
for (const file of ['publish/prompt-sections.js', 'publish/character-profile.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const tool = context.window.GameModules.characterProfile;
const base = tool.normalize({
  name: '刘悠',
  role: '程序工程师，计算机科学与技术硕士',
  workplace: '成都悠云科技有限公司',
  position: '程序工程师',
  department: '平台研发部',
  school: '电子科技大学',
  grade: '硕士毕业',
  education: '计算机科学与技术硕士',
  factions: [{ faction: '刘家', role: '长兄', reason: '家庭关系。' }],
  memberships: [{ orgName: '成都悠云科技有限公司', title: '程序工程师', reason: '任职信息。' }],
  certificates: [{ orgName: '电子科技大学', field: '计算机科学与技术', level: '硕士', reason: '学历信息。' }],
  titles: [],
}, { currentWorldTag: () => '2026 现代都市现实世界' });

assert.strictEqual(base.workplace, '成都悠云科技有限公司');
assert.strictEqual(base.position, '程序工程师');
assert.strictEqual(base.department, '平台研发部');
assert.strictEqual(base.school, '电子科技大学');
assert.strictEqual(base.grade, '硕士毕业');
assert.strictEqual(base.education, '计算机科学与技术硕士');
assert.strictEqual(base.memberships.length, 1);
assert.strictEqual(base.certificates.length, 1);

const section = context.window.GameModules.promptSections.characterBase(base);
['成都悠云科技有限公司', '程序工程师', '平台研发部', '电子科技大学', '硕士毕业', '计算机科学与技术硕士'].forEach((text) => {
  assert.ok(section.includes(text), `人物基础区应保留：${text}`);
});

assert.strictEqual(tool.partFieldComplete(1, 'memberships', [
  { orgName: '某公司', title: '职员', reason: '结构完整但语义质量由提示词负责。' },
], [], base), true);
assert.strictEqual(tool.partFieldComplete(1, 'certificates', [], [], base), true);

console.log('PASS character profile keeps inference evidence and validates structure only');
```

- [ ] **Step 2: 运行测试并确认失败原因是字段未保留**

Run: `node tests/character-profile-context-completeness.test.js`

Expected: FAIL，首个失败断言显示 `base.workplace` 为 `undefined`，而不是模块加载错误。

- [ ] **Step 3: 在标准化结果中保留原始推演依据与既有四类字段**

在 `normalize()` 返回对象中加入：

```js
workplace: String(data.workplace || '').trim().slice(0, 80),
position: String(data.position || '').trim().slice(0, 48),
department: String(data.department || '').trim().slice(0, 80),
school: String(data.school || '').trim().slice(0, 80),
grade: String(data.grade || '').trim().slice(0, 48),
education: String(data.education || '').trim().slice(0, 120),
factions: Array.isArray(data.factions) ? data.factions.slice(0, 16) : [],
memberships: Array.isArray(data.memberships) ? data.memberships.slice(0, 16) : [],
certificates: Array.isArray(data.certificates) ? data.certificates.slice(0, 16) : [],
titles: Array.isArray(data.titles) ? data.titles.slice(0, 16) : [],
```

同时把 `workplace`、`position`、`department`、`school`、`grade`、`education`、`certificates`、`titles` 加入 `inputSignature()` 的 `base` 对象，确保这些依据变化后不会错误复用旧角色卡。

- [ ] **Step 4: 把保留的依据写入人物基础提示区**

在 `promptSections.characterBase()` 的 `lines()` 数组中加入：

```js
['工作/学校/组织依据', base.workplace],
['职位/学籍/年级依据', base.position],
['部门依据', base.department],
['学校依据', base.school],
['年级依据', base.grade],
['学历/资格依据', base.education],
['已有社群角色依据', JSON.stringify(base.factions || [])],
['已有人事归属依据', JSON.stringify(base.memberships || [])],
['已有证书依据', JSON.stringify(base.certificates || [])],
['已有称号依据', JSON.stringify(base.titles || [])],
```

- [ ] **Step 5: 运行测试并确认代码只做结构校验**

Run: `node tests/character-profile-context-completeness.test.js`

Expected: `PASS character profile keeps inference evidence and validates structure only`。其中“某公司/职员”仍通过结构校验，空证书数组仍可通过结构校验，证明未引入语义黑名单或证据感知代码校验。

- [ ] **Step 6: 提交依据传递改动**

```bash
git add publish/character-profile.js publish/prompt-sections.js tests/character-profile-context-completeness.test.js
git commit -m "fix(profile): preserve contextual identity evidence"
```

### Task 2: 为全部角色卡分段注入统一完整性规则

**Files:**
- Modify: `tests/character-profile-context-completeness.test.js`
- Modify: `publish/character-profile.js:718-728`

- [ ] **Step 1: 扩展测试，要求所有分段都收到通用完整性规则**

在 Task 1 测试结尾加入：

```js
const wrapped = tool.partPromptWithTemplate('PART3 原始提示', { skills: [] }, 3);
assert.ok(wrapped.includes('有事实或背景依据时必须完整生成'));
assert.ok(wrapped.includes('完全没有事实或背景依据时才允许为空'));
assert.ok(wrapped.includes('不得使用“某公司”“未知学校”“相关机构”'));
assert.ok(wrapped.includes('输出前逐项自检'));
assert.ok(wrapped.includes('PART3 原始提示'));
assert.ok(wrapped.includes('"skills"'));
```

- [ ] **Step 2: 运行测试并确认公共规则尚不存在**

Run: `node tests/character-profile-context-completeness.test.js`

Expected: FAIL at `wrapped.includes('有事实或背景依据时必须完整生成')`。

- [ ] **Step 3: 增加公共规则函数并由模板组装统一注入**

在 `partPromptWithTemplate()` 前增加：

```js
roleCardCompletenessRules() {
  return [
    '## 角色卡通用完整性规则（强制）',
    '- 明确事实优先，禁止覆盖或改写输入已确定的内容。',
    '- 所有可推演字段有事实或背景依据时必须完整生成；完全没有事实或背景依据时才允许为空。',
    '- 缺少次要细节时，依据世界观、年代、地区、年龄、职业、教育经历、家庭与组织关系作最小充分推演。',
    '- 不得使用“某公司”“未知学校”“相关机构”“普通职员”“成员”等模糊占位或上位概念规避补全。',
    '- 推演的具体名称必须与时代、地区、组织类型和人物经历一致，不得制造冲突或无关扩张。',
    '- 输出前逐项自检：检查全部模板字段是否存在有依据却遗漏、留空、简写或模糊化的内容；完成后只输出最终结果。',
  ].join('\n');
},
```

将 `partPromptWithTemplate()` 返回数组调整为先放原提示，再放 `this.roleCardCompletenessRules()`，最后放现有模板骨架；不得增加任何 AI 调用。

- [ ] **Step 4: 运行测试验证所有角色卡分段共享规则**

Run: `node tests/character-profile-context-completeness.test.js`

Expected: PASS。

- [ ] **Step 5: 提交通用规则改动**

```bash
git add publish/character-profile.js tests/character-profile-context-completeness.test.js
git commit -m "feat(profile): require complete contextual generation"
```

### Task 3: 强化四类身份与缺失字段提示词

**Files:**
- Create: `tests/character-profile-prompt-completeness.test.js`
- Modify: `publish/prompts/character-profile-part1-base-identity.md`
- Modify: `publish/prompts/character-profile-missing-fields.md`
- Generate: `publish/prompts/character-profile-part1-base-identity.js`
- Generate: `publish/prompts/character-profile-missing-fields.js`

- [ ] **Step 1: 编写失败的提示词契约测试**

创建 `tests/character-profile-prompt-completeness.test.js`：

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const part1 = read('publish/prompts/character-profile-part1-base-identity.md');
const missing = read('publish/prompts/character-profile-missing-fields.md');

[
  '有事实或背景依据时必须生成并完整归类',
  '完整社群名',
  '完整组织名',
  '具体职位、学籍或成员身份',
  '完整授予组织',
  '完整认可群体',
  '成都第一中学 / 初三学生',
  '只有完全没有事实或背景依据时才允许为空',
  '输出前强制自检',
].forEach((rule) => assert.ok(part1.includes(rule), `Part1 缺少规则：${rule}`));

assert.ok(!part1.includes('仍不要编造未出现的组织或角色'));
assert.ok(!part1.includes('学生尽量写到'));
assert.ok(missing.includes('有依据却遗漏、留空、简写或模糊化'));
assert.ok(missing.includes('不得使用模糊占位'));

for (const name of ['character-profile-part1-base-identity', 'character-profile-missing-fields']) {
  const context = vm.createContext({ window: { GameModules: { promptTemplates: { inline: {} } } } });
  context.window.window = context.window;
  vm.runInContext(read(`publish/prompts/${name}.js`), context);
  const id = name;
  assert.strictEqual(context.window.GameModules.promptTemplates.inline[id], read(`publish/prompts/${name}.md`));
}

console.log('PASS character profile prompts require complete contextual output');
```

- [ ] **Step 2: 运行测试并确认旧提示词因规则不足而失败**

Run: `node tests/character-profile-prompt-completeness.test.js`

Expected: FAIL with `Part1 缺少规则：有事实或背景依据时必须生成并完整归类`。

- [ ] **Step 3: 重写 Part1 四类字段与单次自检规则**

在 Part1 的“社群角色 / 人事归属 / 证书 / 称号”部分明确写入以下规则，替换“仍不要编造未出现的组织或角色”和“尽量写到”等弱约束：

```markdown
- 只要资料或背景存在依据，就必须生成并完整归类；只有完全没有事实或背景依据时才允许对应字段为空。
- 社群角色必须形成 `<完整社群名>/<具体角色>`，人事归属必须形成 `<完整组织名>/<具体职位、学籍或成员身份>`。
- 证书必须形成 `<完整授予组织>/<具体领域>/<具体资格或等级>`，称号必须形成 `<完整认可群体>/<具体领域>/<具体称号>`。
- 输入未逐字给出专名或次要细节时，必须依据世界观、年代、地区、年龄、职业、教育经历和人物关系作最小充分推演。
- 禁止使用“某公司”“未知学校”“相关机构”“初中生”“普通职员”“成员”等模糊占位或过度概括。
- 例如，已知成都且是初三学生，应生成类似 `成都第一中学 / 初三学生` 的具体归属；不能写 `某中学 / 初三学生`、`成都第一中学 / 初中生` 或 `学校 / 学生`。示例不要求固定使用该校名。

## 输出前强制自检

1. 逐项核对人物基础区、玩家资料区、关系事件区与世界观资料区。
2. 检查所有角色卡字段是否存在有依据却遗漏、留空、简写或模糊化的内容。
3. 检查四类身份是否归类正确且每项组成完整。
4. 检查合理推演是否与明确事实、时代、地区和人物经历冲突。
5. 完成自检后只输出最终 JSON，不输出分析过程。
```

保留“普通职位、学历不能自动变成称号”“无依据允许空证书/称号”和现实/非现实世界国籍边界。

- [ ] **Step 4: 强化缺失字段提示词**

在 `character-profile-missing-fields.md` 的模板说明前加入：

```markdown
修复时必须重新核对“原始要求”和“已合格字段”中的事实及背景依据。有依据却遗漏、留空、简写或模糊化的内容必须完整补齐；完全没有事实或背景依据时才允许为空。不得使用模糊占位，也不得覆盖已合格字段。
```

- [ ] **Step 5: 生成两份 Markdown 对应的运行时 JavaScript**

Run:

```bash
node tools/sync-prompt-md.js publish/prompts/character-profile-part1-base-identity.md --kind template --id character-profile-part1-base-identity
node tools/sync-prompt-md.js publish/prompts/character-profile-missing-fields.md --kind template --id character-profile-missing-fields
```

Expected: 输出两条对应 `.js` 路径。

- [ ] **Step 6: 运行提示词契约测试**

Run: `node tests/character-profile-prompt-completeness.test.js`

Expected: `PASS character profile prompts require complete contextual output`。

- [ ] **Step 7: 提交角色卡生成提示词改动**

```bash
git add publish/prompts/character-profile-part1-base-identity.md publish/prompts/character-profile-part1-base-identity.js publish/prompts/character-profile-missing-fields.md publish/prompts/character-profile-missing-fields.js tests/character-profile-prompt-completeness.test.js
git commit -m "fix(prompts): require complete role card identity fields"
```

### Task 4: 统一角色卡更新与人事归属更新提示词

**Files:**
- Modify: `tests/character-profile-prompt-completeness.test.js`
- Modify: `publish/prompts/推演引擎/update/role-card-update-prompt.md`
- Modify: `publish/prompts/推演引擎/update/membership-update-prompt.md`
- Generate: `publish/prompts/推演引擎/update/role-card-update-prompt.js`
- Generate: `publish/prompts/推演引擎/update/membership-update-prompt.js`
- Generate: `publish/inference-prompts-runtime.js`

- [ ] **Step 1: 扩展测试，锁定更新提示词的完整性与事实边界**

在提示词契约测试中加入：

```js
const roleUpdate = read('publish/prompts/推演引擎/update/role-card-update-prompt.md');
const membershipUpdate = read('publish/prompts/推演引擎/update/membership-update-prompt.md');

for (const prompt of [roleUpdate, membershipUpdate]) {
  assert.ok(prompt.includes('有事实或背景依据'));
  assert.ok(prompt.includes('完整组织名'));
  assert.ok(prompt.includes('具体职位'));
  assert.ok(prompt.includes('合理推演'));
  assert.ok(prompt.includes('不得与明确事实或当前设定冲突'));
}
assert.ok(!membershipUpdate.includes('仍禁止编造未出现的组织或职位'));
assert.ok(roleUpdate.includes('只有稳定事实变化才写'));
assert.ok(membershipUpdate.includes('正文或已载入资料中出现'));
```

- [ ] **Step 2: 运行测试并确认更新提示词仍含歧义**

Run: `node tests/character-profile-prompt-completeness.test.js`

Expected: FAIL，至少缺少“合理推演”或仍包含“仍禁止编造未出现的组织或职位”。

- [ ] **Step 3: 修改角色卡更新提示词**

在四类字段规则中加入：

```markdown
- 已有稳定事实或背景依据时必须完整写入，不得因组织专名、部门、年级或资格授予主体未逐字出现而省略。
- 缺少次要细节时，应根据当前世界观、年代、地区、人物身份与既有经历作最小充分的合理推演，补成完整组织名与具体角色/职位/学籍/资格；不得与明确事实或当前设定冲突。
- 完全没有事实或背景依据时允许不写；禁止使用“某组织”“未知学校”“相关机构”“成员”等模糊占位。
```

保留“只有稳定事实变化才写”，防止把推演补全误解为虚构已经发生的新事件。

- [ ] **Step 4: 修改人事归属更新提示词**

把“仍禁止编造未出现的组织或职位”替换为：

```markdown
- 已有组织身份事实或背景依据时必须写入完整组织名与具体职位、学籍、年级或成员身份；缺少次要细节时按世界观、年代、地区和人物经历作最小充分的合理推演。
- 合理推演用于补全已有组织身份，不能制造与正文、已载入资料或当前设定冲突的新任职事件。
- 完全没有事实或背景依据时不写；不得使用“某公司”“未知学校”“相关机构”“职员”“成员”等模糊占位。
```

- [ ] **Step 5: 生成更新提示词脚本与推演运行时包**

Run:

```bash
node tools/sync-prompt-md.js "publish/prompts/推演引擎/update/role-card-update-prompt.md" --kind template --id inference-update-role-card
node tools/sync-prompt-md.js "publish/prompts/推演引擎/update/membership-update-prompt.md" --kind template --id inference-update-membership
node scripts/sync-inline-assets.js
```

Expected: 两个 `.js` 更新，最后输出 `inline assets synced`；`publish/inference-prompts-runtime.js` 包含新的提示词正文。

- [ ] **Step 6: 运行提示词契约测试与现有推演提示词测试**

Run:

```bash
node tests/character-profile-prompt-completeness.test.js
node tests/real-world-loop-update.test.js
```

Expected: 两条命令均退出码 0。

- [ ] **Step 7: 提交更新提示词改动**

```bash
git add publish/prompts/推演引擎/update/role-card-update-prompt.md publish/prompts/推演引擎/update/role-card-update-prompt.js publish/prompts/推演引擎/update/membership-update-prompt.md publish/prompts/推演引擎/update/membership-update-prompt.js publish/inference-prompts-runtime.js tests/character-profile-prompt-completeness.test.js
git commit -m "fix(prompts): complete contextual membership updates"
```

### Task 5: 统一 Stage4 主提示词与动态输出规则

**Files:**
- Create: `tests/stage4-role-card-completeness.test.js`
- Modify: `publish/prompts/推演引擎/stage4-settlement-window.md`
- Modify: `publish/real-world-agent-loop.js:2911-2970,3000-3040,3180-3265`
- Generate: `publish/prompts/推演引擎/stage4-settlement-window.js`
- Generate: `publish/inference-prompts-runtime.js`

- [ ] **Step 1: 编写失败测试，锁定 Stage4 完整链路要求**

创建 `tests/stage4-role-card-completeness.test.js`：

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const stage4 = read('publish/prompts/推演引擎/stage4-settlement-window.md');
const loopSource = read('publish/real-world-agent-loop.js');

assert.ok(stage4.includes('本轮存在角色卡稳定事实时不得返回空数组'));
assert.ok(stage4.includes('只处理本轮新确认或发生变化的稳定事实'));
assert.ok(stage4.includes('不能借机扫描或修复旧角色卡缺项'));
assert.ok(stage4.includes('介绍卡人物不得自动升格'));

[
  '<完整社群名>/<具体角色>',
  '<完整组织名>/<具体职位、学籍或成员身份>',
  '<完整授予组织>/<具体领域>/<具体资格或等级>',
  '<完整认可群体>/<具体领域>/<具体称号>',
].forEach((rule) => assert.ok(loopSource.includes(rule), `动态 Stage4 规则缺少：${rule}`));

const context = vm.createContext({
  console,
  window: { GameModules: {} },
  setTimeout,
  clearTimeout,
});
context.window.window = context.window;
vm.runInContext(loopSource, context, { filename: 'publish/real-world-agent-loop.js' });
const loop = context.window.GameModules.realWorldAgentLoop;
const roleRule = loop.settlementTypeShortRule('角色卡');
const membershipRule = loop.settlementTypeShortRule('人事归属');
const roleExample = loop.settlementTypeJsonExample('角色卡', [{ type: 'character', name: '刘悠' }], {});
const roleAntiExample = loop.settlementTypeAntiExample('角色卡');

['社群角色', '人事归属', '证书', '称号'].forEach((field) => {
  assert.ok(roleRule.includes(field), `角色卡短规则缺少：${field}`);
});
assert.ok(membershipRule.includes('完整组织名'));
assert.ok(membershipRule.includes('只补全已经成立的本轮稳定事实'));
assert.ok(roleExample.includes('证书'));
assert.ok(roleExample.includes('称号'));
assert.ok(roleAntiExample.includes('某公司/职员'));
assert.ok(roleAntiExample.includes('某学校/学生'));
assert.ok(roleAntiExample.includes('相关机构/证书'));

console.log('PASS Stage4 role card chain requires complete contextual updates');
```

如果直接加载完整循环模块需要额外浏览器桩，只补齐模块初始化所需的最小空对象或函数；不得跳过对四个公开 helper 返回文本的断言，也不得改成只搜索源码。

- [ ] **Step 2: 运行测试并确认 Stage4 主提示词或动态规则缺失**

Run: `node tests/stage4-role-card-completeness.test.js`

Expected: FAIL，首个失败为主提示词缺少“本轮存在角色卡稳定事实时不得返回空数组”，或动态规则缺少证书/称号格式；不得是语法或路径错误。

- [ ] **Step 3: 强化 Stage4 主结算提示词**

在 `stage4-settlement-window.md` 的“内部稳定事实”和“输出硬规则”中加入：

```markdown
【角色卡稳定事实完整性】
- Stage4 只处理本轮新确认或发生变化的稳定事实；不能借机扫描或修复旧角色卡缺项。
- 本轮存在角色卡稳定事实时不得返回空数组；必须按角色卡或人事归属类型完整写入。
- 缺少组织专名、部门、年级、授予主体等次要细节时，可依据当前世界观、年代、地区、人物身份和已有经历作最小充分推演；合理推演只补全已经成立的本轮稳定事实，不能制造新的入职、转学、获证或获奖事件。
- 没有本轮角色卡稳定变化时对应类型输出 []。
- 角色卡更新只作用于玩家卡和已有完整角色卡；介绍卡人物不得自动升格，空壳 stub 仍不得作为完整角色卡更新。
```

保留通用“空数组合法”规则，但紧随其后补充“角色卡/人事归属在本轮存在稳定变化时不得为空”的特例，避免两条规则互相覆盖。

- [ ] **Step 4: 扩展角色卡与人事归属动态短规则**

在 `settlementTypeShortRule()` 中将 `角色卡` 规则替换为包含以下完整文本的数组，并同步强化 `人事归属`：

```js
'角色卡': [
  '只更新玩家卡和已有完整角色卡的本轮新确认或变化稳定事实；介绍卡/空壳 stub 不得自动升格，也不扫描旧角色卡缺项。',
  '本轮存在稳定变化时必须写入；只有本轮完全没有相关变化时才输出空数组。',
  '合理推演只补全已经成立的本轮稳定事实所缺少的专名和次要细节，不能制造新事件，且不得与正文或当前设定冲突。',
  '社群角色格式=<完整社群名>/<具体角色>。',
  '人事归属格式=<完整组织名>/<具体职位、学籍或成员身份>；同一组织身份优先走人事归属专用类型，禁止重复写两次。',
  '证书格式=<完整授予组织>/<具体领域>/<具体资格或等级>。',
  '称号格式=<完整认可群体>/<具体领域>/<具体称号>。',
  '禁止用某公司、未知学校、相关机构、初中生、普通职员、成员等模糊占位或上位概念规避补全。',
].join(''),
'人事归属': [
  '只处理本轮正文新确认或变化的组织身份；不扫描旧角色卡缺项。',
  '每项必须包含完整组织名、具体职位/学籍/年级/成员身份、部门或 departmentFog、reason；可带 orgId。',
  '合理推演只补全已经成立的本轮稳定事实，不能制造新任职或转学事件。',
  '本轮有组织身份稳定变化时必须写；只有没有本轮变化时才输出空数组。',
  '与势力 structure 占坑可同时存在但需一致；与角色卡中的相同人事归属不得重复。',
].join(''),
```

- [ ] **Step 5: 扩展 JSON 合约、正确示例和错误反例**

将角色卡 JSON 合约说明改为：

```js
if (type === '角色卡') return '角色卡：数组；每项 {"subject":"姓名","field":"字段","op":"替换/增加","value":"内容","reason":"证据","result":"结果"}；社群角色=<完整社群名>/<具体角色>；人事归属=<完整组织名>/<具体职位、学籍或成员身份>；证书=<完整授予组织>/<具体领域>/<具体资格或等级>；称号=<完整认可群体>/<具体领域>/<具体称号>；本轮无变化 []。';
```

把 `settlementTypeJsonExample('角色卡')` 改为同一数组内展示四项，使用具体但非固定业务数据：

```js
if (type === '角色卡') return `"角色卡":[{"subject":"${subject}","field":"社群角色","op":"增加","value":"刘家/长兄","reason":"正文明确家庭身份","result":"写入社群角色"},{"subject":"${subject}","field":"人事归属","op":"增加","value":"成都悠云科技有限公司/程序工程师","reason":"正文明确任职事实","result":"写入人事归属"},{"subject":"${subject}","field":"证书","op":"增加","value":"电子科技大学/计算机科学与技术/硕士","reason":"正文明确学历事实","result":"写入证书"},{"subject":"${subject}","field":"称号","op":"增加","value":"成都市软件行业协会/软件工程/优秀青年工程师","reason":"正文明确行业认可","result":"写入称号"}]`;
```

将角色卡反例扩展为明确包含 `某公司/职员`、`某学校/学生`、`相关机构/证书`、缺少本轮事实却凭空新增，以及将介绍卡自动升格；正确说明必须指出“依据存在则补成完整格式，无本轮变化则 []”。

- [ ] **Step 6: 生成 Stage4 脚本与推演运行时包**

Run:

```bash
node tools/sync-prompt-md.js "publish/prompts/推演引擎/stage4-settlement-window.md" --kind template --id inference-stage4-settlement-window
node scripts/sync-inline-assets.js
```

Expected: 输出 Stage4 `.js` 路径和 `inline assets synced`；`publish/inference-prompts-runtime.js` 包含新的 Stage4 主规则。

- [ ] **Step 7: 运行 Stage4 定向测试**

Run:

```bash
node tests/stage4-role-card-completeness.test.js
node tests/real-world-loop-update.test.js
node tests/settlement-social-pipeline.test.js
```

Expected: 三条命令退出码均为 0；新测试打印 `PASS Stage4 role card chain requires complete contextual updates`。

- [ ] **Step 8: 提交 Stage4 完整链路改动**

```bash
git add publish/prompts/推演引擎/stage4-settlement-window.md publish/prompts/推演引擎/stage4-settlement-window.js publish/real-world-agent-loop.js publish/inference-prompts-runtime.js tests/stage4-role-card-completeness.test.js
git commit -m "fix(stage4): require complete role card updates"
```

### Task 6: 同步 Android 镜像并完成回归验证

**Files:**
- Generate: `mobile/android-webview-shell/app/src/main/assets/publish/character-profile.js`
- Generate: `mobile/android-webview-shell/app/src/main/assets/publish/prompt-sections.js`
- Generate: `mobile/android-webview-shell/app/src/main/assets/publish/prompts/character-profile-part1-base-identity.{md,js}`
- Generate: `mobile/android-webview-shell/app/src/main/assets/publish/prompts/character-profile-missing-fields.{md,js}`
- Generate: `mobile/android-webview-shell/app/src/main/assets/publish/prompts/推演引擎/update/role-card-update-prompt.{md,js}`
- Generate: `mobile/android-webview-shell/app/src/main/assets/publish/prompts/推演引擎/update/membership-update-prompt.{md,js}`
- Generate: `mobile/android-webview-shell/app/src/main/assets/publish/inference-prompts-runtime.js`
- Generate: `mobile/android-webview-shell/app/src/main/assets/publish/real-world-agent-loop.js`
- Generate: `mobile/android-webview-shell/app/src/main/assets/publish/prompts/推演引擎/stage4-settlement-window.{md,js}`

- [ ] **Step 1: 同步 Web 权威实现到 Android WebView 资产**

Run: `npm run android:sync-assets`

Expected: 命令退出码 0，Android 对应文件与 `publish/` 一致。

- [ ] **Step 2: 运行本功能定向测试**

Run:

```bash
node tests/character-profile-context-completeness.test.js
node tests/character-profile-prompt-completeness.test.js
node tests/character-profile-country-membership.test.js
node tests/profile-identity-section-source.test.js
node tests/rpg-social-field-consistency.test.js
node tests/player-identity-profile-list-fields.test.js
node tests/stage4-role-card-completeness.test.js
node tests/real-world-loop-update.test.js
node tests/settlement-social-pipeline.test.js
```

Expected: 全部退出码 0；新测试打印各自 PASS，既有四类字段显示与双向一致性测试继续通过。

- [ ] **Step 3: 验证平台资产与运行时语法**

Run:

```bash
npm run verify:assets
npm run verify:required-runtime-syntax
```

Expected: 两条命令退出码 0。

- [ ] **Step 4: 运行共享验证并区分本次问题与既有边界故障**

Run: `npm run verify:shared`

Expected: 本次涉及的测试与资产验证通过。如果仍仅因已知的 `publish/player-aspiration-actions.js` 直接 `sqliteSave` 仓储边界违规失败，记录为既有无关阻塞，不在本任务扩大修复范围；若出现任何本次文件相关失败，必须修复后重新运行。

- [ ] **Step 5: 检查最终差异没有语义硬校验或额外 AI 请求**

Run:

```bash
git diff --check
git diff -- publish/character-profile.js publish/prompt-sections.js publish/prompts tests/character-profile-context-completeness.test.js tests/character-profile-prompt-completeness.test.js
```

Expected: `git diff --check` 无输出；差异中不存在组织名称字典、模糊词拒绝正则、证据内容判定函数或第二次 Part1 AI 调用。

- [ ] **Step 6: 提交 Android 镜像与最终验证状态**

```bash
git add mobile/android-webview-shell/app/src/main/assets/publish
git commit -m "chore(android): sync role card completeness assets"
```

提交前使用 `git status --short` 确认没有把与本任务无关的用户改动加入暂存区。
