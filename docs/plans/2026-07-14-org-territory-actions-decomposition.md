# 组织领地动作层拆分实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在玩法、存档结构和公开行为不变的前提下，把 `publish/org-territory-actions.js` 的混合职责迁入明确的领域规则与应用编排模块，迁完调用者后删除旧巨型兼容文件。

**Architecture:** 纯解析与排序规则进入 `publish/domain/org-territory/`；家庭/政区、经济同步、Stage4 结算编排分别进入 `publish/app/org-territory/`。迁移期间旧顶层文件只做同名转发；消费者按职责改读新公开面，全部迁完并通过调用面审计后才能删除 facade。

**Tech Stack:** 浏览器原生 JavaScript、Alpine store、Node.js `assert`/`vm` 回归测试、Web 文件/HTTP Playwright 验证、Android WebView assets、Electron。

---

## 文件结构与依赖方向

- `publish/domain/org-territory/update-rules.js`
  - 只承载 `parseStructurePath`、`overviewEntryKey`、`parseOverviewPanel`、结算类型排序等无副作用规则。
  - 不访问 DOM、Alpine store、SQLite、Android 或 Electron。
- `publish/app/org-territory/family-actions.js`
  - 承载家庭组织、家庭地图锚点、行政区 stub、社区挂接。
  - 依赖 `GameModules.orgTerritory` 规则服务和显式传入的 store/map。
- `publish/app/org-territory/record-helpers.js`
  - 承载总览条目幂等 upsert、旧 `solid.overviewPanels` 规范化和现实系统记录追加。
  - 作为 economy 与 settlement 的单向共享写入边界，不调用任何具体动作模块。
- `publish/app/org-territory/economy-actions.js`
  - 承载公司经济镜像、玩家财富镜像、组织解散后的就业同步、状态经济级联。
  - 家庭组织只通过 `familyActions.ensureFamilyOrg()` 获取，不反向依赖结算编排。
- `publish/app/org-territory/settlement-actions.js`
  - 承载领土控制、组织结构、总览面板、成员关系、组织状态与 Stage4 更新分发。
  - 可单向调用 `familyActions`、`economyActions` 和 `domain.updateRules`，三者不得反向调用 settlement。
- `publish/org-territory-actions.js`
  - 迁移期仅保留同名转发；所有消费者迁移后删除。
- `tests/org-territory-actions-runtime.test.js`
  - 覆盖模块装载顺序、公开 contract、家庭/社区初始化、财富与就业同步、Stage4 分发等行为。

依赖方向固定为：

```text
consumer -> app/org-territory/* -> app/org-territory/record-helpers
                              -> domain/org-territory/update-rules
                              -> org-territory-system
                              -> shared stores

legacy facade -> app/org-territory/*
```

禁止出现 `domain -> app`、`family/economy -> settlement`、业务模块直连平台 source，以及 Android 镜像成为权威源码。

### Task 1: 家庭与政区动作迁移

**Files:**
- Create: `publish/app/org-territory/family-actions.js`
- Modify: `publish/org-territory-actions.js`
- Modify: `publish/org-territory-system.js`
- Modify: `publish/real-world-map-geopolitical.js`
- Modify: `publish/boot/scripts.json`
- Modify: `tests/org-territory-actions-runtime.test.js`

- [ ] **Step 1: 写失败 contract 测试**

在测试中先要求新模块存在，并要求活跃消费者不再调用 facade 的家庭 API：

```js
assert.strictEqual(typeof modules.app.orgTerritory.familyActions.ensureFamilyOrg, 'function');
assert.strictEqual(typeof modules.app.orgTerritory.familyActions.ensureAdminOrgStub, 'function');
assert.strictEqual(typeof modules.app.orgTerritory.familyActions.linkFamilyToCommunity, 'function');
assert.doesNotMatch(systemSource, /orgTerritoryActions\?\.ensureFamilyOrg/u);
assert.doesNotMatch(geopoliticalSource, /orgTerritoryActions/u);
```

- [ ] **Step 2: 运行测试并确认因新模块缺失而失败**

Run: `node tests/org-territory-actions-runtime.test.js`

Expected: FAIL，错误指向 `app.orgTerritory.familyActions` 尚不存在，而不是语法或 fixture 错误。

- [ ] **Step 3: 实现家庭动作模块并保留薄转发**

新模块公开面固定为：

```js
window.GameModules.app.orgTerritory.familyActions = {
  ensureFamilyOrg(store, options = {}),
  syncFamilyTerritoryAnchor(store, family = null, activeMap = null),
  ensureAdminOrgStub(store, item = {}, parentOrgId = ''),
  linkFamilyToCommunity(store, communityOrgId = '', activeMap = null),
};
```

旧 facade 对这四个方法只能做参数原样转发，不保留业务分支。`org-territory-system.js` 与 `real-world-map-geopolitical.js` 改为直接调用新模块。

- [ ] **Step 4: 验证家庭初始化与地图不递归**

Run: `node tests/org-territory-actions-runtime.test.js`

Expected: PASS；国家、社区、家庭均创建，家庭挂到社区，家庭锚点复用活动地图，`realWorldMap.ensure()` 嵌套次数为 0。

- [ ] **Step 5: 同步 Android 并提交**

Run: `npm run android:sync-assets && npm run verify:assets`

Commit: `refactor: isolate org territory family actions`

### Task 2: 经济同步动作迁移

**Files:**
- Create: `publish/app/org-territory/record-helpers.js`
- Create: `publish/app/org-territory/economy-actions.js`
- Modify: `publish/org-territory-actions.js`
- Modify: `publish/company-faction-actions.js`
- Modify: `publish/faction-actions.js`
- Modify: `publish/item-skill-actions.js`
- Modify: `publish/player-wealth-actions.js`
- Modify: `publish/taobao-buy-actions.js`
- Modify: `publish/org-territory-system.js`
- Modify: `publish/boot/scripts.json`
- Modify: `tests/org-territory-actions-runtime.test.js`

- [ ] **Step 1: 写失败的财富、公司和就业回归测试**

测试公开面和直接消费者边界：

```js
const economy = modules.app.orgTerritory.economyActions;
assert.strictEqual(typeof modules.app.orgTerritory.recordHelpers.upsertOverviewEntry, 'function');
assert.strictEqual(typeof economy.syncCompanyEconomicEntry, 'function');
assert.strictEqual(typeof economy.syncPlayerWealthAsset, 'function');
assert.strictEqual(typeof economy.syncEmploymentOnOrgDissolved, 'function');
assert.strictEqual(typeof economy.applyOrgStatusEconomicCascade, 'function');
```

同时构造家庭组织、玩家财富、在职记录，断言金额/财富层级镜像不变，组织解散后就业状态与历史记录保持原行为。

- [ ] **Step 2: 运行测试并确认因经济模块缺失而失败**

Run: `node tests/org-territory-actions-runtime.test.js`

Expected: FAIL，错误指向 `economyActions` 缺失。

- [ ] **Step 3: 实现经济动作模块并迁移消费者**

新模块公开面固定为：

```js
window.GameModules.app.orgTerritory.economyActions = {
  syncCompanyEconomicEntry(store, faction = {}, company = {}, reason = ''),
  syncPlayerWealthAsset(store, wealth = null),
  applyOrgStatusEconomicCascade(store, faction, reason = '', now = ''),
  syncEmploymentOnOrgDissolved(store, faction, reason = ''),
};
```

所有现有外部消费者改为直接调用该模块；旧 facade 只转发。经济模块通过 `familyActions.ensureFamilyOrg()` 获取家庭组织，不复制家庭创建逻辑。
总览条目和系统记录统一通过 `recordHelpers` 写入，economy 不调用旧 facade，也不复制 upsert 实现。

- [ ] **Step 4: 运行局部与共享验证**

Run: `node tests/org-territory-actions-runtime.test.js && npm run verify:company-faction-actions && npm run verify:shared`

Expected: 全部 PASS，且 `rg "orgTerritoryActions.*sync(PlayerWealthAsset|CompanyEconomicEntry|EmploymentOnOrgDissolved)" publish` 无活跃消费者。

- [ ] **Step 5: 同步 Android 并提交**

Run: `npm run android:sync-assets && npm run verify:assets`

Commit: `refactor: isolate org territory economy actions`

### Task 3: Stage4 结算与纯规则迁移

**Files:**
- Create: `publish/domain/org-territory/update-rules.js`
- Create: `publish/app/org-territory/settlement-actions.js`
- Modify: `publish/org-territory-actions.js`
- Modify: `publish/real-world-actions.js`
- Modify: `publish/boot/scripts.json`
- Modify: `tests/org-territory-actions-runtime.test.js`

- [ ] **Step 1: 写失败的更新规则与结算分发测试**

```js
const rules = modules.domain.orgTerritory.updateRules;
assert.deepStrictEqual(rules.parseStructurePath('solid.structure.后勤.roles'), {
  nodeName: '后勤',
  tail: ['roles'],
});
assert.strictEqual(rules.settlementRank('org-status'), 0);
assert.strictEqual(rules.settlementRank('territory-control'), 1);
assert.strictEqual(typeof modules.app.orgTerritory.settlementActions.applySettlementUpdates, 'function');
```

结算 fixture 需覆盖 `org-status` 先于 `territory-control`、单轮最多 12 条、旧 `updateStructure` 入口与 `characterStateStore.save()` 写入顺序。

- [ ] **Step 2: 运行测试并确认新规则/模块缺失**

Run: `node tests/org-territory-actions-runtime.test.js`

Expected: FAIL，错误指向 `domain.orgTerritory.updateRules` 或 `settlementActions` 缺失。

- [ ] **Step 3: 实现纯规则和结算编排**

`update-rules.js` 只导出纯函数。`settlement-actions.js` 公开：

```js
window.GameModules.app.orgTerritory.settlementActions = {
  applyTerritoryControl(store, update = {}),
  applyFactionStructureUpdate(store, update = {}, legacyItem = {}),
  applyOrgOverviewPanel(store, update = {}),
  applyMembershipUpdate(store, update = {}),
  applyOrgStatus(store, update = {}),
  applySettlementUpdates(store, updates = []),
  applyLegacyStructure(store, item = {}),
};
```

跨 economy/settlement 的共同写入统一调用 `recordHelpers`；结算私有 helper 保持模块私有。组织状态的经济副作用只调用 `economyActions`。`real-world-actions.js` 改为直接调用 `settlementActions.applySettlementUpdates()`。

- [ ] **Step 4: 运行结算与现实世界回归**

Run: `node tests/org-territory-actions-runtime.test.js && npm run verify:real-world-actions && npm run verify:real-world-settlement-actions`

Expected: 全部 PASS，Stage4 更新文本、状态顺序、存档写入与原实现一致。

- [ ] **Step 5: 同步 Android 并提交**

Run: `npm run android:sync-assets && npm run verify:assets`

Commit: `refactor: isolate org territory settlement actions`

### Task 4: 删除旧 facade 与完成多端门禁

**Files:**
- Delete: `publish/org-territory-actions.js`
- Modify: `publish/boot/scripts.json`
- Modify: `tests/org-territory-actions-runtime.test.js`
- Modify: `docs/architecture/` 下对应最终清理审计文档

- [ ] **Step 1: 建立删除 gate**

以下命令必须无活跃结果：

```powershell
rg -n "orgTerritoryActions" publish --glob "*.js" --glob "*.html"
```

测试需断言四份 Web/Android runtime 清单均不再包含 `org-territory-actions.js`，且新模块顺序满足 `domain rules -> family -> economy -> settlement -> consumers`。

- [ ] **Step 2: 删除旧文件并同步运行时清单**

只在 Step 1 通过后删除 facade；运行 `npm run android:sync-assets` 删除 Android 镜像。不得保留 `.bak`、restore alias 或第二份可编辑源。

- [ ] **Step 3: 执行最终静态审计**

Run: `npm run verify:runtime-coverage && npm run verify:runtime-deps && npm run verify:repo-boundaries && npm run verify:orphan-runtime-files`

Expected: 全部 PASS，运行时文件无孤儿、无清单漂移、无平台直连回流。

- [ ] **Step 4: 执行多端构建与玩法回归**

Run: `npm run build:multi-platform && npm run verify:multi-platform`

Expected:
- Web 文件与 HTTP 控制流程通过。
- APK runtime assets 零缺失、零漂移。
- EXE 发布文件零缺失、零漂移且可启动。
- 只有未配置 AI Key 的预期鉴权信息，无递归、页面错误或意外警告。

- [ ] **Step 5: 提交并 push**

Commit: `refactor: remove org territory action facade`

Push: `git push origin dev-refactor`

## 自审结论

- 规格覆盖：计划覆盖低耦合、复用性、玩法不变、旧入口渐进迁移、旧代码删除 gate、Web/APK/EXE 多端同步。
- 类型一致：三个 app 模块与一个 domain 模块的命名和调用方向在所有任务中保持一致。
- 风险隔离：初始化/财富/结算不会在同一提交一次性迁移；每片都有红绿测试、Android 同步和独立提交。
- 清理条件：只有调用面、运行时清单、行为测试和三端构建全部给出证据后才删除旧 facade。
