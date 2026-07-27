# Profile/RPG Social Field Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复身份页四类角色卡列表，并保证社群角色、人事归属在 `profile` 与 RPG `values` 之间按明确来源同步一致。

**Architecture:** 身份页通过角色卡字段的显式 `profileListKey` 元数据识别列表，不再使用 RPG 原始字段兜底。`rpgState.syncSocialFields(state, source, store)` 作为唯一数组复制入口；生成/加载以 `profile` 为源，结算以 `values` 为源，证书和称号始终只保留在 `profile`。

**Tech Stack:** 浏览器 JavaScript、Node.js `vm` 测试、现有 `GameModules` 模块系统。

---

## 文件结构

- Modify: `tests/profile-identity-section-source.test.js` — 复现并验证四类角色卡列表进入最终展示模型。
- Modify: `publish/player-identity-actions.js` — 为角色卡数组字段提供显式列表元数据。
- Modify: `publish/rpg-field-ui.js` — 识别显式角色卡列表字段。
- Create: `tests/rpg-social-field-consistency.test.js` — 验证同步方向、复制隔离、清空和证书/称号边界。
- Modify: `publish/rpg-state.js` — 提供统一社会字段同步入口。
- Modify: `publish/update/generic-update-applier.js` — 通用角色卡/RPG 更新后调用统一入口。
- Modify: `publish/app/org-territory/settlement-actions.js` — 人事结算从 RPG 结果同步回角色卡。
- Modify: `publish/player-identity-actions.js` — 玩家生成/加载从角色卡同步至 RPG。
- Modify: `publish/company-faction-actions.js`、`publish/org-territory-system.js` — 消除剩余直接写入造成的分叉。
- Regenerate: `mobile/android-webview-shell/app/src/main/assets/publish/**` — 使用现有 Android 资源同步脚本镜像运行时代码。

### Task 1: 身份页直接显示四类角色卡列表

**Files:**
- Modify: `tests/profile-identity-section-source.test.js`
- Modify: `publish/player-identity-actions.js:122-145`
- Modify: `publish/rpg-field-ui.js:83`

- [ ] **Step 1: 写入失败测试**

在 `identityFields` 中加入四个真实带前缀字段，并带显式元数据：

```js
const profileLists = [
  { key: 'id-demo-factions', profileListKey: 'factions', label: '社群角色', raw: [{ faction: '角色卡社群', role: '成员', reason: '角色卡事实。' }] },
  { key: 'id-demo-memberships', profileListKey: 'memberships', label: '人事归属', raw: [{ orgName: '角色卡组织', title: '成员', reason: '角色卡事实。' }] },
  { key: 'id-demo-certificates', profileListKey: 'certificates', label: '证书', raw: [{ orgName: '认证组织', field: '测试', level: '一级', reason: '角色卡事实。' }] },
  { key: 'id-demo-titles', profileListKey: 'titles', label: '称号', raw: [{ society: '认可群体', field: '测试', title: '测试称号', reason: '角色卡事实。' }] },
].map((field) => ({ ...field, value: field.raw, profileGroup: '', stateId: 'demo' }));
```

断言：

```js
const dossier = ui.identityInfoPresentation(identity.fields);
assert.deepStrictEqual(dossier.lists.map((item) => item.label), ['社群角色', '人事归属', '证书', '称号']);
assert.ok(!identity.fields.some((field) => ['factions', 'memberships'].includes(field.key)));
```

- [ ] **Step 2: 运行测试确认按预期失败**

Run: `node tests/profile-identity-section-source.test.js`

Expected: FAIL，`dossier.lists` 为空或缺少四个标签。

- [ ] **Step 3: 写最小实现**

在 `player-identity-actions.js` 的 `listRow` 中写入 `profileListKey: key`：

```js
return row(key, label, list, desc, { raw: list, profileListKey: key, ...extra });
```

在 `rpg-field-ui.js` 中让列表判断优先使用显式元数据：

```js
isRpgListField(field) {
  const key = String(field?.profileListKey || field?.key || '');
  return ['knowledge', 'skills', 'professions', 'factions', 'memberships', 'certificates', 'titles', 'items', 'wearing', 'bodyProfile', 'dressedProfile', 'bodyStatus', 'sexualExperienceParts', 'sexualPartners', 'status_tags'].includes(key)
    && Array.isArray(field?.raw);
},
```

不得向身份分区重新追加 `state.values.factions/memberships`。

- [ ] **Step 4: 运行测试确认通过**

Run: `node tests/profile-identity-section-source.test.js`

Expected: PASS，四类标签顺序完整。

### Task 2: 建立统一社会字段同步入口

**Files:**
- Create: `tests/rpg-social-field-consistency.test.js`
- Modify: `publish/rpg-state.js:131-149`

- [ ] **Step 1: 写入失败测试**

加载真实 `publish/rpg-state.js`，构造同时含 `profile`、`values` 的 state，覆盖四个行为：

```js
const state = {
  id: 'demo',
  profile: {
    factions: [{ faction: '角色卡社群', role: '成员', reason: '角色卡事实。' }],
    memberships: [{ orgName: '角色卡组织', title: '成员', reason: '角色卡事实。' }],
    certificates: [{ orgName: '认证组织', field: '测试', level: '一级', reason: '角色卡事实。' }],
    titles: [{ society: '认可群体', field: '测试', title: '称号', reason: '角色卡事实。' }],
  },
  values: { factions: [], memberships: [] },
};
```

依次断言：`source='profile'` 后两侧深度相等但引用不同；`source='values'` 后 profile 接收新值；显式空数组能清空两侧；`values` 不出现 `certificates` 和 `titles`。

- [ ] **Step 2: 运行测试确认按预期失败**

Run: `node tests/rpg-social-field-consistency.test.js`

Expected: FAIL，`syncSocialFields` 尚不存在。

- [ ] **Step 3: 写最小实现**

在 `rpg-state.js` 增加：

```js
syncSocialFields(state, source = 'profile', store = null) {
  if (!state?.profile) return false;
  state.values = state.values && typeof state.values === 'object' ? state.values : {};
  const input = source === 'values' ? state.values : state.profile;
  const clone = (value) => (Array.isArray(value) ? value.map((item) => (
    item && typeof item === 'object' ? { ...item } : item
  )) : []);
  const factions = clone(input.factions);
  const memberships = clone(input.memberships);
  const changed = JSON.stringify(state.profile.factions || []) !== JSON.stringify(factions)
    || JSON.stringify(state.profile.memberships || []) !== JSON.stringify(memberships)
    || JSON.stringify(state.values.factions || []) !== JSON.stringify(factions)
    || JSON.stringify(state.values.memberships || []) !== JSON.stringify(memberships);
  state.profile.factions = clone(factions);
  state.profile.memberships = clone(memberships);
  state.values.factions = clone(factions);
  state.values.memberships = clone(memberships);
  if (changed) state.profile.roleCardUpdatedAt = store?.phoneDateText?.() || new Date().toISOString();
  if (memberships.length) window.GameModules.orgTerritory?.syncCharacterOrgMemberships?.(state, store);
  return changed;
},
```

将 `syncSocialPositions(state)` 改为委托 `syncSocialFields(state, 'profile')`。

- [ ] **Step 4: 运行测试确认通过**

Run: `node tests/rpg-social-field-consistency.test.js`

Expected: PASS，且证书/称号未进入 `values`。

### Task 3: 所有明确社会字段更新都调用统一入口

**Files:**
- Modify: `tests/player-identity-actions.test.js`
- Modify: `tests/settlement-social-pipeline.test.js`
- Modify: `publish/player-identity-actions.js:3-26`
- Modify: `publish/update/generic-update-applier.js:156-177`
- Modify: `publish/app/org-territory/settlement-actions.js:274-292`
- Modify: `publish/company-faction-actions.js:90-115`
- Modify: `publish/org-territory-system.js:1655-1678`

- [ ] **Step 1: 增加失败断言**

在玩家测试中断言同步后的数组不是同一引用：

```js
assert.notStrictEqual(state.profile.factions, state.values.factions);
assert.notStrictEqual(state.profile.memberships, state.values.memberships);
```

在结算测试中断言添加、移除及清空人事归属后 `profile.memberships` 与 `values.memberships` 深度相等。

- [ ] **Step 2: 运行相关测试确认失败**

Run: `node tests/player-identity-actions.test.js && node tests/settlement-social-pipeline.test.js`

Expected: 至少一个引用隔离或清空同步断言失败。

- [ ] **Step 3: 替换直接复制逻辑**

- `playerIdentityActions.syncPlayerSocialFields` 在完成角色卡规范化后调用 `rpgState.syncSocialFields(current, 'profile', this)`。
- `generic-update-applier` 检测 `profile.factions/profile.memberships` 时使用 `source='profile'`；检测 `values.factions/values.memberships` 时使用 `source='values'`。
- `settlement-actions.applyMembershipUpdate` 修改 `values.memberships` 后调用 `source='values'`。
- `company-faction-actions` 修改 profile 或 values 后调用与本次写入侧一致的来源。
- `org-territory-system` 规范化 `values.memberships` 后调用 `source='values'`。

每个调用点不得再次手写另一侧数组赋值。

- [ ] **Step 4: 运行相关测试确认通过**

Run: `node tests/player-identity-actions.test.js && node tests/settlement-social-pipeline.test.js && node tests/company-faction-actions.test.js`

Expected: 全部 PASS。

### Task 4: 同步平台资源并完成回归验证

**Files:**
- Regenerate: `mobile/android-webview-shell/app/src/main/assets/publish/player-identity-actions.js`
- Regenerate: `mobile/android-webview-shell/app/src/main/assets/publish/rpg-field-ui.js`
- Regenerate: `mobile/android-webview-shell/app/src/main/assets/publish/rpg-state.js`
- Regenerate: 其余本次修改的 Android publish 镜像

- [ ] **Step 1: 同步 Android 资源**

Run: `npm run android:sync-assets`

Expected: 命令退出码 0，只更新 root publish 对应镜像及生成清单。

- [ ] **Step 2: 运行针对性测试**

Run:

```powershell
node tests/profile-identity-section-source.test.js
node tests/rpg-social-field-consistency.test.js
node tests/player-identity-actions.test.js
node tests/character-profile-country-membership.test.js
node tests/settlement-social-pipeline.test.js
node tests/company-faction-actions.test.js
```

Expected: 全部 PASS，0 个失败。

- [ ] **Step 3: 运行结构与资源验证**

Run:

```powershell
npm run verify:assets
npm run verify:runtime-coverage
npm run verify:runtime-deps
npm run verify:required-runtime-syntax
```

Expected: 全部退出码 0。

- [ ] **Step 4: 检查工作区范围**

Run: `git status --short && git diff --check`

Expected: 用户原有 `publish/real-world-agent-location-fill.js`、`tests/location-graph-query.test.js` 与日志目录保持不变；本任务只新增/修改计划列出的文件及同步生成的 Android 镜像。
