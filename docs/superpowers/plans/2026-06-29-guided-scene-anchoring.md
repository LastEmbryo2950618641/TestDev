# 引导式场景锚定推演链路 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `docs/superpowers/specs/2026-06-29-guided-scene-anchoring-design.md` 实现现实与异世界共用的中文 K:V guided pipeline：先查询规划、受控加载资料、生成场景锚定报告、再写正文、最后按正文确认对象结算。

**Architecture:** 在 `publish/real-world-agent-loop.js` 中保留现有 `runConfigured()` 统一编排入口，但把 Stage1、Stage2 场景锚定与 Stage4 结算全部改为中文 K:V 协议。把中文资料请求白名单、角色卡 Top3、地点/历史/记忆限额和随机场外事件候选放在 context 层，现实由 `real-world-agent-context.js` 执行，异世界由 `story-agent-context.js` 执行。结算阶段仍复用 `updateRegistry` 和现有 grouped update apply 体系，但模型输出先经过 `parseSettlementKv()` 与 `settlementUpdateCatalog()` 白名单映射后再生成内部更新补丁。

**Tech Stack:** Browser global modules on `window.GameModules`、plain JavaScript、Gamefy `window.dzmm.completions()` via existing `aiRequest`、Node built-in `assert`/`vm` for tests、existing `realWorldMaterials`/`workLoreMaterials`/`updateRegistry`/`jsonUtils` patterns。

## Global Constraints

- 第一版不做 DeepSeek BYOK。
- 第一版不做外部向量数据库。
- 第一版不做完整 L1/L3 长期缓存系统。
- 第一版不做复杂 UI 配置页。
- 第一版不做全流程严格 JSON。
- 第一版不做自动大规模世界记忆压缩。
- 第一版不做服务端函数。
- Stage1 查询规划、Stage2 场景锚定报告、Stage4 结算更新都使用中文 K:V，不允许要求 AI 输出 JSON。
- Stage1 runtime 主链路严格只接受中文 K:V；旧 JSON fallback 不作为本计划实现目标。
- 中文资料请求使用 `资料请求N：类别，动作，参数...`，由程序映射为内部 `{ skill, method, params }`；`资料请求N` 允许出现在 `资料请求：` 与 `资料请求结束：` 之间。
- 角色、地点、势力、作品、世界线等名称面向 AI 时必须使用可读全称，不得用内部 id、缩写 id 或代号替代。
- 同一资料轮次内解析失败最多重试 1 次；两次结果都评分，取映射成功度最高者，并合并另一份中成功映射且不冲突的新增资料请求和候选信息。
- 重试时必须重新判断 `资料状态`；若发现资料缺口，允许新增会直接改变正文结果、人物反应、出场资格或结算边界的 `资料请求N`，程序加载后继续 guided 查询循环。
- 成功率 `>= 80%` 时允许保守补齐，trace 标记 `parseDegraded: true`；成功率 `< 80%` 时抛出“解析错误请重试”，不进入正文。
- 默认最多 3 轮 guided 查询；复杂异世界、跨地点、旧因果、多人候选场景最多 4 轮。
- 角色卡最多 3 张。
- 地点资料最多 2 条。
- 历史/记忆/势力/物品摘要最多 2 条。
- 禁止角色不加载完整角色卡。
- 角色卡可提前加载，但加载角色卡不等于当前参与者，也不等于可以结算。
- 随机主动事件角色默认是场外背景角色，不是当前场景参与者，不自动结算。
- 若随机角色已出现在强制出场、高优先候选、戏剧候选或禁止出场中，必须移除该角色的随机事件。
- 禁止出场角色不得出场、不得主动联系、不得结算。
- 正文必须服从场景锚定报告。
- Stage3 正文单段无换行、紧凑输出；后续由代码按 UI 需要切分段落。
- Stage4/现有 Stage3 更新只结算玩家、强制出场、正文实际确认入场/互动/被影响的角色。
- Stage4 按 update 类型粒度滑动执行：每次请求所有未完成类型；返回中完整的类型先保存并从后续上下文移除，残缺类型和未请求类型继续请求，直到全部类型完成。
- Stage4 AI 面向输出必须全中文：类型名、字段名、示例、字段说明都用中文；`descriptionFacts`、`overview.factions`、`metrics.emotions` 等英文路径只允许出现在内部映射代码和测试断言中。
- Stage4 AI 面向字段表是“优先匹配/规范化表”，不是白名单；AI 返回已确认稳定事实但不在表内时不得丢弃，必须映射为合适专用更新，或追加固化到身份卡/角色卡/资料字段。
- 推演引擎每一阶段提示词都必须文件化：Stage1 查询规划、Stage2 场景锚定、Stage3 正文、Stage4 结算滑动窗口，以及 `publish/init`、`publish/update` 注入提示词，都要独立维护为 `.md` 源文件，统一放入 `publish/prompts/推演引擎/`；再通过 `tools/` 下同步工具生成同名 `.js` 注册文件，便于后续直接改 md。
- 现有代码字段与 UI 可见字段必须保留：底层可以重构为中文 K:V → 内部 `{ updateType, subject, field, change, reasons }`，但现有 `publish/init`、`publish/update`、UI 读取的数据路径不能被重命名或移除。
- 情绪与临时情绪共用同一匹配方法；感觉与临时感觉共用同一匹配方法。代码先遍历固定规范项和别名，同义项归到同一 key；无匹配才落为临时项。高兴/愉悦可归同 key，高兴/兴奋不能强行合并。
- 穿着状态先匹配现有穿着项和槽位别名；无匹配时按 AI 返回的穿着部位固化。AI 行必须包含“穿着部位、衣物名称、当前状态、变化原因”，不能只写饰品名和状态。
- 物品 item 只记录纯物品事实：物品类型、物品名、归属/数量/状态事实；衣物当前穿着变化必须走穿着状态，不混入 item。
- 数值类更新行使用 4 段格式：`更新N：类型，字段，变化值，变化原因`，不得要求第五段当前程度。
- 关系、性历史、角色卡等结构事实使用各自专用细粒度格式，见 Task 7 Prompt Contract。
- 不创建 git commit；用户明确要求前不要提交。
- 用户已明确要求不用创建隔离 worktree；执行本计划时不主动创建 worktree。

---

## File Structure

- Modify: `publish/real-world-agent-loop.js`
  - 新增中文 K:V 解析、字段相似映射、解析评分、两次结果合并。
  - Stage1 prompt 改为中文 K:V 查询规划，不再要求 JSON。
  - Stage2 新增场景锚定报告 prompt、解析和 trace 注入。
  - Stage3 正文 prompt 注入场景锚定报告。
  - Stage4 分组更新 prompt 改为中文 K:V，并通过 `parseSettlementKv()` 映射为内部 patch。
  - `stageParticipants()` 切断 loaded-role-card 自动结算。
- Modify: `publish/real-world-agent-context.js`
  - 新增 `guidedMaterialRequestCatalog(mode)`、`parseChineseMaterialRequest(line, options)`、`participantProfileRequests(data)`、`sceneAnchorRequests(data, store)`、`randomActiveEventCandidates(store, action, options)`。
  - `loadRequests()` 增加兼容 options 限额参数。
- Modify: `publish/story-agent-context.js`
  - 复用 guided request catalog 或提供 story mode catalog。
  - 新增 story 版 participant/profile、scene anchor、random active event helper。
  - `loadRequests()` 增加兼容 options 限额参数。
- Modify: `publish/prompts/materials/real-world-materials.js`
  - 补充中文资料请求说明、Top3 角色卡规则、加载角色卡不等于出场或结算。
- Modify: `publish/prompts/materials/work-lore-materials.js`
  - 补充异世界中文资料请求说明、中文关键词精确查询、canon/时间线约束。
- Modify/Create: `publish/prompts/推演引擎/`
  - 建立推演引擎提示词统一目录；Stage1/Stage2/Stage3/Stage4、init、update 相关提示词源文件都迁移或新建到该目录。
  - 原本分散在 `publish/prompts/real-world-engine*.md`、`publish/prompts/story-agent-engine*.md`、`publish/init/*-prompt.md`、`publish/update/*-prompt.md` 的推演引擎提示词，迁移后旧位置要么删除，要么仅保留由 tools 生成的兼容同名 `.js`；不得保留两份可编辑 md 源。
- Modify: `tools/md-to-inline-js.js` or create a prompt-specific sync tool under `tools/`
  - 让 `publish/prompts/推演引擎/*.md` 成为唯一可编辑源文件，同步生成同名 `.js` 或兼容注册 `.js`。
  - 生成的 `.js` 必须继续注入现有注册点：`updateRegistry.registerPrompt(...)`、`initPromptSources[...]`、`promptTemplates` 或推演引擎阶段模板注册机制，不改浏览器运行时加载顺序。
- Modify/Create prompt source files under `publish/prompts/推演引擎/`:
  - `stage1-guided-query.md`：Stage1 查询规划。
  - `stage2-scene-anchor.md`：Stage2 场景锚定报告。
  - `stage3-narration.md`：Stage3 单段正文。
  - `stage4-settlement-window.md`：Stage4 结算滑动窗口公共规则。
  - `init/intimacy-body-init-prompt.md`：从 `publish/init/intimacy-body-init-prompt.md` 迁移。
  - `update/*-update-prompt.md`：从 `publish/update/*-update-prompt.md` 迁移；缺失的 `wearing-state-update-prompt.md` 需要补齐。
  - 对应 `.js` 视为生成物，但仍提交到 `publish/` 或兼容位置供浏览器直接加载。
- Modify: `tests/real-world-loop-update.test.js`
  - 覆盖中文 K:V 解析、资料请求映射、重试评分、参与者分层、随机事件、锚定报告、结算 K:V、loaded role-card 边界。
- Modify or Create if absent: `tests/story-agent-guided.test.js`
  - 覆盖 story catalog、worklore 请求映射、story 随机事件和提示约束。

---

## Prompt Contracts

### Stage1 查询规划

AI 只输出中文 K:V，不输出 JSON、Markdown、正文或解释。字段固定顺序：

```text
查询规划：
资料状态：继续请求资料 / 资料已足够
地点查询：
地点查询理由：
因果查询：
因果查询理由：
冲突查询：
冲突查询理由：
强制出场：
高优先候选：
戏剧候选：
禁止出场：
随机事件候选：
随机事件闯入条件：
资料请求：无 / N条
资料请求1：类别，动作，参数...
资料请求结束：是
```

Runtime 主链路只解析中文 K:V。`资料状态：继续请求资料` 映射为内部 `request_context`；`资料状态：资料已足够` 映射为内部 `context_done`。同一资料轮次解析失败时最多重试 1 次，重试必须重新判断资料是否足够，并允许新增关键 `资料请求N`。

### Stage2 场景锚定报告

AI 只输出中文 K:V，不输出 JSON、Markdown、正文或解释。字段固定顺序：

```text
场景锚定报告：
当前地点：
当前时间：
空间状态：
当前动作：
强制出场：
高优先候选：
戏剧候选：
禁止出场：
随机事件影响：
正文写作重点：
结算边界：
```

解析成功率 `< 80%` 时必须停止，不进入 Stage3 正文。成功率 `>= 80%` 才允许保守补齐。

### Stage3 正文

AI 输出单段无换行、紧凑正文。正文必须服从 Stage2 场景锚定报告，不替玩家扩展未输入的新阶段；加载角色卡只作为准确性参考，不代表入场或结算。

### Stage4 结算滑动窗口

AI 每轮收到所有未完成 update 类型，并按类型输出中文 K:V。完整类型立即保存并从下一轮 prompt 移除；残缺类型和未请求类型继续请求，直到所有类型完成。

AI 面向结算只使用中文类型与中文字段。每条更新最终映射为内部统一形态：`{ updateType, subject, field, change, reasons }`。现有 `publish/update` 注册类型与 `publish/init`/UI 字段必须保留；中文字段仅是输入协议，内部仍写回现有路径。

三类 AI 面向格式：

```text
数值类：更新N：类型，字段，变化值，变化原因
状态事实类：更新N：类型，字段/部位/对象，当前状态或事实，变化原因
结构事实类：更新N：类型，结构字段1，结构字段2，结构字段3...
```

关键细则：

- 情绪/临时情绪合并为“情绪”类型；感觉/临时感觉合并为“感觉”类型。解析时先匹配固定规范项和别名，匹配成功写入固定字段；无匹配才写入临时字段。
- 穿着状态格式固定为：`更新N：穿着状态，穿着部位，衣物名称，当前状态，变化原因`。
- 物品格式固定为纯物品事实：`更新N：物品，物品类型，物品名，事实或变化，变化原因`。
- 地图、势力、系统记录、通用固化的 AI 字段全部用中文；内部映射到 `descriptionFacts`、`overview.factions`、`events`、`status_tags` 等现有字段。
- 表内字段是优先映射，不是排除列表；无法归类但已确认稳定的字段必须固化追加，不得丢失。

---

### Task 1: Add Chinese K:V Parsing and Scoring Core

**Files:**
- Modify: `publish/real-world-agent-loop.js:738-1118`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: raw LLM output string.
- Produces:
  - `kvFieldAliases(): Object<string,string>`
  - `parseChineseKvBlock(raw, fields, options = {}): { values, lines, missing, score, maxScore, successRate, keyHits, criticalHits, parseDegraded, droppedMaterialRequests, materialRequests }`
  - `parseGuidedStepKv(raw, config): Object`
  - `mergeGuidedParseResults(primary, secondary): Object`
  - `bestGuidedParseResult(results): Object`

- [ ] **Step 1: Write failing tests for fixed-key and alias parsing**

Append after `parseStep normalizes participants into trace items`:

```js
test('parseChineseKvBlock parses fixed Chinese keys and aliases with score', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseChineseKvBlock(`查询规划：确认地点和直接互动对象\n资料状态：继续请求资料\n必须出场：刘悠；刘思琪\n不能出场：王主管\n随机事件闯入条件：无明确条件则禁止闯入\n资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界\n资料请求结束：是`, loop.guidedStepFields(), { parseMaterialRequests: true, config: loop.realConfig() });

  assert.strictEqual(parsed.values['强制出场'], '刘悠；刘思琪');
  assert.strictEqual(parsed.values['禁止出场'], '王主管');
  assert.strictEqual(parsed.materialRequests.length, 1);
  assert.ok(parsed.successRate >= 0.8);
});
```

Run: `node "tests/real-world-loop-update.test.js"`
Expected: FAIL with `parseChineseKvBlock is not a function`.

- [ ] **Step 2: Add field definitions and alias table**

Insert before `completeParsedStep(...)`:

```js
  guidedStepFields() {
    return ['查询规划', '资料状态', '地点查询', '地点查询理由', '因果查询', '因果查询理由', '冲突查询', '冲突查询理由', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件候选', '随机事件闯入条件', '资料请求', '资料请求结束'];
  },

  sceneAnchorFields() {
    return ['场景锚定报告', '当前地点', '当前时间', '空间状态', '当前动作', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件影响', '正文写作重点', '结算边界'];
  },

  settlementBaseFields() {
    return ['基础结算', '结算状态', '经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4', '结算结束'];
  },

  kvFieldAliases() {
    return {
      '必须出场': '强制出场',
      '当前参与者': '强制出场',
      '不能出场': '禁止出场',
      '禁止角色': '禁止出场',
      '场外随机事件': '随机事件候选',
      '随机主动事件': '随机事件候选',
      '随机主动事件影响': '随机事件影响',
      '写作重点': '正文写作重点',
      '正文重点': '正文写作重点',
      '结算限制': '结算边界',
      '资料是否足够': '资料状态',
    };
  },
```

- [ ] **Step 3: Add parser helper implementation**

Insert after the methods from Step 2:

```js
  normalizeKvKey(key = '', allowed = []) {
    const clean = String(key || '').trim().replace(/[\s　]+/gu, '');
    const direct = allowed.find((item) => item === clean);
    if (direct) return direct;
    const alias = this.kvFieldAliases()[clean];
    return allowed.includes(alias) ? alias : '';
  },

  splitKvLine(line = '') {
    const text = String(line || '').trim();
    const match = text.match(/^([^：:\n]{1,40})[：:]\s*([\s\S]*)$/u);
    return match ? { key: match[1].trim(), value: match[2].trim() } : null;
  },

  parseChineseKvBlock(raw, fields = [], options = {}) {
    const allowed = fields.slice();
    const values = {};
    const keyHits = new Set();
    const lines = String(raw || '').replace(/```[\s\S]*?```/gu, (block) => block.replace(/```(?:text|markdown|json)?|```/gu, '')).split(/\r?\n/u);
    const materialLines = [];
    const droppedMaterialRequests = [];
    lines.forEach((line) => {
      const parsed = this.splitKvLine(line);
      if (!parsed) return;
      if (/^资料请求\d+$/u.test(parsed.key)) {
        materialLines.push(`${parsed.key}：${parsed.value}`);
        return;
      }
      const key = this.normalizeKvKey(parsed.key, allowed);
      if (!key) return;
      values[key] = parsed.value;
      keyHits.add(key);
    });
    const materialRequests = options.parseMaterialRequests ? materialLines.map((line) => {
      const req = options.config?.ctx?.parseChineseMaterialRequest?.(line, { mode: options.config?.mode, store: options.store })
        || window.GameModules.realWorldAgentContext?.parseChineseMaterialRequest?.(line, { mode: options.config?.mode, store: options.store });
      if (!req) droppedMaterialRequests.push(line);
      return req;
    }).filter(Boolean) : [];
    const critical = ['强制出场', '禁止出场', '随机事件闯入条件', '正文写作重点', '结算边界'].filter((key) => allowed.includes(key));
    const criticalHits = critical.filter((key) => keyHits.has(key));
    const maxScore = allowed.length + materialLines.length + critical.length;
    const score = keyHits.size + materialRequests.length + criticalHits.length;
    const successRate = maxScore ? score / maxScore : 1;
    return { values, lines, missing: allowed.filter((key) => !keyHits.has(key)), score, maxScore, successRate, keyHits: [...keyHits], criticalHits, parseDegraded: false, droppedMaterialRequests, materialRequests };
  },
```

- [ ] **Step 4: Run parser test**

Run: `node "tests/real-world-loop-update.test.js"`
Expected: PASS for `parseChineseKvBlock parses fixed Chinese keys and aliases with score`.

---

### Task 2: Add Chinese Material Request Catalog for Real and Story Modes

**Files:**
- Modify: `publish/real-world-agent-context.js:190-274`
- Modify: `publish/story-agent-context.js:70-105`
- Test: `tests/real-world-loop-update.test.js`
- Test: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: `资料请求N：类别，动作，参数...` line.
- Produces:
  - `guidedMaterialRequestCatalog(mode = 'real'): Array<{ mode, category, action, skill, method, buildParams(parts, options) }>`
  - `parseChineseMaterialRequest(line, options = {}): { skill, method, params, sourceText } | null`

- [ ] **Step 1: Write failing real catalog tests**

Append to `tests/real-world-loop-update.test.js`:

```js
test('parseChineseMaterialRequest maps real Chinese requests to whitelist calls', () => {
  const context = createContext();
  loadCore(context);
  context.window.GameModules.realWorld2026 = { label: '2026现代都市现实世界' };
  const ctx = context.window.GameModules.realWorldAgentContext;

  const role = ctx.parseChineseMaterialRequest('资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界', { mode: 'real' });
  const nearby = ctx.parseChineseMaterialRequest('资料请求2：地点查询，查询附近地点，刘思琪房间门口', { mode: 'real' });
  const bad = ctx.parseChineseMaterialRequest('资料请求3：未知查询，删除资料，刘思琪', { mode: 'real' });

  assert.deepStrictEqual(role, { skill: 'character.query', method: 'searchCharacterProfile', params: { name: '刘思琪', world: '2026现代都市现实世界' }, sourceText: '资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界' });
  assert.strictEqual(nearby.skill, 'realworld.location.query');
  assert.strictEqual(nearby.method, 'getNearbyLocations');
  assert.strictEqual(nearby.params.locationName, '刘思琪房间门口');
  assert.strictEqual(bad, null);
});
```

Run: `node "tests/real-world-loop-update.test.js"`
Expected: FAIL with `parseChineseMaterialRequest is not a function`.

- [ ] **Step 2: Add real catalog implementation**

Insert before `autoLoadForStep(...)` in `publish/real-world-agent-context.js`:

```js
  worldLabel() {
    return window.GameModules.realWorld2026?.label || '2026现代都市现实世界';
  },

  splitChineseRequestLine(line = '') {
    const body = String(line || '').replace(/^资料请求\d+\s*[：:]/u, '').trim();
    return body.split(/[，,、；;]/u).map((part) => part.trim()).filter(Boolean);
  },

  guidedMaterialRequestCatalog(mode = 'real') {
    const world = () => this.worldLabel();
    return [
      { mode: 'both', category: '角色查询', action: '搜索角色卡', skill: 'character.query', method: 'searchCharacterProfile', buildParams: (p) => ({ name: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '角色查询', action: '已知角色列表', skill: 'character.query', method: 'listKnownCharacters', buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '地点查询', action: '当前地点上下文', skill: 'realworld.location.query', method: 'getCurrentLocationContext', buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '地点查询', action: '查询附近地点', skill: 'realworld.location.query', method: 'getNearbyLocations', buildParams: (p) => ({ locationName: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '地点查询', action: '搜索地点', skill: 'realworld.location.query', method: 'searchLocationOne', buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '世界线查询', action: '按关键词搜索', skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '世界线查询', action: '按时间搜索', skill: 'realworld.history.query', method: 'searchWorldlineByTime', buildParams: (p) => ({ time: p[0] || '', keyword: p[1] || '', world: p[2] || world() }) },
      { mode: 'both', category: '记忆查询', action: '搜索角色记忆窗口', skill: 'memory.query', method: 'searchCharacterMemoryWindow', buildParams: (p) => ({ characterId: p[0] || '', keyword: p[1] || '' }) },
      { mode: 'real', category: '微信查询', action: '联系人列表', skill: 'wechat.query', method: 'listContacts', buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '微信查询', action: '会话片段', skill: 'wechat.query', method: 'getThread', buildParams: (p) => ({ contactId: p[0] || '', count: Number(p[1]) || 5 }) },
      { mode: 'real', category: '公司查询', action: '工作上下文', skill: 'company.query', method: 'getWorkContext', buildParams: (p) => ({ companyName: p[0] || '' }) },
      { mode: 'real', category: '势力查询', action: '搜索势力', skill: 'faction.query', method: 'searchFactionOne', buildParams: (p) => ({ keyword: p[0] || '' }) },
      { mode: 'both', category: '物品查询', action: '角色物品', skill: 'item.query', method: 'listCharacterItems', buildParams: (p) => ({ target: p[0] || '' }) },
      { mode: 'both', category: '物品查询', action: '搜索已知物品', skill: 'item.query', method: 'searchKnownItem', buildParams: (p) => ({ keyword: p[0] || '' }) },
    ];
  },

  parseChineseMaterialRequest(line = '', options = {}) {
    const mode = options.mode || 'real';
    const parts = this.splitChineseRequestLine(line);
    if (parts.length < 2) return null;
    const [category, action, ...params] = parts;
    const entry = this.guidedMaterialRequestCatalog(mode).find((item) => (item.mode === 'both' || item.mode === mode) && item.category === category && item.action === action);
    if (!entry) return null;
    const built = entry.buildParams(params, options);
    if (Object.values(built).some((value) => value === '')) return null;
    return { skill: entry.skill, method: entry.method, params: built, sourceText: String(line || '').trim() };
  },
```

- [ ] **Step 3: Add story catalog tests**

Create `tests/story-agent-guided.test.js` with:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
function loadScript(context, relativePath) { vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath }); }
function createContext() { const context = { console, window: {} }; context.window.window = context.window; context.window.GameModules = { realWorld2026: { label: '2026现代都市现实世界' }, sqliteSave: {}, characterQuery: {} }; return vm.createContext(context); }
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('story context maps worklore Chinese material requests', () => {
  const context = createContext();
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  const ctx = context.window.GameModules.storyAgentContext;
  const people = ctx.parseChineseMaterialRequest('资料请求1：作品设定查询，搜索人物，阿尔托莉雅，Fate/stay night', { mode: 'story' });
  const ability = ctx.parseChineseMaterialRequest('资料请求2：作品设定查询，搜索能力，直感，Fate/stay night', { mode: 'story' });
  const realOnly = ctx.parseChineseMaterialRequest('资料请求3：微信查询，会话片段，boss，5', { mode: 'story' });
  assert.deepStrictEqual(people, { skill: 'worklore.query', method: 'searchPeople', params: { keyword: '阿尔托莉雅', world: 'Fate/stay night' }, sourceText: '资料请求1：作品设定查询，搜索人物，阿尔托莉雅，Fate/stay night' });
  assert.strictEqual(ability.method, 'searchAbility');
  assert.strictEqual(realOnly, null);
});

(async () => { for (const item of tests) { await item.fn(); console.log(`PASS ${item.name}`); } })().catch((err) => { console.error(err); process.exit(1); });
```

Run: `node "tests/story-agent-guided.test.js"`
Expected: FAIL until story context exposes parser.

- [ ] **Step 4: Add story parser wrapper and story-only catalog entries**

Insert after `skillText(store) { ... }` in `publish/story-agent-context.js`:

```js
  worldLabel(store = null) {
    return store?.character?.work || store?.selectedWork || '原创世界';
  },

  splitChineseRequestLine(line = '') {
    return window.GameModules.realWorldAgentContext.splitChineseRequestLine(line);
  },

  guidedMaterialRequestCatalog(mode = 'story') {
    const base = window.GameModules.realWorldAgentContext.guidedMaterialRequestCatalog(mode).filter((item) => item.mode === 'both');
    const work = (p, store) => p[1] || this.worldLabel(store);
    return [
      ...base,
      { mode: 'story', category: '作品设定查询', action: '入口说明', skill: 'worklore.query', method: 'getReadme', buildParams: (p, options) => ({ world: p[0] || this.worldLabel(options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '常驻设定', skill: 'worklore.query', method: 'getDefaultLoad', buildParams: (p, options) => ({ world: p[0] || this.worldLabel(options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索人物', skill: 'worklore.query', method: 'searchPeople', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索剧情', skill: 'worklore.query', method: 'searchPlot', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索时间线', skill: 'worklore.query', method: 'searchTimeline', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索能力', skill: 'worklore.query', method: 'searchAbility', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索关系', skill: 'worklore.query', method: 'searchRelationship', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索地点', skill: 'worklore.query', method: 'searchLocation', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索物品', skill: 'worklore.query', method: 'searchItem', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
    ];
  },

  parseChineseMaterialRequest(line = '', options = {}) {
    const parts = this.splitChineseRequestLine(line);
    if (parts.length < 2) return null;
    const [category, action, ...params] = parts;
    const entry = this.guidedMaterialRequestCatalog('story').find((item) => item.category === category && item.action === action);
    if (!entry) return null;
    const built = entry.buildParams(params, { ...options, store: options.store });
    if (Object.values(built).some((value) => value === '')) return null;
    return { skill: entry.skill, method: entry.method, params: built, sourceText: String(line || '').trim() };
  },
```

- [ ] **Step 5: Run catalog tests**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: PASS for Chinese material request mapping tests.

---

### Task 3: Convert Stage1 to Chinese K:V Guided Query Loop

**Files:**
- Modify: `publish/real-world-agent-loop.js:24-60,122-140,738-766,1075-1118`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: Task 1 parser and Task 2 material parser.
- Produces:
  - `parseStep(raw, config)` returns normalized internal `{ type: 'request_context' | 'context_done', guidanceText, requests, forcedParticipants, priorityCandidates, dramaCandidates, forbiddenParticipants, randomActiveEvents, sceneQueries, parseScore, parseDegraded, droppedMaterialRequests, mergeConflicts }`.
  - `completeConfiguredParsedStep()` retries once with diagnostic prompt, scores both parses, applies 80% threshold.

- [ ] **Step 1: Replace old Stage1 prompt test**

Replace test named `Stage 1 prompt requires compact participants and needed context only` with:

```js
test('Stage 1 prompt requires Chinese K:V guided query planning', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', baseSnapshot: () => '', skillText: async () => '', limit: (text) => String(text || ''), randomActiveEventCandidates: () => [{ id: 'boss', name: '王主管' }] };
  const prompt = await loop.buildConfiguredPrompt({ store: makeStore(), action: '和刘思琪对话', base: '基础', loaded: [], skills: '', step: 1, config });
  assert.ok(prompt.includes('只输出中文 K:V'));
  assert.ok(prompt.includes('查询规划：'));
  assert.ok(prompt.includes('资料状态：'));
  assert.ok(prompt.includes('强制出场：'));
  assert.ok(prompt.includes('资料请求1：角色查询，搜索角色卡'));
  assert.ok(prompt.includes('随机场外角色候选'));
  assert.ok(prompt.includes('王主管'));
  assert.ok(!prompt.includes('只允许返回一个合法 JSON 对象'));
});
```

Run: `node "tests/real-world-loop-update.test.js"`
Expected: FAIL until prompt is changed.

- [ ] **Step 2: Add random candidate variables to prompt builder**

In `buildConfiguredPrompt()`, before `const vars = {`, add:

```js
    const randomActiveCandidates = step === 1 && !forceFinal ? (config.ctx.randomActiveEventCandidates?.(store, action, { mode: config.mode }) || []) : [];
    const randomActiveCandidateText = randomActiveCandidates.length
      ? randomActiveCandidates.map((item, index) => `${index + 1}. ${item.name || item.id}`).join('；')
      : '无';
```

Inside `vars`, add:

```js
      随机场外角色候选: randomActiveCandidateText,
```

- [ ] **Step 3: Render Stage1 from unified prompt file**

Do not hardcode the Stage1 prompt as a long string in `stepOutputRule()`. Register `publish/prompts/推演引擎/stage1-guided-query.md` as `inference-stage1-guided-query`, then render it in `buildConfiguredPrompt()`:

```js
    const stage1TemplateId = 'inference-stage1-guided-query';
    const stage1Prompt = step === 1 && !forceFinal
      ? await window.GameModules.promptTemplates.render(stage1TemplateId, vars)
      : '';
    return step !== 1 || forceFinal ? basePrompt : `${basePrompt}\n\n${stage1Prompt}`;
```

`stage1-guided-query.md` must contain the Chinese K:V field order, material request rules, random event rules, and `{{随机场外角色候选}}` variable. `stepOutputRule()` may keep only a short compatibility selector, not the full prompt body.

- [ ] **Step 4: Add guided step parser and normalization helpers**

Insert before `parseStep(raw, config = this.realConfig())`:

```js
  splitNameList(value = '') {
    return String(value || '').split(/[；;、,，|｜]/u).map((name) => name.trim()).filter((name) => name && name !== '无').slice(0, 12);
  },

  normalizeParticipantList(value = [], defaultRole = 'mentioned') {
    const list = Array.isArray(value) ? value : this.splitNameList(value);
    return list.map((item) => {
      if (typeof item === 'string') return { type: 'character', idOrName: item, name: item, role: defaultRole };
      const name = String(item?.name || item?.characterName || item?.idOrName || item?.id || '').trim().slice(0, 80);
      return name ? { type: String(item?.type || 'character').slice(0, 20), id: item?.id, idOrName: item?.idOrName || name, name, role: String(item?.role || defaultRole).slice(0, 40), reason: item?.reason ? String(item.reason).slice(0, 160) : undefined, canLoadRoleCard: item?.canLoadRoleCard === false ? false : undefined, canEnterNarration: item?.canEnterNarration === false ? false : undefined, canSettle: typeof item?.canSettle === 'boolean' ? item.canSettle : undefined } : null;
    }).filter(Boolean).slice(0, 12);
  },

  normalizeRandomActiveEvents(value = '', blockedNames = new Set()) {
    const parts = Array.isArray(value) ? value : String(value || '').split(/[；;\n]/u);
    const seen = new Set();
    return parts.map((raw) => {
      const text = typeof raw === 'string' ? raw.trim() : `${raw?.characterName || raw?.name || ''}｜${raw?.eventType || raw?.actionMethod || ''}｜${raw?.motivation || raw?.reason || ''}`;
      if (!text || text === '无') return null;
      const segs = text.split(/[｜|]/u).map((x) => x.trim()).filter(Boolean);
      const characterName = segs[0]?.replace(/[：:].*$/u, '').trim();
      return { characterName, eventType: segs[1] || 'background_only', motivation: segs[2] || text, actionMethod: segs[1] || '背景行动', impactTiming: 'background', canEnterCurrentScene: false, canSettleCurrentScene: false };
    }).filter((item) => {
      if (!item?.characterName || blockedNames.has(item.characterName) || seen.has(item.characterName)) return false;
      seen.add(item.characterName);
      return true;
    }).slice(0, 3);
  },

  participantNameSet(...groups) {
    const set = new Set();
    groups.flat().forEach((item) => { const name = String(item?.name || item?.characterName || item?.idOrName || item?.id || '').trim(); if (name) set.add(name); });
    return set;
  },

  parseGuidedStepKv(raw, config = this.realConfig()) {
    const parsed = this.parseChineseKvBlock(raw, this.guidedStepFields(), { parseMaterialRequests: true, config });
    if (parsed.successRate < 0.8) {
      const err = new Error('解析错误请重试');
      err.parseResult = parsed;
      throw err;
    }
    const v = parsed.values;
    const forcedParticipants = this.normalizeParticipantList(v['强制出场'], 'forced');
    const priorityCandidates = this.normalizeParticipantList(v['高优先候选'], 'priority-candidate').map((item) => ({ ...item, canSettle: false }));
    const dramaCandidates = this.normalizeParticipantList(v['戏剧候选'], 'drama-candidate').map((item) => ({ ...item, canSettle: false }));
    const forbiddenParticipants = this.normalizeParticipantList(v['禁止出场'], 'forbidden').map((item) => ({ ...item, canLoadRoleCard: false, canEnterNarration: false, canSettle: false }));
    const blocked = this.participantNameSet(forcedParticipants, priorityCandidates, dramaCandidates, forbiddenParticipants);
    const status = String(v['资料状态'] || '').trim();
    return {
      type: status === '资料已足够' ? 'context_done' : 'request_context',
      guidanceText: String(raw || '').trim(),
      reason: v['查询规划'] || '',
      requests: parsed.materialRequests,
      needed: [],
      characters: [],
      participants: forcedParticipants,
      forcedParticipants,
      priorityCandidates,
      dramaCandidates,
      forbiddenParticipants,
      randomActiveEvents: this.normalizeRandomActiveEvents(v['随机事件候选'], blocked),
      sceneQueries: { location: this.splitNameList(v['地点查询']), causality: this.splitNameList(v['因果查询']), conflict: this.splitNameList(v['冲突查询']) },
      randomIntrusionCondition: v['随机事件闯入条件'] || '无明确条件则禁止闯入',
      parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate },
      parseDegraded: parsed.successRate < 1,
      droppedMaterialRequests: parsed.droppedMaterialRequests,
      mergeConflicts: [],
      missingContext: status !== '资料已足够',
    };
  },
```

- [ ] **Step 5: Replace `parseStep()` with strict Chinese K:V runtime parsing**

Replace the existing JSON-oriented body of `parseStep(raw, config)` with:

```js
  parseStep(raw, config = this.realConfig()) {
    const text = this.compactAiReturn(raw);
    if (!/查询规划[：:]|资料状态[：:]/u.test(text)) {
      throw new Error(`${config.label}返回缺少中文 K:V 查询规划字段`);
    }
    return this.parseGuidedStepKv(text, config);
  },
```

Do not keep JSON fallback in the new Stage1 runtime path. Tests that still depend on JSON Stage1 must be rewritten in this task.

- [ ] **Step 6: Add retry prompt and 80% threshold behavior**

In `completeConfiguredParsedStep()`, when a parse throws retryable `解析错误请重试`, set next prompt to include:

```js
        prompt = [
          prompt,
          `上次中文 K:V 解析失败：${err.message}`,
          `已成功字段：${err.parseResult?.keyHits?.join('、') || '无'}`,
          `缺失字段：${err.parseResult?.missing?.join('、') || '未知'}`,
          `已丢弃资料请求：${err.parseResult?.droppedMaterialRequests?.join('；') || '无'}`,
          '请重新输出完整中文 K:V；必须重新判断资料是否已足够；不得删除用户明确约束、禁止出场、已确认强制出场。',
        ].join('\n\n');
```

- [ ] **Step 7: Run Stage1 regression**

Run: `node "tests/real-world-loop-update.test.js"`
Expected: PASS for Stage1 prompt and K:V parser tests.

---

### Task 4: Add Controlled Retrieval, Top3 Role Cards, and Random Active Events

**Files:**
- Modify: `publish/real-world-agent-context.js:218-274`
- Modify: `publish/story-agent-context.js:82-130`
- Modify: `publish/real-world-agent-loop.js:95-116`
- Test: `tests/real-world-loop-update.test.js`
- Test: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: normalized guided step data from Task 3.
- Produces:
  - `participantProfileRequests(data, options = {}): Array<Request>`
  - `sceneAnchorRequests(data, store, options = {}): Array<Request>`
  - `randomActiveEventCandidates(store, action, options = {}): Array<{ id, name }>`
  - `loadRequests(..., options = { limit })`

- [ ] **Step 1: Add failing retrieval order test**

Append to `tests/real-world-loop-update.test.js`:

```js
test('loadStepContext loads Top3 profiles, scene anchors, then mapped material requests', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const calls = [];
  const ctx = {
    autoLoadForStep: async () => [],
    participantProfileRequests: () => [{ skill: 'character.query', method: 'searchCharacterProfile', params: { name: '刘思琪' } }],
    sceneAnchorRequests: () => [{ skill: 'realworld.location.query', method: 'getCurrentLocationContext', params: {} }],
    loadRequests: async (_store, _action, requests, _loadedKeys, _session, _materials, _memoryIds, _loaded, _current, options) => { calls.push({ requests, limit: options?.limit }); return requests.map((item) => ({ title: `${item.skill}.${item.method}`, text: 'loaded' })); },
  };
  const out = await loop.loadStepContext(ctx, makeStore(), '观察', { type: 'request_context', requests: [{ skill: 'memory.query', method: 'searchCharacterMemoryWindow', params: { keyword: '旧请求' } }], forcedParticipants: [{ name: '刘思琪' }], sceneQueries: { location: ['门口'] } }, new Set(), [], new Set(), 1, null, null);
  assert.deepStrictEqual(calls.map((item) => item.limit), [3, 4, 2]);
  assert.strictEqual(out.length, 3);
});
```

Run: `node "tests/real-world-loop-update.test.js"`
Expected: FAIL until helpers are wired.

- [ ] **Step 2: Implement real helper methods**

Insert before `autoLoadForStep()` in `publish/real-world-agent-context.js` after catalog methods:

```js
  participantProfileRequests(data = {}) {
    const forbidden = new Set((data.forbiddenParticipants || []).map((item) => String(item.name || item.idOrName || '').trim()).filter(Boolean));
    const seen = new Set();
    return [data.forcedParticipants || [], data.priorityCandidates || [], data.dramaCandidates || []].flat().map((item) => {
      const name = String(item?.name || item?.idOrName || '').trim();
      if (!name || forbidden.has(name) || seen.has(name) || item?.canLoadRoleCard === false) return null;
      seen.add(name);
      return { skill: 'character.query', method: 'searchCharacterProfile', params: { name, world: this.worldLabel() } };
    }).filter(Boolean).slice(0, 3);
  },

  sceneAnchorRequests(data = {}) {
    const q = data.sceneQueries || {};
    const requests = [{ skill: 'realworld.location.query', method: 'getCurrentLocationContext', params: { world: this.worldLabel() } }];
    (q.location || []).slice(0, 1).forEach((keyword) => requests.push({ skill: 'realworld.location.query', method: 'getNearbyLocations', params: { locationName: keyword, world: this.worldLabel() } }));
    (q.causality || []).slice(0, 1).forEach((keyword) => requests.push({ skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', params: { keyword, world: this.worldLabel() } }));
    (q.conflict || []).slice(0, 1).forEach((keyword) => requests.push({ skill: 'memory.query', method: 'searchCharacterMemoryWindow', params: { characterId: 'player-self', keyword } }));
    return requests.slice(0, 4);
  },

  randomActiveEventCandidates(store, action = '', options = {}) {
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;
    const roll = rng();
    const count = roll < 0.5 ? 0 : (roll < 0.8 ? 1 : (roll < 0.95 ? 2 : 3));
    if (!count) return [];
    const cooldowns = store.realWorldActiveEventCooldowns || {};
    Object.keys(cooldowns).forEach((key) => { cooldowns[key] = Math.max(0, Number(cooldowns[key] || 0) - 1); if (!cooldowns[key]) delete cooldowns[key]; });
    store.realWorldActiveEventCooldowns = cooldowns;
    const actionText = String(action || '');
    const states = [...Object.values(store?.rpgStates || {}), ...(window.GameModules.sqliteSave.listCharacterStates?.() || [])];
    const seen = new Set();
    const pool = states.filter((state) => {
      const name = String(state?.profile?.name || state?.name || '').trim();
      const id = String(state?.id || name).trim();
      if (!name || !id || seen.has(id) || cooldowns[id] || actionText.includes(name)) return false;
      seen.add(id);
      return window.GameModules.characterQuery?.worldMatches?.(this.worldLabel(), state.worldTag || state.profile?.work) !== false;
    });
    const picked = [];
    while (pool.length && picked.length < count) {
      const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
      const [state] = pool.splice(index, 1);
      const name = state.profile?.name || state.name;
      const id = state.id || name;
      cooldowns[id] = 3 + Math.floor(rng() * 3);
      picked.push({ id, name });
    }
    return picked;
  },
```

- [ ] **Step 3: Extend both `loadRequests()` signatures**

In `publish/real-world-agent-context.js` and `publish/story-agent-context.js`, change signature to include `options = {}` and loop limit:

```js
  async loadRequests(store, action, requests = [], loadedKeys = new Set(), materialSession = null, materials = window.GameModules.realWorldMaterials, memoryIds = new Set(), loaded = [], current = [], options = {}) {
    const out = [];
    const limit = Number.isFinite(Number(options.limit)) ? Math.max(0, Math.round(Number(options.limit))) : 3;
    for (const req of requests.slice(0, limit)) {
```

For story file, keep default materials as `window.GameModules.workLoreMaterials`.

- [ ] **Step 4: Wire retrieval order in `loadStepContext()`**

Replace request_context body with:

```js
      const autoLoaded = await ctx.autoLoadForStep?.(store, action, loadedKeys, materialSession, materials, memoryIds, step, loaded, out) || [];
      out.push(...autoLoaded);
      const profileRequests = ctx.participantProfileRequests?.(data, { mode: data.mode || 'real', store }) || [];
      if (profileRequests.length) out.push(...await ctx.loadRequests(store, action, profileRequests, loadedKeys, materialSession, materials, memoryIds, loaded, out, { limit: 3 }));
      const anchorRequests = ctx.sceneAnchorRequests?.(data, store, { mode: data.mode || 'real' }) || [];
      if (anchorRequests.length) out.push(...await ctx.loadRequests(store, action, anchorRequests, loadedKeys, materialSession, materials, memoryIds, loaded, out, { limit: 4 }));
      const requested = await ctx.loadRequests(store, action, Array.isArray(data.requests) ? data.requests : [], loadedKeys, materialSession, materials, memoryIds, loaded, out, { limit: 2 });
      out.push(...requested);
```

- [ ] **Step 5: Add story helper implementations**

In `publish/story-agent-context.js`, add `participantProfileRequests`, `sceneAnchorRequests`, and `randomActiveEventCandidates` mirroring real helpers but using `this.worldLabel(store)` and worklore queries:

```js
  participantProfileRequests(data = {}, options = {}) {
    const world = this.worldLabel(options.store);
    const forbidden = new Set((data.forbiddenParticipants || []).map((item) => String(item.name || item.idOrName || '').trim()).filter(Boolean));
    const seen = new Set();
    return [data.forcedParticipants || [], data.priorityCandidates || [], data.dramaCandidates || []].flat().map((item) => {
      const name = String(item?.name || item?.idOrName || '').trim();
      if (!name || forbidden.has(name) || seen.has(name) || item?.canLoadRoleCard === false) return null;
      seen.add(name);
      return { skill: 'character.query', method: 'searchCharacterProfile', params: { name, world } };
    }).filter(Boolean).slice(0, 3);
  },

  sceneAnchorRequests(data = {}, store = {}) {
    const world = this.worldLabel(store);
    const q = data.sceneQueries || {};
    const requests = [{ skill: 'worklore.query', method: 'getReadme', params: { world } }, { skill: 'worklore.query', method: 'getDefaultLoad', params: { world } }];
    (q.location || []).slice(0, 1).forEach((keyword) => requests.push({ skill: 'worklore.query', method: 'searchLocation', params: { keyword, world } }));
    (q.causality || []).slice(0, 1).forEach((keyword) => requests.push({ skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', params: { keyword, world } }));
    (q.conflict || []).slice(0, 1).forEach((keyword) => requests.push({ skill: 'worklore.query', method: 'searchRelationship', params: { keyword, world } }));
    return requests.slice(0, 4);
  },

  randomActiveEventCandidates(store, action = '', options = {}) {
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;
    const roll = rng();
    const count = roll < 0.5 ? 0 : (roll < 0.8 ? 1 : (roll < 0.95 ? 2 : 3));
    if (!count) return [];
    const world = this.worldLabel(store);
    const names = [store.character?.name, ...(store.knownCharacters || []).map((item) => item.name)].filter(Boolean);
    return names.filter((name) => !String(action || '').includes(name)).slice(0, count).map((name) => ({ id: name, name, world }));
  },
```

- [ ] **Step 6: Run retrieval tests**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: PASS for controlled retrieval and story helper tests.

---

### Task 5: Generate and Parse Scene Anchor Report Before Narration

**Files:**
- Modify: `publish/real-world-agent-loop.js:67-93,203-262`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: trace layered fields and loaded materials.
- Produces:
  - `sceneLayerSummary(trace = []): string`
  - `buildConfiguredSceneAnchorPrompt(args): string`
  - `completeSceneAnchorReport(store, prompt, logId, config): { raw, data, text }`
  - `sceneAnchorReport` injected into narration and settlement prompts.

- [ ] **Step 1: Add failing scene anchor tests**

Append after narration prompt test:

```js
test('scene anchor report prompt uses Chinese K:V fields and layered context', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '角色卡：刘思琪', limit: (text) => String(text || '') };
  const prompt = await loop.buildConfiguredSceneAnchorPrompt({ store: makeStore(), action: '拉扯刘思琪的 choker', base: '基础', loaded: [{ title: '角色卡', text: '刘思琪资料' }], trace: [{ type: 'request_context', forcedParticipants: [{ name: '刘思琪' }], priorityCandidates: [{ name: '刘思怡', reason: '相邻房间' }], randomActiveEvents: [{ characterName: '王主管', eventType: 'wechat', motivation: '工作确认' }], sceneQueries: { location: ['房间门口'], causality: [], conflict: [] } }], config });
  assert.ok(prompt.includes('只输出中文 K:V'));
  assert.ok(prompt.includes('场景锚定报告：'));
  assert.ok(prompt.includes('正文写作重点：'));
  assert.ok(prompt.includes('结算边界：'));
  assert.ok(prompt.includes('刘思琪'));
  assert.ok(prompt.includes('王主管'));
});

test('parse scene anchor report requires critical writing and settlement fields', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const out = loop.parseSceneAnchorReport(`场景锚定报告：本轮只处理门口动作。\n当前地点：刘思琪房间门口\n当前时间：12:56\n空间状态：相邻房间可能听见但不能无因果闯入。\n当前动作：玩家拉扯 choker。\n强制出场：刘悠；刘思琪\n高优先候选：刘思怡\n戏剧候选：无\n禁止出场：无\n随机事件影响：王主管可能发微信，默认场外。\n正文写作重点：写清动作与即时反应。\n结算边界：只结算刘悠与刘思琪。`, loop.realConfig());
  assert.strictEqual(out.currentLocation, '刘思琪房间门口');
  assert.ok(out.text.includes('结算边界：只结算刘悠与刘思琪。'));
  assert.ok(out.parseScore.successRate >= 0.8);
});
```

Run: `node "tests/real-world-loop-update.test.js"`
Expected: FAIL until functions exist.

- [ ] **Step 2: Implement scene layer summary and prompt**

Insert before `buildConfiguredNarrationPrompt(...)`:

```js
  sceneLayerSummary(trace = []) {
    const latest = [...(Array.isArray(trace) ? trace : [])].reverse().find((item) => item?.type === 'request_context') || {};
    const names = (items = []) => items.map((item) => `${item.name || item.idOrName || item.id}${item.reason ? `（${item.reason}）` : ''}`).join('、') || '无';
    const random = (latest.randomActiveEvents || []).map((item) => `${item.characterName}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || ''}`).join('；') || '无';
    const q = latest.sceneQueries || { location: [], causality: [], conflict: [] };
    return [`强制出场：${names(latest.forcedParticipants)}`, `高优先候选：${names(latest.priorityCandidates)}`, `戏剧候选：${names(latest.dramaCandidates)}`, `禁止出场：${names(latest.forbiddenParticipants)}`, `地点查询：${(q.location || []).join('；') || '无'}`, `因果查询：${(q.causality || []).join('；') || '无'}`, `冲突查询：${(q.conflict || []).join('；') || '无'}`, `随机主动事件：${random}`, `随机事件闯入条件：${latest.randomIntrusionCondition || '无明确条件则禁止闯入'}`].join('\n');
  },

  async buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace = [], materialSession = null, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.summary?.(materialSession) || config.materials?.acquiredSummary?.(materialSession) || '';
    return window.GameModules.promptTemplates.render('inference-stage2-scene-anchor', {
      模式标签: config.label,
      本次行动: actionText,
      基础上下文: this.compactUpdatePromptText(base, 1600),
      参与者分层与查询规划: this.sceneLayerSummary(trace),
      已加载资料摘要: this.compactUpdatePromptText([loadedText, materialText].filter(Boolean).join('\n\n') || '无', 2200),
      紧凑返回规则: this.compactReturnRule('prose'),
    });
  },
```

- [ ] **Step 3: Implement scene anchor parser**

Insert after prompt function:

```js
  parseSceneAnchorReport(raw, config = this.realConfig()) {
    const parsed = this.parseChineseKvBlock(raw, this.sceneAnchorFields(), { config });
    if (parsed.successRate < 0.8) throw new Error('场景锚定报告解析错误请重试');
    const v = parsed.values;
    const orderedText = this.sceneAnchorFields().map((key) => `${key}：${v[key] || ''}`).join('\n');
    return { text: orderedText, currentLocation: v['当前地点'] || '', currentTime: v['当前时间'] || '', writingFocus: v['正文写作重点'] || '', settlementBoundary: v['结算边界'] || '', values: v, parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate }, parseDegraded: parsed.successRate < 1 };
  },

  async completeSceneAnchorReport(store, prompt, logId, config = this.realConfig()) {
    let best = null;
    let lastErr = null;
    for (let i = 0; i < 2; i += 1) {
      const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}场景锚定` });
      try {
        const data = this.parseSceneAnchorReport(raw, config);
        if (!best || data.parseScore.successRate >= best.data.parseScore.successRate) best = { raw, data, text: data.text };
        if (data.parseScore.successRate >= 1) return best;
      } catch (err) {
        lastErr = err;
        prompt = `${prompt}\n\n上次场景锚定报告解析失败：${err.message}。请重新输出完整中文 K:V，必须包含正文写作重点和结算边界。`;
      }
    }
    if (best) return best;
    throw lastErr || new Error('场景锚定报告解析错误请重试');
  },
```

- [ ] **Step 4: Call scene anchor before narration**

In `generateConfiguredFinal(...)`, before narration prompt, insert:

```js
    const sceneAnchorPrompt = await this.buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace, materialSession, config });
    this.markConfiguredStep(store, logId, `${config.label}资料已载入，正在生成场景锚定报告…`, config);
    const sceneAnchor = await this.completeSceneAnchorReport(store, sceneAnchorPrompt, logId, config);
    const sceneAnchorReport = sceneAnchor.text;
```

Change narration prompt call to include `sceneAnchorReport`:

```js
    const narrationPrompt = await this.buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession, sceneAnchorReport, config });
```

Return debug prompt/raw with scene anchor. Stage4 sliding settlement debug text is added in Task 7:

```js
    return { result, prompt: `---SCENE_ANCHOR---\n${sceneAnchorPrompt}\n\n---NARRATION---\n${narrationPrompt}\n\n---STAGE3_BASE---\n${skillPrompt}`, loaded, raw: `${sceneAnchor.raw}\n\n${narrationRaw}\n\n${JSON.stringify(selectedSkills)}`, trace: trace.map((item, index) => index === trace.length - 1 ? { ...item, anchorReport: sceneAnchor.data } : item) };
```

- [ ] **Step 5: Render Stage3 narration from unified prompt file**

Change signature:

```js
  async buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession = null, sceneAnchorReport = '', config = this.realConfig() }) {
```

Do not keep separate real/story narration prompt arrays in code. Register `publish/prompts/推演引擎/stage3-narration.md` as `inference-stage3-narration`, then render it with variables including `场景锚定报告`:

```js
  return window.GameModules.promptTemplates.render('inference-stage3-narration', {
    模式标签: config.label,
    本次行动: actionText,
    基础上下文: this.compactUpdatePromptText(base, 1800),
    场景锚定报告: sceneAnchorReport || '无',
    已动态载入资料: loadedText || '无',
    可用技能: skills || '无',
    资料摘要: materialText || '无',
    紧凑返回规则: this.compactReturnRule('prose'),
  });
```

`stage3-narration.md` must include：必须服从场景锚定报告中的出场边界、禁止出场、随机事件影响和结算边界；加载过的角色卡只能作为准确性参考，不代表该角色已经入场。

- [ ] **Step 6: Update tests stubbing `completeConfiguredStep()`**

In tests `generateConfiguredFinal uses base fields and four grouped patches` and `generateConfiguredFinal reuses computed Stage 3 participants across groups`, add before narration branch:

```js
    if (cfg?.sourceTitle?.includes('场景锚定')) return '场景锚定报告：只结算正文确认对象。\n当前地点：测试地点\n当前时间：测试时间\n空间状态：测试空间\n当前动作：行动\n强制出场：刘思琪\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件影响：无\n正文写作重点：只写当前动作。\n结算边界：只结算正文确认对象。';
```

- [ ] **Step 7: Run scene anchor regression**

Run: `node "tests/real-world-loop-update.test.js"`
Expected: PASS for scene anchor tests and updated generate final tests.

---

### Task 6: Enforce Settlement Boundary and Remove Loaded-Role-Card Pollution

**Files:**
- Modify: `publish/real-world-agent-loop.js:282-340,524-537`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: trace `participants` and `forcedParticipants` plus scene anchor settlement boundary.
- Produces:
  - `settlementEligibleParticipant(p): boolean`
  - `stageParticipants(trace, loaded, store)` never uses loaded role cards by itself.
  - settlement prompts include boundary text.

- [ ] **Step 1: Replace loaded-card settlement test**

Replace `Stage 3 contexts include structured loaded role-card participants when trace participants are empty` with:

```js
test('Stage 3 contexts do not settle loaded role cards when trace participants are empty', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const loaded = [{ title: '结构化资料缓存', text: '资料正文可能被压缩或引用替换。', participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'loaded-role-card' }] }];
  const participants = loop.stageParticipants([], loaded, store);
  const contextPack = loop.buildUpdateContextPack({ store, action: '普通行动', base: '基础', loaded, narration: '正文没有写刘思琪实际入场。', trace: [], groupKey: 'metrics', config: loop.realConfig() });
  assert.deepStrictEqual(participants, []);
  assert.ok(contextPack.includes('加载角色卡不等于参与或结算'));
  assert.ok(!contextPack.includes('rushiqi:刘思琪:emotions='));
});

test('Stage 3 participants include forced participants but exclude candidates and forbidden roles', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = loop.stageParticipants([{ participants: [{ type: 'player', id: 'player-self', name: '玩家', role: 'actor' }], forcedParticipants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }], priorityCandidates: [{ type: 'character', id: 'liusiyi', name: '刘思怡', role: 'priority-candidate', canSettle: false }], forbiddenParticipants: [{ type: 'character', id: 'boss', name: '王主管', role: 'forbidden', canSettle: false }] }], [], store);
  assert.deepStrictEqual(participants.map((item) => item.name), ['玩家', '刘思琪']);
});
```

Run: `node "tests/real-world-loop-update.test.js"`
Expected: FAIL until `stageParticipants()` changes.

- [ ] **Step 2: Add eligibility helper**

Insert before `stageParticipants(...)`:

```js
  settlementEligibleParticipant(p = {}) {
    if (!p || p.canSettle === false) return false;
    const role = String(p.role || '').toLowerCase();
    if (/loaded-role-card|priority-candidate|drama-candidate|candidate|forbidden|background|random/u.test(role)) return false;
    if (p.type === 'player') return true;
    if (p.canSettle === true) return true;
    return /actor|direct|forced|participant|current-scene/u.test(role);
  },
```

- [ ] **Step 3: Replace `stageParticipants()` implementation**

Replace the full method with:

```js
  stageParticipants(trace = [], loaded = [], store = null) {
    const seen = new Set();
    const out = [];
    const add = (p = {}) => {
      if (out.length >= 12 || !this.settlementEligibleParticipant(p)) return;
      const target = p.id || p.idOrName || p.name;
      if (!target) return;
      const key = `${p.type || ''}:${target}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(p);
    };
    (Array.isArray(trace) ? trace : []).forEach((item) => {
      (Array.isArray(item?.participants) ? item.participants : []).forEach(add);
      (Array.isArray(item?.forcedParticipants) ? item.forcedParticipants : []).forEach((p) => add({ ...p, role: p.role || 'forced', canSettle: p.canSettle === false ? false : true }));
      this.characterParticipants(item?.characters, store).forEach((p) => add({ ...p, canSettle: true }));
    });
    return out.slice(0, 12);
  },
```

Do not delete `loadedRoleCardParticipants()`; leave it for UI/debug only.

- [ ] **Step 4: Add boundary text to prompts**

In `buildConfiguredStage3BasePrompt()`, before `本回合参与者`, add:

```js
      '结算边界：只允许结算本回合参与者列表中的对象；加载角色卡不等于参与或结算；候选但未入场、随机延迟事件角色、背景提及角色、禁止出场角色都不得结算。',
```

In `buildUpdateContextPack()` common array, before `本回合参与者`, add:

```js
      '结算边界:只允许结算本回合参与者列表中的对象；加载角色卡不等于参与或结算；候选但未入场、随机延迟事件角色、背景提及角色、禁止出场角色都不得结算。',
```

- [ ] **Step 5: Run settlement boundary regression**

Run: `node "tests/real-world-loop-update.test.js"`
Expected: PASS for boundary tests.

---

### Task 6.5: Centralize All Inference-Engine Prompts as Markdown Sources

**Files:**
- Create: `publish/prompts/推演引擎/`
- Create: `publish/prompts/推演引擎/stage1-guided-query.md`
- Create: `publish/prompts/推演引擎/stage2-scene-anchor.md`
- Create: `publish/prompts/推演引擎/stage3-narration.md`
- Create: `publish/prompts/推演引擎/stage4-settlement-window.md`
- Create: `publish/prompts/推演引擎/init/intimacy-body-init-prompt.md`
- Create: `publish/prompts/推演引擎/update/*-update-prompt.md`
- Modify: `tools/md-to-inline-js.js` or create: `tools/sync-prompt-md.js`
- Generated compatibility js: existing browser-loaded prompt js locations as needed
- Test: `tests/real-world-loop-update.test.js`
- Test: `tests/story-agent-guided.test.js`

**Goal:** 推演引擎每一阶段提示词都必须独立成为 `.md` 文件，并统一放到 `publish/prompts/推演引擎/`。原本散落在 `publish/prompts`、`publish/init`、`publish/update` 中的推演相关提示词，要么迁移到该目录，要么删除；不得保留两份可编辑源。

**Rules:**
- `publish/prompts/推演引擎/**/*.md` 是唯一人工编辑源。
- 同名 `.js` 或兼容注册 `.js` 都由 `tools/` 同步生成；生成物可以留在旧浏览器加载路径，但不能作为人工维护源。
- Stage1、Stage2、Stage3、Stage4 的提示词不得继续硬编码在 `real-world-agent-loop.js` 的长字符串里；代码只负责读取/渲染文件化模板并传入变量。
- `publish/init` 与 `publish/update` 的现有提示词必须迁移到 `publish/prompts/推演引擎/init/`、`publish/prompts/推演引擎/update/`，并通过生成物继续注入现有注册点：
  - `updateRegistry.registerPrompt(...)`
  - `initPromptSources[...]`
  - `promptTemplates`
  - 推演引擎阶段模板注册机制
- 迁移后旧 `.md` 源文件必须删除或变为非源引用；不允许 `publish/update/foo.md` 与 `publish/prompts/推演引擎/update/foo.md` 同时作为可编辑源存在。
- 原本的推演引擎提示词如果已经迁移到统一目录，旧位置必须在同一任务中处理：能删就删；若浏览器加载链路暂时依赖旧路径，只保留 tools 生成的 `.js` 兼容入口，不保留旧 `.md` 正文。
- 现有字段说明必须保留：`publish/init` 的 `intimacy/bodyStatus/sexualExperienceParts/uiFieldDefs` 与 `publish/update` 注册类型字段说明都不能因迁移丢失。
- 同步工具必须是确定性输出；同一 md 输入重复运行，生成 js 内容一致。

**Target prompt source layout:**

```text
publish/prompts/推演引擎/
  stage1-guided-query.md
  stage2-scene-anchor.md
  stage3-narration.md
  stage4-settlement-window.md
  init/
    intimacy-body-init-prompt.md
  update/
    emotion-update-prompt.md
    feeling-update-prompt.md
    vital-update-prompt.md
    body-status-update-prompt.md
    wearing-state-update-prompt.md
    sexual-experience-update-prompt.md
    sexual-history-update-prompt.md
    relationship-update-prompt.md
    role-card-update-prompt.md
    item-update-prompt.md
    map-update-prompt.md
    faction-overview-update-prompt.md
    faction-structure-update-prompt.md
    system-update-prompt.md
    generic-update-prompt.md
```

- [ ] **Step 1: Add inference-engine prompt source coverage test**

Add a test that checks the unified prompt directory exists and all stage/init/update prompt sources exist there:

```js
test('inference engine prompts are centralized markdown sources', () => {
  const fs = require('fs');
  const path = require('path');
  const base = path.join(root, 'publish/prompts/推演引擎');
  ['stage1-guided-query.md', 'stage2-scene-anchor.md', 'stage3-narration.md', 'stage4-settlement-window.md'].forEach((name) => {
    assert.ok(fs.existsSync(path.join(base, name)), `${name} missing`);
  });
  assert.ok(fs.existsSync(path.join(base, 'init/intimacy-body-init-prompt.md')), 'init prompt missing');
  ['emotion', 'feeling', 'vital', 'body-status', 'wearing-state', 'sexual-experience', 'sexual-history', 'relationship', 'role-card', 'item', 'map', 'faction-overview', 'faction-structure', 'system', 'generic'].forEach((id) => {
    assert.ok(fs.existsSync(path.join(base, `update/${id}-update-prompt.md`)), `${id} update prompt missing`);
  });
});
```

- [ ] **Step 2: Add no-duplicate-source test**

Add a test that fails if old推演引擎 md sources remain editable outside the unified directory:

```js
test('old inference prompt markdown sources are not duplicated outside unified directory', () => {
  const fs = require('fs');
  const path = require('path');
  const oldSources = [
    'publish/prompts/real-world-engine-first.md',
    'publish/prompts/real-world-engine.md',
    'publish/prompts/story-agent-engine-first.md',
    'publish/prompts/story-agent-engine.md',
    'publish/init/intimacy-body-init-prompt.md',
    ...['emotion', 'feeling', 'vital', 'body-status', 'wearing-state', 'sexual-experience', 'sexual-history', 'relationship', 'role-card', 'item', 'map', 'faction-overview', 'faction-structure', 'system', 'generic'].map((id) => `publish/update/${id}-update-prompt.md`),
  ];
  oldSources.forEach((relative) => {
    assert.ok(!fs.existsSync(path.join(root, relative)), `${relative} should be migrated or removed as editable source`);
  });
});
```

If compatibility requires files at old paths, keep only generated `.js` at those paths, or make old `.md` a generated stub with an explicit header that tests can identify as non-source.

- [ ] **Step 3: Create or extend sync tool**

Current `tools/md-to-inline-js.js` only writes to `window.GameModules.inlineMd`. Extend it or add `tools/sync-prompt-md.js` so it can generate registry-specific js from `publish/prompts/推演引擎/**/*.md`.

Required examples:

```bash
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage1-guided-query.md" --kind template --id real-world-engine-first
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage4-settlement-window.md" --kind template --id inference-stage4-settlement-window
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/update/emotion-update-prompt.md" --kind update --id emotion-update --out publish/update/emotion-update-prompt.js
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/init/intimacy-body-init-prompt.md" --kind init --id intimacy-body --template intimacyBody --out publish/init/intimacy-body-init-prompt.js
```

Generated update js shape:

```js
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.('emotion-update', `...md text...`);
```

Generated init js shape must preserve the existing source contract:

```js
window.GameModules = window.GameModules || {};
window.GameModules.initPromptSources = window.GameModules.initPromptSources || {};
window.GameModules.initPromptSources['intimacy-body'] = window.GameModules.initPromptSources['intimacy-body'] || { prompt: `...md text...`, templateKey: 'intimacyBody' };
```

Generated template js shape must register to the existing prompt template system used by `promptTemplates.render(...)`. If current template loading uses inline bundles, update that bundle generation so stage templates come from `publish/prompts/推演引擎/`.

- [ ] **Step 4: Migrate existing prompt content**

Move or copy-then-delete prompt md content into the unified directory:

- `publish/prompts/real-world-engine-first.md` → `publish/prompts/推演引擎/stage1-guided-query.md` as real-mode baseline.
- `publish/prompts/story-agent-engine-first.md` → same Stage1 template with story-mode condition blocks or a story-specific section inside the unified md.
- `publish/prompts/real-world-engine.md` and `publish/prompts/story-agent-engine.md` → `stage3-narration.md` with mode-specific sections.
- New `stage2-scene-anchor.md` for场景锚定报告。
- New `stage4-settlement-window.md` for中文 K:V 滑动结算公共规则。
- `publish/init/intimacy-body-init-prompt.md` → `publish/prompts/推演引擎/init/intimacy-body-init-prompt.md`。
- `publish/update/*-update-prompt.md` → `publish/prompts/推演引擎/update/*-update-prompt.md`。
- Create missing `publish/prompts/推演引擎/update/wearing-state-update-prompt.md` from existing generated JS text before deleting old source.

- [ ] **Step 5: Remove or neutralize old prompt sources**

After migration and sync, remove old editable md files or convert them to generated non-source stubs. Do not leave duplicate editable prompt sources outside `publish/prompts/推演引擎/`.

- [ ] **Step 6: Regenerate compatibility js files**

Run sync for every md source under `publish/prompts/推演引擎/`. Generated files must keep existing browser-side injection points and load order stable.

- [ ] **Step 7: Wire every stage to file-backed templates**

Update prompt construction so each stage renders file-backed templates:

```js
await window.GameModules.promptTemplates.render('inference-stage1-guided-query', vars)
await window.GameModules.promptTemplates.render('inference-stage2-scene-anchor', vars)
await window.GameModules.promptTemplates.render('inference-stage3-narration', vars)
await window.GameModules.promptTemplates.render('inference-stage4-settlement-window', vars)
```

Stage4 must still inject existing update/init prompt registry content:

```js
window.GameModules.updateRegistry?.skillsText?.(selectedUpdateTypes)
window.GameModules.initPromptRegistry?.skillText?.(selectedInitSkills, store)
window.GameModules.initPromptRegistry?.schema?.(selectedInitSkills, store)
```

Then append or render the Stage4 Chinese K:V type-window contract from `stage4-settlement-window.md`.

- [ ] **Step 8: Run prompt sync tests**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: prompt source coverage tests pass, old duplicate prompt sources are gone or marked generated, and generated compatibility js is not stale relative to unified md sources.

---

### Task 7: Convert Stage4 Settlement to Chinese K:V Sliding Type Windows

**Files:**
- Modify: `publish/real-world-agent-loop.js:512-620,838-881`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: Chinese K:V settlement output from type-window settlement prompts.
- Produces:
  - `settlementTypeQueue(config): Array<string>`
  - `settlementTypeContracts(): Object<string,{ title, labels, format }>`
  - `settlementUpdateCatalog(): Object<string,{ updateType, fieldPrefix?, fieldMap? }>`
  - `parseSettlementKv(raw, { requestedTypes, participants, store, config }): { patchesByType, completeTypes, incompleteTypes, genericUpdates, baseFields }`
  - `buildSettlementTypeWindowPrompt({ requestedTypes, completedTypes, incompleteTypes, partialByType, ... }): string`
  - `completeConfiguredSettlementKvWindow(...)` repeatedly requests all unfinished types, saves complete types, retries only incomplete/unrequested types, and stops when all types are complete.

**Stage4 Prompt Contract:**
- 每次请求包含所有未完成类型，不是一次只请求一个类型。
- AI 返回中某类型只要出现 `类型完成：是` 与 `结算结束：是` 且该类型格式完整，即立刻保存。
- 已保存完整类型从下一次上下文移除，不再请求，不再重复进入 prompt 正文。
- 若某类型残缺、截断、缺少 `类型完成：是`、缺少必要字段或更新行格式错误，则只把该类型放入 `incompleteTypes`，下轮继续请求。
- 下轮 prompt 只包含：未完成类型列表、残缺类型的尾部/错误原因、已完成类型摘要；不得粘贴完整已完成类型正文。
- 情绪、感觉、生命体征等数值类使用 4 段更新格式：`更新N：类型，字段，变化值，变化原因`。
- 情绪不再拆成“情绪/临时情绪”两个 AI 类型；感觉不再拆成“感觉/临时感觉”两个 AI 类型。解析器先匹配固定字段和别名，未匹配时才落入临时字段。
- 身体状态、穿着状态、物品、地图、势力、系统记录、通用固化属于状态事实类或结构事实类，使用中文字段；内部再映射到现有英文字段。
- 性历史、关系、角色卡使用专用结构格式，不套用数值 4 段格式。

**Settlement type queue:**
```text
基础结算
情绪
感觉
生命体征
身体状态
穿着状态
性经历
性历史
关系
角色卡
物品
地图
势力总览
势力结构
系统记录
通用固化
操控体验（story mode only）
```

队列覆盖当前 `publish/update` 注册类型：`emotion`、`feeling`、`vital`、`body-status`、`wearing-state`、`sexual-experience`、`sexual-history`、`relationship`、`role-card`、`item`、`map`、`faction-overview`、`faction-structure`、`system`、`generic`。AI 面向不暴露这些英文 id；解析器按中文类型映射到注册 id。

**中文字段到现有字段的保留映射（优先表，不是白名单）：**

- 情绪：规范情绪名/别名 → 现有 `metrics.emotions.<情绪名>`；未命中规范项但确认是本轮临时情绪 → 现有临时情绪字段。
- 感觉：规范感觉名/别名 → 现有 `metrics.playerFeelings.<感觉名>`；未命中规范项但确认是本轮临时感觉 → 现有临时感觉字段。
- 生命体征：精力、饱食度、水分、疲劳、精神稳定 → 现有 `vitals.stamina_pool`、`vitals.satiety`、`vitals.hydration`、`vitals.fatigue`、`vitals.mental_stability`。
- 身体状态：整体、口部、胸部、阴部、肛部、臀部、四肢、皮肤、其他 → 现有 `bodyStatus.overall/mouth/chest/genital/anus/hips/limbs/skin/other`；未知部位保留 AI 中文名并追加到身体状态对象。
- 穿着状态：穿着部位别名 + 衣物名称 → 现有 `values.wearing`，保留 `slot/name/state`；不同英文或中文同义部位必须归一。
- 性经历：分类映射到现有 `intimacy.sexualExperienceParts`，保留既有分类键：阴部、胸部、嘴唇、口部、口部行为、口交、口交中出、阴部进入、阴部插入、阴部中出、肛门、肛部进入、肛交、肛交中出、腿部、臀部、手部、皮肤接触、其他。
- 性历史：状态转移、性对象、原因证据 → 现有 `intimacy.sexualHistory`、`intimacy.sexualPartnerCount`、`intimacy.sexualPartners` 等字段。
- 关系：双方、维度、当前状态、原因、结果 → 现有 `relationships.<关系名>` 或 `profile.relationships`。
- 角色卡：身份、职业、等级/地位、人际关系、人物说明、外貌、喜好、性格、势力地位、技能、物品、穿着、世界属性等 → 现有 `profile.*`、`skills.*`、`items`、`wearing`、`worldAttributes` 等字段；未知稳定字段追加到角色卡资料。
- 物品：物品类型、物品名、归属/数量/状态事实 → 现有 `inventory.*`、`equipment.*` 或 `items`；穿着当前状态不走物品。
- 地图：当前位置、上级地点、地点事实、地图节点、路线事实 → 现有 `current`、`parent`、`descriptionFacts`、`mapNodes`、`routeLinks`。
- 势力总览：新增势力、上层势力归属、势力 APP 归属 → 现有 `children.factions`、`overview.factions`、`apps.<appId>.factions`。
- 势力结构：部门角色、职位、成员地位 → 现有 `structure.<部门>.roles`、`positions.<职位>`、`members.<角色ID>`。
- 系统记录：公司、日历、微信、世界线、系统状态 → 现有 `events`、`records`、`messages`、`plots`、`status`。
- 通用固化：状态标签、新分类、跨系统字段、暂无专用类型的稳定事实 → 现有 `status_tags` 或可定位新增资料字段。

**Required K:V examples by type:**

```text
基础结算：
结算状态：需要更新
经过时间：180秒
当前状态：仍停在刘思琪房间门口，呼吸略急
当前目标：处理刘思琪的即时反应
场景标题：房间门口的拉扯
地点名称：刘思琪房间门口
备选行动1：松开 choker 并观察她的反应
备选行动2：低声询问她是否疼痛
备选行动3：后退半步保持距离
备选行动4：查看门外是否有人靠近
类型完成：是
结算结束：是
```

```text
情绪结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：情绪，紧张，+2，颈饰被突然拉扯
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

```text
感觉结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：感觉，警惕，+1，玩家动作过于直接
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

情绪映射规则：`高兴` 与 `愉悦` 这类同义项归一到同一规范 key；`兴奋` 与 `高兴` 语义不同，不合并。无法匹配规范项但只在当前场景成立的情绪，内部写入临时情绪字段，AI 不需要另写“临时情绪”类型。

感觉映射规则：优先匹配固定感觉和别名；无法匹配规范项但只在当前场景成立的感觉，内部写入临时感觉字段，AI 不需要另写“临时感觉”类型。

```text
生命体征结算：
结算状态：需要更新
结算对象：玩家｜玩家｜允许结算
更新1：生命体征，精力，-1，动作消耗少量体力
结算对象结束：玩家
类型完成：是
结算结束：是
```

```text
身体状态结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：身体状态，颈部，轻微受压，choker 被拉紧影响
更新2：身体状态，呼吸，略微急促，情绪与动作刺激
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

```text
穿着状态结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：穿着状态，颈部，choker，仍佩戴但被拉紧偏移，颈饰受外力牵动
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

穿着状态映射规则：优先匹配 `values.wearing` 中已有衣物和槽位；再匹配槽位别名，如“颈部/脖子/neck/choker位”归到同一穿着部位；仍无匹配时按 AI 返回的穿着部位追加固化。若衣物只是推开、掀起、解开、拉紧、偏移但没有脱下，必须保留“仍穿着/仍佩戴”的事实。

```text
性经历结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：性经历，亲密接触，+1，正文确认双方发生亲密互动
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

```text
性历史结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：性历史，亲密身份状态变化，刘悠，正文明确确认关系进入新的稳定亲密阶段
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

性历史映射规则：状态转移字段保存到 `intimacy.sexualHistory.virginityStatus` 及对应 evidence 字段；性对象保存为 partner；同一事实还必须追加到经历人列表/破处对象列表中，保存完整事实文本供后续查询。只记录成人、抽象、稳定事实，不写过程、姿势、体液或感官描写。

```text
关系结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：关系，刘悠(兄)，刘思琪(妹妹)，信任边界，轻微受损，动作越过舒适距离，关系短暂紧张
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

关系映射规则：保存双方显示名与关系称谓、维度、当前状态、变化原因、根据性格造成的结果；该记录必须进入关系资料，供后续查询与因果检索使用。

```text
角色卡结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：角色卡，性格，增加，边界感更强，面对越界动作紧张防备，偏向退缩
更新2：角色卡，当前状态，增加，抗拒强硬接触，面对越界动作紧张防备，当前回合保持距离
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

角色卡映射规则：第四段只能是 `替换` 或 `增加`。若是 `替换` 且能匹配现有 key，用新值替换；若 `替换` 无匹配 key，退化为 `增加`。除 `当前状态` 外，角色卡字段默认是长期信息；临时反应不得写入长期性格，应归入 `当前状态` 或情绪/临时情绪。

```text
物品结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：物品，饰品，choker，归属仍为刘思琪，正文确认该物品存在且归属未变化
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

物品映射规则：物品只记录纯物品事实，如类型、名称、归属、数量、耐久、获得、失去、转移。衣物或饰品的当前穿着位置、穿着状态、被拉紧/解开/偏移等变化走“穿着状态”。

```text
地图结算：
结算状态：需要更新
结算对象：刘思琪房间门口｜地点｜允许结算
更新1：地图，地点事实，门口靠近相邻房间，正文确认动作发生门口且声响可能传出
结算对象结束：刘思琪房间门口
类型完成：是
结算结束：是
```

地图映射规则：AI 字段使用中文“当前位置、上级地点、地点事实、地图节点、路线事实”；内部分别映射到现有 `current`、`parent`、`descriptionFacts`、`mapNodes`、`routeLinks`。

```text
势力总览结算：
结算状态：需要更新
结算对象：公司社群｜势力总览｜允许结算
更新1：势力总览，新增势力，项目临时群，正文确认该群作为新的协作组织出现
结算对象结束：公司社群
类型完成：是
结算结束：是
```

势力总览映射规则：AI 字段使用中文“新增势力、上层势力归属、势力APP归属”；内部分别映射到现有 `children.factions`、`overview.factions`、`apps.<appId>.factions`。

```text
势力结构结算：
结算状态：需要更新
结算对象：项目临时群｜势力｜允许结算
更新1：势力结构，成员地位，刘思琪成为临时记录人，正文确认她负责记录本次讨论
结算对象结束：项目临时群
类型完成：是
结算结束：是
```

势力结构映射规则：AI 字段使用中文“部门角色、职位、成员地位”；内部分别映射到现有 `structure.<部门>.roles`、`positions.<职位>`、`members.<角色ID>`。

```text
系统记录结算：
结算状态：需要更新
结算对象：微信会话｜系统｜允许结算
更新1：系统记录，通信消息，王主管发送位置询问，正文确认仅收到消息且本人未到场
结算对象结束：微信会话
类型完成：是
结算结束：是
```

系统记录映射规则：公司、日历、微信、世界线等统一走系统记录；AI 字段使用中文“事件、记录、通信消息、剧情记录、状态”，内部映射到现有 `events`、`records`、`messages`、`plots`、`status`。纯通信者本人不进入角色结算；只有正文确认通信者实际入场或被影响时，才允许角色类结算。

```text
通用固化结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：通用固化，状态标签，暂时保持距离，正文确认她当前选择后退观察
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

通用固化映射规则：仅在没有专用类型时使用；状态标签内部写 `status_tags` append；新分类、跨系统字段或暂无分类的稳定事实必须追加固化，不得因为不在优先表里被过滤。

- [ ] **Step 1: Add failing tests for settlement type-window parsing**

Append after `buildGroupedUpdateJsonPrompt requires full checks...`:

```js
test('parseSettlementKv saves complete types and leaves incomplete types for retry', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`情绪结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：情绪，紧张，+2，颈饰被突然拉扯
结算对象结束：刘思琪
类型完成：是
结算结束：是
感觉结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：感觉，警惕，+1`, { requestedTypes: ['情绪', '感觉'], participants, store, config: loop.realConfig() });
  assert.deepStrictEqual(parsed.completeTypes, ['情绪']);
  assert.deepStrictEqual(parsed.incompleteTypes, ['感觉']);
  assert.strictEqual(parsed.patchesByType['情绪'].genericUpdates.length, 1);
});
```

Run: `node "tests/real-world-loop-update.test.js"`
Expected: FAIL with `parseSettlementKv is not a function` or missing complete/incomplete type tracking.

- [ ] **Step 2: Add failing tests for special formats**

Append:

```js
test('parseSettlementKv handles sexual history relationship and role-card special formats', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`性历史结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：性历史，亲密身份状态变化，刘悠，正文明确确认关系进入新的稳定亲密阶段
结算对象结束：刘思琪
类型完成：是
结算结束：是
关系结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：关系，刘悠(兄)，刘思琪(妹妹)，信任边界，轻微受损，动作越过舒适距离，关系短暂紧张
结算对象结束：刘思琪
类型完成：是
结算结束：是
角色卡结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：角色卡，性格，增加，边界感更强，面对越界动作紧张防备，偏向退缩
结算对象结束：刘思琪
类型完成：是
结算结束：是`, { requestedTypes: ['性历史', '关系', '角色卡'], participants, store, config: loop.realConfig() });
  assert.deepStrictEqual(parsed.completeTypes, ['性历史', '关系', '角色卡']);
  assert.ok(parsed.genericUpdates.some((item) => item.updateType === 'sexual-history'));
  assert.ok(parsed.genericUpdates.some((item) => item.updateType === 'relationship'));
  assert.ok(parsed.genericUpdates.some((item) => item.updateType === 'role-card'));
});
```

Run: `node "tests/real-world-loop-update.test.js"`
Expected: FAIL until special parsers exist.

- [ ] **Step 3: Add type contracts and queue**

Insert before `buildGroupedUpdateJsonPrompt(...)`:

```js
  settlementTypeQueue(config = this.realConfig()) {
    const base = ['基础结算', '情绪', '感觉', '生命体征', '身体状态', '穿着状态', '性经历', '性历史', '关系', '角色卡', '物品', '地图', '势力总览', '势力结构', '系统记录', '通用固化'];
    return config.mode === 'story' ? base.concat(['操控体验']) : base;
  },

  settlementTypeContracts() {
    return {
      '基础结算': { title: '基础结算', labels: ['基础结算'], format: '经过时间：秒数\n当前状态：状态文本\n当前目标：目标文本\n场景标题：标题\n地点名称：地点全称\n备选行动1：行动文本\n备选行动2：行动文本\n备选行动3：行动文本\n备选行动4：行动文本' },
      '情绪': { title: '情绪结算', labels: ['情绪'], format: '更新N：情绪，情绪名，+/-数值，变化原因。先匹配规范情绪和别名，未命中才内部落临时情绪。' },
      '感觉': { title: '感觉结算', labels: ['感觉'], format: '更新N：感觉，感觉名，+/-数值，变化原因。先匹配规范感觉和别名，未命中才内部落临时感觉。' },
      '生命体征': { title: '生命体征结算', labels: ['生命体征'], format: '更新N：生命体征，字段名，+/-数值，变化原因' },
      '身体状态': { title: '身体状态结算', labels: ['身体状态'], format: '更新N：身体状态，部位或状态键，新状态，变化原因' },
      '穿着状态': { title: '穿着状态结算', labels: ['穿着状态'], format: '更新N：穿着状态，穿着部位，衣物名称，当前状态，变化原因' },
      '性经历': { title: '性经历结算', labels: ['性经历'], format: '更新N：性经历，分类，+/-数值，变化原因' },
      '性历史': { title: '性历史结算', labels: ['性历史'], format: '更新N：性历史，状态转移，性对象，原因与证据' },
      '关系': { title: '关系结算', labels: ['关系'], format: '更新N：关系，甲方(称谓)，乙方(称谓)，维度，当前状态，变化原因，根据性格造成结果' },
      '角色卡': { title: '角色卡结算', labels: ['角色卡'], format: '更新N：角色卡，字段，替换/增加，新值，原因，根据性格造成结果' },
      '物品': { title: '物品结算', labels: ['物品'], format: '更新N：物品，物品类型，物品名，事实或变化，变化原因' },
      '地图': { title: '地图结算', labels: ['地图'], format: '更新N：地图，当前位置/上级地点/地点事实/地图节点/路线事实，事实，原因' },
      '势力总览': { title: '势力总览结算', labels: ['势力总览'], format: '更新N：势力总览，新增势力/上层势力归属/势力APP归属，事实，原因' },
      '势力结构': { title: '势力结构结算', labels: ['势力结构'], format: '更新N：势力结构，部门角色/职位/成员地位，事实，原因' },
      '系统记录': { title: '系统记录结算', labels: ['系统记录'], format: '更新N：系统记录，事件/记录/通信消息/剧情记录/状态，事实，原因' },
      '通用固化': { title: '通用固化结算', labels: ['通用固化'], format: '更新N：通用固化，字段，稳定事实，变化原因' },
      '操控体验': { title: '操控体验结算', labels: ['操控感觉', '适应度'], format: '更新N：操控感觉/适应度，字段，+/-数值或新值，变化原因' },
    };
  },
```

- [ ] **Step 4: Add settlement catalog and special line parsers**

Insert after type contracts:

```js
  settlementUpdateCatalog() {
    return {
      '情绪': { updateType: 'emotion', fieldPrefix: 'metrics.emotions', temporaryFieldPrefix: 'metrics.temporaryEmotions' },
      '感觉': { updateType: 'feeling', fieldPrefix: 'metrics.playerFeelings', temporaryFieldPrefix: 'metrics.temporaryPlayerFeelings' },
      '生命体征': { updateType: 'vital', fieldMap: { '精力': 'vitals.stamina_pool', '饱食度': 'vitals.satiety', '水分': 'vitals.hydration', '疲劳': 'vitals.fatigue', '精神稳定': 'vitals.mental_stability' } },
      '身体状态': { updateType: 'body-status', fieldPrefix: 'bodyStatus', aliases: { '整体': 'overall', '口部': 'mouth', '胸部': 'chest', '阴部': 'genital', '肛部': 'anus', '臀部': 'hips', '四肢': 'limbs', '皮肤': 'skin', '其他': 'other' } },
      '穿着状态': { updateType: 'wearing-state', fieldPrefix: 'values.wearing' },
      '性经历': { updateType: 'sexual-experience', fieldPrefix: 'intimacy.sexualExperienceParts' },
      '性历史': { updateType: 'sexual-history', fieldPrefix: 'intimacy.sexualHistory' },
      '关系': { updateType: 'relationship', fieldPrefix: 'relationships' },
      '角色卡': { updateType: 'role-card', fieldPrefix: 'profile' },
      '物品': { updateType: 'item', fieldPrefix: 'inventory' },
      '地图': { updateType: 'map', fieldMap: { '当前位置': 'current', '上级地点': 'parent', '地点事实': 'descriptionFacts', '地图节点': 'mapNodes', '路线事实': 'routeLinks' } },
      '势力总览': { updateType: 'faction-overview', fieldMap: { '新增势力': 'overview.factions', '上层势力归属': 'children.factions', '势力APP归属': 'apps' } },
      '势力结构': { updateType: 'faction-structure', fieldMap: { '部门角色': 'structure', '职位': 'positions', '成员地位': 'members' } },
      '系统记录': { updateType: 'system', fieldMap: { '事件': 'events', '记录': 'records', '通信消息': 'messages', '剧情记录': 'plots', '状态': 'status' } },
      '通用固化': { updateType: 'generic', fieldPrefix: 'status_tags' },
    };
  },

  participantAllowedForSettlement(name = '', participants = []) {
    const clean = String(name || '').trim();
    return Boolean(clean) && participants.some((p) => [p.name, p.id, p.idOrName].map((x) => String(x || '').trim()).includes(clean));
  },

  subjectForSettlement(name = '', participants = []) {
    const found = participants.find((p) => [p.name, p.id, p.idOrName].map((x) => String(x || '').trim()).includes(String(name || '').trim()));
    return found ? { type: found.type || 'character', id: found.id || found.idOrName || found.name, name: found.name || name } : null;
  },

  parseStandardSettlementLine(typeName = '', line = '', subject = null) {
    const parts = String(line || '').replace(/^更新\d+\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const [label, key, rawValue, reason] = parts;
    const entry = this.settlementUpdateCatalog()[label];
    if (!entry || !subject || !key || !rawValue || !reason) return null;
    const delta = Number(String(rawValue).replace(/[^-+\d.]/gu, ''));
    const field = entry.fieldMap?.[key] || `${entry.fieldPrefix}.${key}`;
    const change = Number.isFinite(delta) && /^[+-]?\d/u.test(String(rawValue)) ? { mode: 'delta', value: delta } : { mode: 'set', value: rawValue };
    return { updateType: entry.updateType, subject, field, change, reasons: [{ trigger: label, evidence: reason, confidence: 'confirmed' }] };
  },

  parseSpecialSettlementLine(typeName = '', line = '', subject = null) {
    const parts = String(line || '').replace(/^更新\d+\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (!subject || parts[0] !== typeName) return null;
    if (typeName === '性历史') {
      const [, transition, partner, evidence] = parts;
      if (!transition || !partner || !evidence) return null;
      return { updateType: 'sexual-history', subject, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { transition, partner: { type: 'character', id: partner, name: partner }, evidence, historyText: [transition, partner, evidence].join('，') } }, reasons: [{ trigger: '性历史状态转移', evidence, confidence: 'confirmed' }] };
    }
    if (typeName === '关系') {
      const [, left, right, dimension, status, reason, result] = parts;
      if (!left || !right || !dimension || !status || !reason || !result) return null;
      return { updateType: 'relationship', subject, field: `relationships.${dimension}`, change: { mode: 'upsert', value: { left, right, dimension, status, reason, result } }, reasons: [{ trigger: '关系变化', evidence: reason, confidence: 'confirmed' }] };
    }
    if (typeName === '角色卡') {
      const [, field, op, value, reason, result] = parts;
      if (!field || !op || !value || !['替换', '增加'].includes(op)) return null;
      return { updateType: 'role-card', subject, field: field === '当前状态' ? 'status_tags' : `profile.${field}`, change: { mode: op === '替换' ? 'set' : 'append', value: { value, reason, result } }, reasons: [{ trigger: `角色卡${op}`, evidence: reason || value, confidence: 'confirmed' }] };
    }
    return null;
  },
```

- [ ] **Step 5: Implement type-window parser**

Insert after special line parsers:

```js
  parseSettlementKv(raw, { requestedTypes = [], participants = [], store = null, config = this.realConfig() } = {}) {
    const lines = String(raw || '').split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    const contracts = this.settlementTypeContracts();
    const patchesByType = {};
    const completeTypes = [];
    const incompleteTypes = [];
    const baseFields = {};
    let currentType = '';
    let currentSubject = null;
    const ensurePatch = (type) => { patchesByType[type] = patchesByType[type] || { genericUpdates: [], baseFields: {} }; return patchesByType[type]; };
    for (const line of lines) {
      const typeHit = Object.entries(contracts).find(([, c]) => line === `${c.title}：` || line === `${c.title}:`);
      if (typeHit) { currentType = typeHit[0]; currentSubject = null; ensurePatch(currentType); continue; }
      if (!currentType) continue;
      if (currentType === '基础结算') {
        const base = this.splitKvLine(line);
        if (base && ['经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4'].includes(base.key)) {
          baseFields[base.key] = base.value;
          ensurePatch(currentType).baseFields[base.key] = base.value;
          continue;
        }
      }
      if (/^结算对象[：:]/u.test(line)) {
        const [name, objectType, allowed] = line.replace(/^结算对象[：:]/u, '').split(/[｜|]/u).map((x) => x.trim());
        const isSceneParticipant = this.participantAllowedForSettlement(name, participants);
        const isNonCharacterSystem = ['地点', '势力', '世界', '系统'].includes(objectType);
        currentSubject = allowed === '允许结算' && (isSceneParticipant || isNonCharacterSystem) ? (this.subjectForSettlement(name, participants) || { type: objectType || 'system', id: name, name }) : null;
        continue;
      }
      if (/^更新\d+[：:]/u.test(line)) {
        const update = ['性历史', '关系', '角色卡'].includes(currentType) ? this.parseSpecialSettlementLine(currentType, line, currentSubject) : this.parseStandardSettlementLine(currentType, line, currentSubject);
        if (update) ensurePatch(currentType).genericUpdates.push(update);
        continue;
      }
      if (/^类型完成[：:]是$/u.test(line)) {
        ensurePatch(currentType).__typeDone = true;
        continue;
      }
      if (/^结算结束[：:]是$/u.test(line)) {
        ensurePatch(currentType).__settlementDone = true;
      }
    }
    requestedTypes.forEach((type) => {
      const patch = patchesByType[type];
      if (patch?.__typeDone && patch?.__settlementDone) completeTypes.push(type);
      else incompleteTypes.push(type);
    });
    const genericUpdates = completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []);
    return { patchesByType, completeTypes, incompleteTypes, genericUpdates, baseFields };
  },
```

- [ ] **Step 6: Add sliding window prompt builder**

Insert after `parseSettlementKv(...)`:

```js
  buildSettlementTypeWindowPrompt({ requestedTypes = [], completedTypes = [], incompleteTypes = [], partialByType = {}, store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], config = this.realConfig() }) {
    const contracts = this.settlementTypeContracts();
    const typeText = requestedTypes.map((type) => {
      const c = contracts[type];
      return [`## ${type}`, `${c.title}：`, '结算状态：需要更新 / 无变化', '结算对象：显示名全称｜角色/玩家/地点/势力/世界/系统｜允许结算', c.format, '结算对象结束：显示名全称', '类型完成：是', '结算结束：是'].join('\n');
    }).join('\n\n');
    const updatePromptText = this.compactUpdatePromptText(window.GameModules.updateRegistry?.skillsText?.(requestedTypes) || '', 2200);
    const initSkillText = this.compactUpdatePromptText(window.GameModules.initPromptRegistry?.skillText?.([], store) || '', 1600);
    const initSchema = this.compactUpdateSchema(window.GameModules.initPromptRegistry?.schema?.([], store) || {});
    return window.GameModules.promptTemplates.render('inference-stage4-settlement-window', {
      本次必须返回的类型: requestedTypes.join('、'),
      已完成类型摘要: completedTypes.join('、') || '无',
      残缺类型: incompleteTypes.join('、') || '无',
      残缺原因或尾部: Object.entries(partialByType).map(([k, v]) => `${k}:${String(v).slice(-160)}`).join('；') || '无',
      现有Update提示词摘要: updatePromptText || '无',
      现有Init提示词: initSkillText || '无',
      现有Init字段Schema: JSON.stringify(initSchema),
      本回合参与者: JSON.stringify(participants),
      正文: this.compactUpdatePromptText(narration, 1800, true),
      类型合约: typeText,
    });
  },
```

- [ ] **Step 7: Implement sliding window completion**

Insert after `completeConfiguredUpdateJson(...)`:

```js
  async completeConfiguredSettlementKvWindow({ store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], logId = null, config = this.realConfig() }) {
    const allTypes = this.settlementTypeQueue(config);
    const completedTypes = [];
    const partialByType = {};
    const patchesByType = {};
    let requestedTypes = allTypes.slice();
    const maxAttempts = Math.max(4, allTypes.length + 1);
    for (let attempt = 0; attempt < maxAttempts && requestedTypes.length; attempt += 1) {
      const prompt = this.buildSettlementTypeWindowPrompt({ requestedTypes, completedTypes, incompleteTypes: requestedTypes.filter((type) => partialByType[type]), partialByType, store, action, base, loaded, materialSession, narration, trace, participants, config });
      const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}Stage4滑动结算` });
      const parsed = this.parseSettlementKv(raw, { requestedTypes, participants, store, config });
      parsed.completeTypes.forEach((type) => {
        completedTypes.push(type);
        patchesByType[type] = parsed.patchesByType[type];
        delete partialByType[type];
      });
      parsed.incompleteTypes.forEach((type) => { partialByType[type] = raw; });
      requestedTypes = allTypes.filter((type) => !completedTypes.includes(type));
    }
    if (requestedTypes.length) throw new Error(`Stage4结算类型未完成：${requestedTypes.join('、')}`);
    return this.mergeGroupedUpdatePatches(Object.values(patchesByType), {});
  },
```

- [ ] **Step 8: Use sliding window completion in `generateConfiguredFinal()`**

In `generateConfiguredFinal(...)`, replace grouped Stage3 update call:

```js
      updates = await this.completeGroupedStage3Updates({ store, action, base, loaded, skills, materialSession, narration, route: selectedSkills, logId, config, trace, participants });
```

with:

```js
      updates = await this.completeConfiguredSettlementKvWindow({ store, action, base, loaded, materialSession, narration, trace, participants, logId, config });
```

Keep `completeGroupedStage3Updates()` for legacy tests until removed later, but new configured final must use sliding window.

- [ ] **Step 9: Update tests stubbing final settlement**

In `generateConfiguredFinal uses base fields and four grouped patches`, stub:

```js
  loop.completeConfiguredSettlementKvWindow = async () => ({ genericUpdates: [{ updateType: 'wearing-state', subject: { type: 'character', id: 'rushiqi', name: '刘思琪' }, field: 'values.wearing', change: { mode: 'set', value: [{ slot: 'bra', name: '胸罩', state: '仍穿着但被推开' }] }, reasons: [{ trigger: '衣物局部状态变化', evidence: '正文确认', confidence: 'confirmed' }] }] });
```

In `generateConfiguredFinal reuses computed Stage 3 participants across groups`, stub:

```js
  loop.completeConfiguredSettlementKvWindow = async () => ({ genericUpdates: [] });
```

- [ ] **Step 10: Run settlement sliding-window regression**

Run: `node "tests/real-world-loop-update.test.js"`
Expected: PASS for K:V settlement parser, special format parser, sliding completion, and generate final tests.

---

### Task 8: Update Real and Work-Lore Material Guidance

**Files:**
- Modify: `publish/prompts/materials/real-world-materials.js`
- Modify: `publish/prompts/materials/work-lore-materials.js`
- Test: `tests/real-world-loop-update.test.js`
- Test: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: existing material item definitions.
- Produces: material guidance that explicitly requires Chinese semantic requests and scene anchoring limits.

- [ ] **Step 1: Add failing wording tests**

Append to `tests/real-world-loop-update.test.js`:

```js
test('real world materials mention Chinese requests, scene anchoring, and Top3 role card rule', () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompts/materials/real-world-materials.js');
  const text = JSON.stringify(context.window.GameModules.realWorldMaterials || {});
  assert.ok(text.includes('中文资料请求'));
  assert.ok(text.includes('场景锚定'));
  assert.ok(text.includes('Top3'));
  assert.ok(text.includes('加载角色卡不等于出场或结算'));
  assert.ok(text.includes('不得输出英文 skill/method'));
});
```

Append to `tests/story-agent-guided.test.js`:

```js
test('work lore materials mention Chinese requests and canon constraints', () => {
  const context = createContext();
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  loadScript(context, 'publish/prompts/materials/work-lore-materials.js');
  const text = JSON.stringify(context.window.GameModules.workLoreMaterials || {});
  assert.ok(text.includes('中文资料请求'));
  assert.ok(text.includes('作品设定查询'));
  assert.ok(text.includes('canon'));
  assert.ok(text.includes('当前时间线'));
});
```

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: FAIL until wording changes.

- [ ] **Step 2: Update real material descriptions**

In `publish/prompts/materials/real-world-materials.js`, update relevant `when` strings:

```js
when: '中文资料请求：角色查询，搜索角色卡，角色全称，世界全称。场景锚定确认强制出场、高优先候选或戏剧候选时查询完整角色卡；角色卡 Top3，优先强制出场，其次高优先候选，最后开放场景戏剧候选。加载角色卡不等于出场或结算；不得输出英文 skill/method。'
```

For current location:

```js
when: '中文资料请求：地点查询，当前地点上下文，世界全称。场景锚定需要确认当前地点、空间边界、门口/相邻房间/可听见范围，以及谁具备自然入场条件；不得输出英文 skill/method。'
```

For nearby locations:

```js
when: '中文资料请求：地点查询，查询附近地点，地点全称。场景锚定需要确认邻近空间、候选角色能否合理听见、路过、等待或延迟到场；不得输出英文 skill/method。'
```

- [ ] **Step 3: Update work-lore descriptions**

In `publish/prompts/materials/work-lore-materials.js`, update worklore item `when` strings to include exact phrases. Example for `work-people`:

```js
when: '中文资料请求：作品设定查询，搜索人物，人物全称，作品全称。行动涉及原作人物、身份、性格、当前阶段时查询；必须遵守 canon 和当前时间线，不得提前使用后期情报。'
```

For `work-timeline`:

```js
when: '中文资料请求：作品设定查询，搜索时间线，时间/日期/阶段，作品全称。行动需要按当前时间线限制资料，避免剧透或后期信息提前。'
```

For `work-location`:

```js
when: '中文资料请求：作品设定查询，搜索地点，地点全称，作品全称。场景锚定需要确认原作地点、空间距离、移动方式、能力规则和 canon 限制。'
```

- [ ] **Step 4: Run material wording tests**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: PASS for material wording tests.

---

### Task 9: Full Regression and Spec Acceptance Checks

**Files:**
- Verify: `publish/real-world-agent-loop.js`
- Verify: `publish/real-world-agent-context.js`
- Verify: `publish/story-agent-context.js`
- Verify: `publish/prompts/materials/real-world-materials.js`
- Verify: `publish/prompts/materials/work-lore-materials.js`
- Verify: `tests/real-world-loop-update.test.js`
- Verify: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified implementation matching the spec-first guided pipeline.

- [ ] **Step 1: Run full Node regression**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: every test prints `PASS` and process exits with code `0`.

- [ ] **Step 2: Inspect key diffs**

Run:

```bash
git diff -- "publish/real-world-agent-loop.js" "publish/real-world-agent-context.js" "publish/story-agent-context.js" "publish/prompts/materials/real-world-materials.js" "publish/prompts/materials/work-lore-materials.js" "tests/real-world-loop-update.test.js" "tests/story-agent-guided.test.js"
```

Expected checks in diff:

```text
- Stage1 prompt requires Chinese K:V and no longer asks for JSON.
- parseStep supports Chinese K:V, aliases, parse scoring, retry threshold, trace parseScore/parseDegraded/droppedMaterialRequests.
- Chinese material requests map through whitelist catalog for real and story modes.
- loadStepContext loads role-card Top3, scene anchors, then legacy/mapped requests with limits.
- scene anchor report is generated and parsed before narration.
- narration prompt includes scene anchor report before loaded materials.
- stageParticipants no longer calls loadedRoleCardParticipants.
- grouped settlement prompts request Chinese K:V and parseSettlementKv maps through settlementUpdateCatalog.
- forbidden/loaded/candidate/random background participants cannot settle.
- real and work-lore materials mention Chinese requests and scene anchoring constraints.
```

- [ ] **Step 3: Manual acceptance for direct interaction**

Use app or harness action:

```text
拉扯刘思琪的 choker
```

Expected trace:

```text
Stage1：中文 K:V 查询规划。
强制出场：刘悠、刘思琪。
高优先候选：可包含刘思怡，但不是强制。
场景锚定报告：结算边界只包含刘悠与刘思琪，除非正文写明刘思怡实际入场并互动。
Stage4：刘思怡若只是候选或仅加载角色卡，不进入本回合参与者，不输出结算更新。
```

- [ ] **Step 4: Manual acceptance for forbidden participant**

Use app or harness action:

```text
推开房门，禁止刘思怡出场
```

Expected trace:

```text
禁止出场：刘思怡。
刘思怡不加载完整角色卡。
刘思怡不出现在 randomActiveEvents。
刘思怡不进入正文。
刘思怡不进入 Stage4 本回合参与者。
```

- [ ] **Step 5: Manual acceptance for story mode**

Use story/controlled剧情 action where current work has known worklore:

```text
观察当前地点并判断附近是否有人能自然介入
```

Expected trace:

```text
Stage1：中文 K:V 查询规划。
资料请求使用“作品设定查询，搜索地点/人物/时间线/能力，中文关键词，作品全称”。
随机事件遵守作品设定、canon、当前时间线、地点和能力规则。
闯入必须写清合理条件；未实际入场不结算。
```

- [ ] **Step 6: No-commit final state**

Run:

```bash
git status --short
```

Expected: only intentional implementation/test/spec/plan files are modified or untracked. Do not run `git commit` unless the user explicitly asks for a commit.

---

## Self-Review

**Spec coverage:**
- Stage1 多轮中文 K:V：Task 1 and Task 3.
- 中文资料请求与白名单映射：Task 2.
- 受控检索、Top3 角色卡、地点/历史/记忆限额：Task 4.
- 场景锚定报告单独生成、中文 K:V 解析、正文前注入：Task 5.
- 正文服从锚定边界：Task 5.
- 加载角色卡不等于当前参与者/结算：Task 6.
- Stage4 中文结算 K:V 与白名单映射：Task 7.
- 现实和异世界/story 双模式：Task 2、Task 4、Task 8、Task 9.
- 随机场外主动事件默认不污染当前场景：Task 3、Task 4、Task 5、Task 6.
- 禁止出场在查询、正文、随机事件、结算阶段生效：Task 3、Task 4、Task 5、Task 6、Task 7.
- 材料说明同步：Task 8.

**Placeholder scan:** This plan contains no TBD, no TODO, no “implement later”, no “write tests for above”, and no intentionally undefined function names. Every introduced function appears in an interface block and an implementation step.

**Type consistency:** `forcedParticipants` / `priorityCandidates` / `dramaCandidates` / `forbiddenParticipants` are arrays of normalized participant objects across parser, trace, context request builders, scene anchor prompt, and settlement boundary. `randomActiveEvents` always uses `characterName`, `eventType`, `motivation`, `actionMethod`, `impactTiming`, `canEnterCurrentScene`, `canSettleCurrentScene`. Material requests always use `{ skill, method, params, sourceText? }` after whitelist mapping.
