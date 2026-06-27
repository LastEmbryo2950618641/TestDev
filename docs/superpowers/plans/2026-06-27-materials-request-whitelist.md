# Materials Request Whitelist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 request_context 阶段的请求资料能力统一到 `publish/prompts/materials` 下的只读 materials 白名单，避免 AI 把 `skill.method` 误写为 `skill`，并阻止资料阶段执行写入类 skill。

**Architecture:** `real-world-materials.js` 和 `work-lore-materials.js` 作为 request_context 的唯一资料请求注册表；Prompt 只展示 materials 提供的 JSON request 示例；`loadRequests()` 在执行前强制校验 materials 白名单，并记录被忽略的非法请求。动态 Skills 继续作为规则说明用于理解资料与后续结算，但不再构成 request_context 可请求清单。

**Tech Stack:** 浏览器端原生 JavaScript、`window.GameModules` 模块模式、Markdown prompt 模板、现有 Loop Agent 分阶段架构。

## Global Constraints

- 不新增第三方依赖。
- 不改变阶段 2 正文生成和阶段 3 更新 JSON 的外部接口。
- request_context 阶段只执行 `stage === 'request_context' && effect === 'readonly'` 的 materials 项。
- Prompt 中不再将动态 Skills 作为 request_context 可请求白名单。
- materials summary 必须展示明确 JSON request，不展示容易误解的 `skill.method` 主格式。
- 保留现有 `skill` + `method` 分离协议，不引入新的请求 JSON schema。
- 所有代码注释保持中文风格。

---

## File Structure

- Modify: `publish/prompts/materials/real-world-materials.js`
  - 为 materials item 增加 `stage/effect` 默认化能力。
  - 将 summary 输出改为 JSON request 示例。
  - 只展示只读 request_context 项。
  - 对写入类 item 标记为非 request_context 或从 summary 隐藏。

- Modify: `publish/prompts/materials/work-lore-materials.js`
  - 与现实 materials 使用相同展示和过滤规则。
  - 保持作品设定资料只读查询清单。

- Modify: `publish/real-world-agent-context.js`
  - 在 `loadRequests()` 执行前强制 materials 白名单校验。
  - 对非法请求做兼容归一化和 trace 记录，优先防止空执行。
  - 保持 `dispatch()` 的实际只读分派不变。

- Modify: `publish/story-agent-context.js`
  - 与现实 Loop 对齐，强制 materials 白名单校验。
  - 保持预算检查逻辑。

- Modify: `publish/prompts/real-world-engine.md`
  - 将“可请求的 skill/method 以当前资料清单和动态 Skills 为准”改为“只能使用当前资料清单列出的 JSON request”。
  - 明确动态 Skills 只作规则说明。

- Modify: `publish/prompts/story-agent-engine.md`
  - 与现实模板一致。

- Optional Test: `tools/check-materials-request-whitelist.js`
  - 如果项目无现有自动测试，可新增一个 Node 静态检查脚本验证 materials 输出与白名单行为。

---

### Task 1: 统一现实 materials 清单输出与只读过滤

**Files:**
- Modify: `publish/prompts/materials/real-world-materials.js:4-103`

**Interfaces:**
- Consumes: existing `window.GameModules.realWorldMaterials.items` array.
- Produces:
  - `realWorldMaterials.requestItems()` returns readonly request_context items.
  - `realWorldMaterials.isRequestAllowed(req)` returns boolean.
  - `realWorldMaterials.suggestRequest(req)` returns normalized request object or null.
  - `realWorldMaterials.summary(session)` outputs JSON request examples.

- [ ] **Step 1: Read current file**

Run via Read tool on:

```text
/workspace/publish/prompts/materials/real-world-materials.js
```

Expected: file contains `window.GameModules.realWorldMaterials = { items: [...] }` and existing `summary(session)` using `${item.skill}.${item.method}`.

- [ ] **Step 2: Add metadata helpers**

In `publish/prompts/materials/real-world-materials.js`, after `items` and before `list()`, add these methods:

```js
  requestItems() {
    return this.items.filter((item) => (item.stage || 'request_context') === 'request_context' && (item.effect || 'readonly') === 'readonly');
  },

  requestExample(item = {}) {
    return {
      skill: item.skill,
      method: item.method,
      params: item.paramsHint || {},
    };
  },

  isRequestAllowed(req = {}) {
    const skill = String(req.skill || '').trim();
    const method = String(req.method || '').trim();
    return this.requestItems().some((item) => item.skill === skill && item.method === method);
  },

  suggestRequest(req = {}) {
    const skill = String(req.skill || '').trim();
    const method = String(req.method || '').trim();
    const exact = this.items.find((item) => item.skill === skill && item.method === method);
    if (exact) return this.isRequestAllowed(req) ? { skill, method, params: req.params || {} } : null;
    const combined = skill && method && skill.endsWith(`.${method}`) ? skill.slice(0, -method.length - 1) : '';
    const hit = this.requestItems().find((item) => item.skill === combined && item.method === method);
    return hit ? { skill: hit.skill, method: hit.method, params: req.params || {} } : null;
  },
```

- [ ] **Step 3: Mark non-readonly items**

In the `items` array, add `stage: 'final_update', effect: 'write'` to these entries:

```js
{ id: 'faction-upsert', ... }
{ id: 'faction-position-add', ... }
{ id: 'term-add', ... }
{ id: 'wechat-send-now', ... }
{ id: 'wechat-send-past', ... }
{ id: 'item-generate', ... }
{ id: 'item-add', ... }
{ id: 'item-transfer', ... }
{ id: 'item-delete', ... }
{ id: 'item-purchase', ... }
```

Example final shape:

```js
{ id: 'term-add', title: '新增专用术语', size: 'small', maxChars: 900, skill: 'lexicon.query', method: 'addSpecialTerm', stage: 'final_update', effect: 'write', paramsHint: { world: '世界名', name: '术语名', summary: '一句话含义', description: '根据已有上下文推断出的设定', aliases: ['别名或缩写'] }, when: '查询数据库未命中，但根据已有资料能克制推断术语含义，需要把术语定义固化到词条表。' },
```

- [ ] **Step 4: Update remaining() to use requestItems()**

Replace current `remaining(session)` with:

```js
  remaining(session) {
    const usedPairs = new Set((session?.acquired || []).map((item) => `${item.skill}.${item.method}`));
    return this.requestItems().filter((item) => !usedPairs.has(`${item.skill}.${item.method}`));
  },
```

- [ ] **Step 5: Update acquiredSummary() wording**

Replace current acquired line format with one that preserves split fields:

```js
  acquiredSummary(session) {
    const acquired = session?.acquired || [];
    return acquired.length ? acquired.map((item, i) => `${i + 1}. ${item.title}｜skill=${item.skill}｜method=${item.method}｜${item.size}｜上限${item.maxChars}字`).join('\n') : '尚未通过 materials 白名单动态获取额外资料。';
  },
```

- [ ] **Step 6: Update summary() to show JSON request examples**

Replace `summary(session)` with:

```js
  summary(session) {
    const remaining = this.remaining(session);
    const left = remaining.map((item) => `- ${item.title}｜${item.size}｜上限${item.maxChars}字\n  适用：${item.when}\n  request：${JSON.stringify(this.requestExample(item))}`).join('\n');
    return [
      '当前资料清单说明：request_context 只能使用本清单列出的 JSON request 获取本次行动必需资料；不要补全全部世界。',
      '请求格式硬规则：request.skill 必须完全等于 request 示例中的 skill；request.method 必须完全等于 request 示例中的 method；禁止把 "skill.method" 整体写入 skill。',
      '资料长度规则：small 可直接读取；medium 只在必要时读取；large 禁止一次性完整加载，必须优先用关键词查询一条记录、关键词前后片段或最近指定数量。',
      `已获取资料：\n${this.acquiredSummary(session)}`,
      `仍可获取资料：\n${left || '暂无剩余资料选项。'}`,
    ].join('\n\n');
  },
```

- [ ] **Step 7: Run static syntax check**

Run:

```bash
node --check "/workspace/publish/prompts/materials/real-world-materials.js"
```

Expected: no output and exit code 0.

---

### Task 2: 统一作品 materials 清单输出与只读过滤

**Files:**
- Modify: `publish/prompts/materials/work-lore-materials.js:4-53`

**Interfaces:**
- Consumes: existing `window.GameModules.workLoreMaterials.items` array.
- Produces same helper interface as Task 1:
  - `requestItems()`
  - `requestExample(item)`
  - `isRequestAllowed(req)`
  - `suggestRequest(req)`
  - JSON request based `summary(session)`.

- [ ] **Step 1: Read current file**

Run via Read tool on:

```text
/workspace/publish/prompts/materials/work-lore-materials.js
```

Expected: file contains `window.GameModules.workLoreMaterials = { items: [...] }` and existing `summary(session)` using `${item.skill}.${item.method}`.

- [ ] **Step 2: Add helper methods**

Add the same methods from Task 1 before `skillText()`:

```js
  requestItems() {
    return this.items.filter((item) => (item.stage || 'request_context') === 'request_context' && (item.effect || 'readonly') === 'readonly');
  },

  requestExample(item = {}) {
    return {
      skill: item.skill,
      method: item.method,
      params: item.paramsHint || {},
    };
  },

  isRequestAllowed(req = {}) {
    const skill = String(req.skill || '').trim();
    const method = String(req.method || '').trim();
    return this.requestItems().some((item) => item.skill === skill && item.method === method);
  },

  suggestRequest(req = {}) {
    const skill = String(req.skill || '').trim();
    const method = String(req.method || '').trim();
    const exact = this.items.find((item) => item.skill === skill && item.method === method);
    if (exact) return this.isRequestAllowed(req) ? { skill, method, params: req.params || {} } : null;
    const combined = skill && method && skill.endsWith(`.${method}`) ? skill.slice(0, -method.length - 1) : '';
    const hit = this.requestItems().find((item) => item.skill === combined && item.method === method);
    return hit ? { skill: hit.skill, method: hit.method, params: req.params || {} } : null;
  },
```

- [ ] **Step 3: Update remaining() to use requestItems()**

Replace current `remaining(session)` with:

```js
  remaining(session) {
    const used = new Set((session?.acquired || []).map((item) => `${item.skill}.${item.method}`));
    return this.requestItems().filter((item) => !used.has(`${item.skill}.${item.method}`));
  },
```

- [ ] **Step 4: Update acquiredSummary() wording**

Replace current `acquiredSummary(session)` with:

```js
  acquiredSummary(session) {
    const acquired = session?.acquired || [];
    return acquired.length ? acquired.map((item, i) => `${i + 1}. ${item.title}｜skill=${item.skill}｜method=${item.method}｜${item.size}｜上限${item.maxChars}字`).join('\n') : '尚未通过 worklore materials 白名单动态获取原作资料。';
  },
```

- [ ] **Step 5: Update summary() to show JSON request examples**

Replace current `summary(session)` with:

```js
  summary(session) {
    const left = this.remaining(session).map((item) => `- ${item.title}｜${item.size}｜上限${item.maxChars}字\n  适用：${item.when}\n  request：${JSON.stringify(this.requestExample(item))}`).join('\n');
    return [
      '当前作品设定资料清单：request_context 只能使用本清单列出的 JSON request 获取本次行动必需资料；不要补完整个原作。',
      '请求格式硬规则：request.skill 必须完全等于 request 示例中的 skill；request.method 必须完全等于 request 示例中的 method；禁止把 "skill.method" 整体写入 skill。',
      '资料边界：优先 README、常驻设定、索引；large 资料必须用关键词、人物名、地点、时间或阶段精确查询。',
      `已获取资料：\n${this.acquiredSummary(session)}`,
      `仍可获取资料：\n${left || '暂无剩余资料选项。'}`,
    ].join('\n\n');
  },
```

- [ ] **Step 6: Run static syntax check**

Run:

```bash
node --check "/workspace/publish/prompts/materials/work-lore-materials.js"
```

Expected: no output and exit code 0.

---

### Task 3: 强制现实 Loop 使用 materials 白名单

**Files:**
- Modify: `publish/real-world-agent-context.js:173-191`

**Interfaces:**
- Consumes:
  - `materials.optionFor(req)` existing.
  - `materials.suggestRequest(req)` from Task 1.
  - `materials.isRequestAllowed(req)` from Task 1.
- Produces:
  - `loadRequests()` skips non-whitelisted request_context requests.
  - `loadRequests()` normalizes common `skill.method` mistake if it maps to a readonly material.

- [ ] **Step 1: Read current loadRequests implementation**

Run via Read tool on:

```text
/workspace/publish/real-world-agent-context.js
```

Focus lines `173-191`.

- [ ] **Step 2: Replace loadRequests with whitelist version**

Replace the entire `async loadRequests(...)` method with:

```js
  async loadRequests(store, action, requests = [], loadedKeys = new Set(), materialSession = null, materials = window.GameModules.realWorldMaterials) {
    const out = [];
    for (const rawReq of requests.slice(0, 3)) {
      const rawSkill = String(rawReq?.skill || '').trim();
      const rawMethod = String(rawReq?.method || '').trim();
      const rawParams = rawReq?.params && typeof rawReq.params === 'object' ? rawReq.params : {};
      const suggested = materials?.suggestRequest?.({ skill: rawSkill, method: rawMethod, params: rawParams });
      const req = suggested || { skill: rawSkill, method: rawMethod, params: rawParams };
      const skill = String(req.skill || '').trim();
      const method = String(req.method || '').trim();
      const params = req.params && typeof req.params === 'object' ? req.params : {};
      if (!skill || !method) continue;
      const material = materials?.optionFor?.({ skill, method, params });
      const allowed = material && (material.stage || 'request_context') === 'request_context' && (material.effect || 'readonly') === 'readonly' && materials?.isRequestAllowed?.({ skill, method, params });
      if (!allowed) {
        console.warn('[Materials] 忽略非 request_context 只读白名单请求:', { skill: rawSkill, method: rawMethod, params: rawParams });
        continue;
      }
      const key = this.materialRequestKey(skill, method, params, materials);
      if (loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const max = material.maxChars || this.maxFor(skill);
      const text = await this.dispatch(store, action, skill, method, { ...params, maxChars: max });
      if (text) {
        const title = `${skill}.${method}`;
        materials?.record?.(materialSession, { skill, method, params }, title, text);
        out.push({ title, text, max });
      }
    }
    return out;
  },
```

- [ ] **Step 3: Run static syntax check**

Run:

```bash
node --check "/workspace/publish/real-world-agent-context.js"
```

Expected: no output and exit code 0.

---

### Task 4: 强制剧情 Loop 使用 materials 白名单

**Files:**
- Modify: `publish/story-agent-context.js:82-104`

**Interfaces:**
- Consumes:
  - `materials.suggestRequest(req)` from Task 2.
  - `materials.isRequestAllowed(req)` from Task 2.
  - existing budget logic `hasBudget(loaded, current, out, max)`.
- Produces:
  - Story `loadRequests()` skips non-whitelisted request_context requests.
  - Story `loadRequests()` normalizes common `skill.method` mistake if it maps to readonly material.

- [ ] **Step 1: Read current loadRequests implementation**

Run via Read tool on:

```text
/workspace/publish/story-agent-context.js
```

Focus lines `82-104`.

- [ ] **Step 2: Replace loadRequests with whitelist version**

Replace the entire `async loadRequests(...)` method with:

```js
  async loadRequests(store, action, requests = [], loadedKeys = new Set(), materialSession = null, materials = window.GameModules.workLoreMaterials, memoryIds = new Set(), loaded = [], current = []) {
    const out = [];
    for (const rawReq of requests.slice(0, 3)) {
      const rawSkill = String(rawReq?.skill || '').trim();
      const rawMethod = String(rawReq?.method || '').trim();
      const rawParams = rawReq?.params && typeof rawReq.params === 'object' ? rawReq.params : {};
      const suggested = materials?.suggestRequest?.({ skill: rawSkill, method: rawMethod, params: rawParams });
      const req = suggested || { skill: rawSkill, method: rawMethod, params: rawParams };
      const skill = String(req.skill || '').trim();
      const method = String(req.method || '').trim();
      const params = req.params && typeof req.params === 'object' ? req.params : {};
      if (!skill || !method) continue;
      const material = materials?.optionFor?.({ skill, method, params });
      const allowed = material && (material.stage || 'request_context') === 'request_context' && (material.effect || 'readonly') === 'readonly' && materials?.isRequestAllowed?.({ skill, method, params });
      if (!allowed) {
        console.warn('[Materials] 忽略非 request_context 只读白名单请求:', { skill: rawSkill, method: rawMethod, params: rawParams });
        continue;
      }
      const memoryTarget = skill === 'memory.query' ? String(params.characterId || params.id || store.character?.id || '').trim() : '';
      const broadMemory = memoryTarget && this.isBroadMemoryRequest(method, params);
      if (broadMemory && memoryIds.has(memoryTarget)) continue;
      const key = materials?.keyOf?.({ skill, method, params }) || `${skill}:${method}:${JSON.stringify(params)}`;
      if (loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const max = material.maxChars || this.maxFor(skill);
      if (!this.hasBudget(loaded, current, out, max)) continue;
      const text = await this.dispatch(store, action, skill, method, { ...params, maxChars: max });
      if (!text) continue;
      if (broadMemory) memoryIds.add(memoryTarget);
      const title = `${skill}.${method}`;
      materials?.record?.(materialSession, { skill, method, params }, title, text);
      out.push({ title, text, max });
    }
    return out;
  },
```

- [ ] **Step 3: Run static syntax check**

Run:

```bash
node --check "/workspace/publish/story-agent-context.js"
```

Expected: no output and exit code 0.

---

### Task 5: 修改资料阶段模板规则，移除动态 Skills 白名单语义

**Files:**
- Modify: `publish/prompts/real-world-engine.md`
- Modify: `publish/prompts/story-agent-engine.md`

**Interfaces:**
- Consumes: existing prompt variables `{动态载入资料}` and `{动态Skills}`.
- Produces: prompt rules where request_context can only use materials summary JSON request examples.

- [ ] **Step 1: Read current prompt files**

Run via Read tool on:

```text
/workspace/publish/prompts/real-world-engine.md
/workspace/publish/prompts/story-agent-engine.md
```

Expected: both mention request_context and say available skill/method are based on current materials list and dynamic Skills.

- [ ] **Step 2: Update real-world-engine.md request_context rule**

Find the sentence equivalent to:

```text
可请求的 skill/method 以“当前资料清单”和“动态 Skills”为准，不要使用清单外的方法。
```

Replace with:

```text
request_context 只能使用“当前资料清单”中 `request：{...}` 明确列出的 JSON request；动态 Skills 只提供资料理解、行为约束和后续结算规则，不构成资料阶段可请求白名单。禁止使用清单外 skill/method，禁止把 `skill.method` 整体写入 skill。
```

- [ ] **Step 3: Update story-agent-engine.md request_context rule**

Find the sentence equivalent to:

```text
可请求的 skill/method 以“当前作品设定资料清单”和“动态 Skills”为准，不要使用清单外的方法。
```

Replace with:

```text
request_context 只能使用“当前作品设定资料清单”中 `request：{...}` 明确列出的 JSON request；动态 Skills 只提供资料理解、行为约束和后续结算规则，不构成资料阶段可请求白名单。禁止使用清单外 skill/method，禁止把 `skill.method` 整体写入 skill。
```

- [ ] **Step 4: Run grep verification**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
for path in ['publish/prompts/real-world-engine.md','publish/prompts/story-agent-engine.md']:
    text = Path('/workspace', path).read_text()
    print(path, 'old_phrase=', '动态 Skills”为准' in text, 'new_phrase=', '不构成资料阶段可请求白名单' in text)
PY
```

Expected:

```text
publish/prompts/real-world-engine.md old_phrase= False new_phrase= True
publish/prompts/story-agent-engine.md old_phrase= False new_phrase= True
```

---

### Task 6: 增加静态检查脚本验证 materials 白名单

**Files:**
- Create: `tools/check-materials-request-whitelist.js`

**Interfaces:**
- Consumes:
  - `publish/prompts/materials/real-world-materials.js`
  - `publish/prompts/materials/work-lore-materials.js`
- Produces:
  - CLI exits 0 if summaries contain JSON request examples and do not expose known write methods as request_context.

- [ ] **Step 1: Create static check script**

Create `tools/check-materials-request-whitelist.js` with:

```js
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');

function loadModule(file) {
  const context = { window: { GameModules: {} }, console };
  context.window.GameModules = {};
  vm.createContext(context);
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
  return context.window.GameModules;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkMaterials(file, name, forbiddenMethods) {
  const modules = loadModule(file);
  const materials = modules[name];
  assert(materials, `${name} 未注册`);
  assert(typeof materials.requestItems === 'function', `${name}.requestItems 缺失`);
  assert(typeof materials.isRequestAllowed === 'function', `${name}.isRequestAllowed 缺失`);
  assert(typeof materials.suggestRequest === 'function', `${name}.suggestRequest 缺失`);
  const summary = materials.summary(materials.createSession('测试'));
  assert(summary.includes('request：{"skill"'), `${name}.summary 未输出 JSON request 示例`);
  assert(summary.includes('禁止把 "skill.method" 整体写入 skill'), `${name}.summary 缺少 skill.method 禁止规则`);
  for (const method of forbiddenMethods) {
    const exposed = materials.requestItems().some((item) => item.method === method);
    assert(!exposed, `${name} 将写入方法暴露为 request_context：${method}`);
  }
  const first = materials.requestItems()[0];
  assert(first && materials.isRequestAllowed({ skill: first.skill, method: first.method }), `${name}.isRequestAllowed 未允许首个只读请求`);
  const mistaken = { skill: `${first.skill}.${first.method}`, method: first.method, params: {} };
  const suggested = materials.suggestRequest(mistaken);
  assert(suggested && suggested.skill === first.skill && suggested.method === first.method, `${name}.suggestRequest 未纠正 skill.method 误填`);
}

checkMaterials('publish/prompts/materials/real-world-materials.js', 'realWorldMaterials', [
  'upsertFaction',
  'addFactionPosition',
  'addSpecialTerm',
  'sendIncomingNow',
  'sendIncomingPast',
  'generateItemSkill',
  'addItemToTarget',
  'transferItemSkill',
  'deleteItemSkill',
  'purchaseItemSkill',
]);

checkMaterials('publish/prompts/materials/work-lore-materials.js', 'workLoreMaterials', []);

console.log('materials request whitelist check passed');
```

- [ ] **Step 2: Run script and verify pass**

Run:

```bash
node "/workspace/tools/check-materials-request-whitelist.js"
```

Expected:

```text
materials request whitelist check passed
```

---

### Task 7: 验证刘思琪场景的错误请求会被纠正或拒绝

**Files:**
- Test via existing code and static script; no new production file required.

**Interfaces:**
- Consumes: `realWorldMaterials.suggestRequest()` from Task 1.
- Produces: proof that `{ skill: 'character.query.searchCharacterProfile', method: 'searchCharacterProfile' }` maps to allowed request.

- [ ] **Step 1: Run targeted Node snippet**

Run:

```bash
node - <<'JS'
const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('/workspace/publish/prompts/materials/real-world-materials.js', 'utf8');
const context = { window: { GameModules: {} }, console };
vm.createContext(context);
vm.runInContext(code, context);
const m = context.window.GameModules.realWorldMaterials;
const fixed = m.suggestRequest({ skill: 'character.query.searchCharacterProfile', method: 'searchCharacterProfile', params: { world: '2026现代都市现实世界', name: '刘思琪' } });
console.log(JSON.stringify(fixed));
console.log('allowed=' + m.isRequestAllowed(fixed));
JS
```

Expected:

```text
{"skill":"character.query","method":"searchCharacterProfile","params":{"world":"2026现代都市现实世界","name":"刘思琪"}}
allowed=true
```

- [ ] **Step 2: Run syntax checks for all modified JavaScript files**

Run:

```bash
node --check "/workspace/publish/prompts/materials/real-world-materials.js" && node --check "/workspace/publish/prompts/materials/work-lore-materials.js" && node --check "/workspace/publish/real-world-agent-context.js" && node --check "/workspace/publish/story-agent-context.js" && node --check "/workspace/tools/check-materials-request-whitelist.js"
```

Expected: no output and exit code 0.

- [ ] **Step 3: Run static whitelist script**

Run:

```bash
node "/workspace/tools/check-materials-request-whitelist.js"
```

Expected:

```text
materials request whitelist check passed
```

---

## Self-Review

- Spec coverage: The plan covers materials as the only request_context whitelist, JSON request examples, dynamic Skills demotion, readonly filtering, runtime whitelist enforcement, and validation for the 刘思琪 `skill.method` error.
- Placeholder scan: No TBD/TODO placeholders remain. Each code-changing step includes exact replacement code or exact metadata edits.
- Type consistency: `requestItems()`, `requestExample()`, `isRequestAllowed()`, and `suggestRequest()` signatures are consistent across real-world and work-lore materials; both Loop contexts consume the same interface.
- Scope check: This plan intentionally avoids moving handlers into materials (方案 C) and keeps existing dispatch structure, matching the approved 方案 B.
