# Character and Intro Card Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 直接修复角色卡 Stage4 与介绍卡更新链路，让所有有推演锚点的字段完整补全，按字段所有权执行精确增删改，并新增独立 Stage5 维护无角色卡人物的介绍卡。

**Architecture:** 以 Markdown 作为提示词唯一源，在 Stage4 和新 Stage5 共享同一份完整性规则；用专用的类型化操作模块取代现有角色卡通用路径和错误的 membership upsert。Stage4 只更新完整角色卡，Stage5 对无角色卡人物执行一次 AI 增量更新、对已有角色卡人物执行确定性同步；介绍卡升格时再反向同步。位置由单一解析器约束为“所在世界·所在势力·动态层级链·地图地点·详细位置”。现有外观、势力、地图、经验和新闻业务逻辑不重写，只顺延阶段编号并接入同步点。

**Tech Stack:** 浏览器全局模块 `window.GameModules`、原生 JavaScript、Markdown 提示词、Node.js `assert`/`vm` 测试、`scripts/sync-inline-assets.js`、`dev/scripts/generate-script-manifest.cjs`。

---

## 变更原则

- 对已确认错误或不完整的角色卡、介绍卡更新路径直接替换，不保留旧 key、旧 JSON 合约、旧数组覆盖入口、双写或迁移分支。
- 不迁移存档角色卡；验收以新游戏和新生成数据为准。
- 不修改正常工作的物品、穿着、身体、情绪、感觉、目标、关系数值、RPG、世界数值、本质偏好和外观业务算法。
- 组织名称的自然语言完整度由提示词负责；代码只校验字段结构、操作权限和 `<组织>/<角色>` 一类格式，不维护名称词典或模糊词黑名单。
- 所有提示词先改 `.md`，再运行生成脚本同步 `.js` 与 `inference-prompts-runtime.js`。

### Task 1: 建立共享提示词源与新的类型化 JSON 合约

**Files:**
- Create: `publish/prompts/推演引擎/shared-character-card-update-policy.md`
- Create: `publish/prompts/推演引擎/stage5-intro-card-update.md`
- Modify: `publish/prompts/推演引擎/stage4-settlement-window.md`
- Modify: `publish/prompts/推演引擎/update/role-card-update-prompt.md`
- Modify: `publish/prompt-templates.js`
- Modify: `scripts/sync-inline-assets.js`
- Modify: `tests/stage4-role-card-completeness.test.js`
- Create: `tests/card-update-prompt-contract.test.js`
- Generate: matching prompt `.js` files and `publish/inference-prompts-runtime.js`

- [ ] **Step 1: 先写失败测试锁定提示词源和新合约**

在 `tests/card-update-prompt-contract.test.js` 中读取 Markdown 并断言：

```js
assert.match(shared, /有推演锚点.*必须.*完整补全/s);
assert.match(shared, /缺少具体名称.*不是没有依据/s);
assert.match(shared, /禁止模糊占位/);
assert.match(rolePrompt, /"field"/);
assert.match(rolePrompt, /"op"/);
assert.match(rolePrompt, /"target"/);
assert.doesNotMatch(rolePrompt, /change\.mode|upsert/);
assert.match(rolePrompt, /禁止整组替换/);
assert.match(introPrompt, /仅处理没有完整角色卡/);
assert.match(introPrompt, /social\.affection/);
assert.match(introPrompt, /"delta"/);
```

同时扩展 `tests/stage4-role-card-completeness.test.js`，要求 Stage4 支持 `certificates`、`titles`，并拒绝旧的 `角色字段/change.mode` 合约。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/card-update-prompt-contract.test.js tests/stage4-role-card-completeness.test.js`

Expected: FAIL，原因是共享 Markdown、新 Stage5 Markdown 和类型化合约尚不存在。

- [ ] **Step 3: 写共享总提示词**

把设计文档已确认的总规则写入 `shared-character-card-update-policy.md`，明确：

- 字段缺失、模糊、简写、归类错误或与完整上下文冲突时必须更新。
- “学生”“任职”“接受某类教育”“具备某类资格”等类别线索已经构成推演锚点；具体学校、年级、组织、部门或等级缺失时，要结合当前世界、时代、地区、年龄和人物经历补全。
- 只有连字段类别是否适用都没有任何事实、身份或背景线索时才允许为空。
- 四类身份集合逐项操作；技能、知识、职业仅新增；锁定字段与专项字段禁止通用修改。
- Stage4 处理角色卡，Stage5 只处理无角色卡人物；已有角色卡时由代码同步介绍卡。

- [ ] **Step 4: 定义 Stage4 类型化操作合约**

将 `role-card-update-prompt.md` 改为仅输出：

```json
{
  "ops": [
    {
      "subject": { "id": "角色ID", "name": "角色名" },
      "field": "memberships",
      "op": "replace",
      "target": { "orgName": "旧组织全称", "title": "旧具体身份" },
      "value": { "orgName": "新组织全称", "title": "新具体身份", "reason": "依据" },
      "reason": "正文或完整上下文中的具体依据"
    }
  ],
  "done": true
}
```

允许字段和操作必须逐项列明：稳定标量 `set`；`factions/memberships/certificates/titles` 使用 `add|replace|delete`；`skills/knowledge/professions` 只允许 `add`；`socialDrive.familiarity` 使用 `delta`；当前位置使用专用 `set`。

- [ ] **Step 5: 定义 Stage5 介绍卡操作合约**

`stage5-intro-card-update.md` 使用同样的平铺 `ops` 结构。稳定标量只允许 `set`；`social.affection` 和 `social.familiarity` 只允许非零 `delta`；`persona.preferences/persona.attraction/routine.tags/memory.facts` 使用逐项 `add|replace|delete`。

- [ ] **Step 6: 注册 Markdown 并生成 JavaScript**

在 `publish/prompt-templates.js` 注册共享规则和 Stage5 提示词；在 `syncInferencePromptRuntime()` 的文件列表加入生成脚本。运行：

Run: `node scripts/sync-inline-assets.js`

Expected: 生成两个新 `.js`，并更新 `publish/inference-prompts-runtime.js`；生成文件头含 `GENERATED FROM`。

- [ ] **Step 7: 运行测试并提交**

Run: `node --test tests/card-update-prompt-contract.test.js tests/stage4-role-card-completeness.test.js tests/character-profile-prompt-completeness.test.js`

Expected: PASS。

```powershell
git add publish/prompts/推演引擎/shared-character-card-update-policy.md publish/prompts/推演引擎/shared-character-card-update-policy.js publish/prompts/推演引擎/stage5-intro-card-update.md publish/prompts/推演引擎/stage5-intro-card-update.js publish/prompts/推演引擎/stage4-settlement-window.md publish/prompts/推演引擎/stage4-settlement-window.js publish/prompts/推演引擎/update/role-card-update-prompt.md publish/prompts/推演引擎/update/role-card-update-prompt.js publish/prompt-templates.js publish/inference-prompts-runtime.js scripts/sync-inline-assets.js tests/card-update-prompt-contract.test.js tests/stage4-role-card-completeness.test.js
git commit -m "feat(prompts): define typed card update contracts"
```

### Task 2: 用专用操作模块直接替换错误的角色卡更新路径

**Files:**
- Create: `publish/character-card-update-operations.js`
- Modify: `publish/real-world-agent-loop.js`
- Modify: `publish/update/generic-update-applier.js`
- Modify: `publish/real-world-actions.js`
- Modify: `publish/app/org-territory/settlement-actions.js`
- Modify: `publish/boot/scripts.json`
- Generate: `publish/boot/script-manifest.js`
- Create: `tests/character-card-update-operations.test.js`
- Modify: `tests/faction-membership-actions.test.js`
- Modify: `tests/real-world-loop-update.test.js`

- [ ] **Step 1: 写失败测试覆盖精确操作和禁止项**

测试至少覆盖：

1. membership `replace` 精确删除旧项并在同一索引写入新项，不调用 upsert。
2. `replace/delete` 找不到 target 时返回 rejected，不新增项目。
3. 四类集合不能整组 `set`。
4. `skills/knowledge/professions` 只接受 `add`，同名或归一化同名拒绝。
5. 新习得项通过 `progression.learned(name, type, level, linkedStats, desc)` 创建，`exp.current === 0`。
6. 锁定字段、RPG 字段、外观专项字段、物品与状态字段被拒绝。
7. 标量、议程、关系描述和 familiarity 增量按所有权更新。

- [ ] **Step 2: 运行测试并确认旧实现失败**

Run: `node --test tests/character-card-update-operations.test.js tests/faction-membership-actions.test.js tests/real-world-loop-update.test.js`

Expected: FAIL，membership 仍按 upsert，角色卡仍能走整组覆盖或通用路径。

- [ ] **Step 3: 实现角色卡类型化操作模块**

公开单一入口：

```js
window.GameModules.characterCardUpdateOperations = {
  normalize(raw) {},
  apply(store, raw) {},
  applyMany(store, ops) {},
  exactItemKey(field, item) {},
};
```

`apply()` 先按 subject 精确定位角色，再按字段白名单分发。每次只改一个标量或一个集合项，返回 `{ applied, rejected, reason, state }`。四类集合的 `replace/delete` 必须使用字段专属精确键；找不到 target 立即拒绝。

字段结构：

```js
factions: { faction, role, reason }
memberships: { orgName, title, department?, reason }
certificates: { orgName, field, level, reason }
titles: { orgName, field, title, reason }
```

代码只验证必填字符串和层级结构，不判断名称是否“像全称”。

- [ ] **Step 4: 正确创建仅新增习得项**

接受 AI 的 `{ name, desc, level, linkedStats, reason }`，将等级钳制到 `1..7`，调用现有 `progression.learned()` 创建项目。禁止接收 AI 经验值；禁止修改、删除或重复新增已有项。

- [ ] **Step 5: 从 Stage4 删除旧角色卡通用解析和旧合约**

在 `real-world-agent-loop.js` 中直接移除 `roleCardFieldPath()`、旧 `buildRoleCardSettlementUpdate()` 分支、旧 `change.mode` 示例与旧中文字段解析。`parseRoleCardJsonEntry()` 只接受 Task 1 的 `ops` 项，并完整支持证书、称号。

在 `generic-update-applier.js` 和 `real-world-actions.js` 中取消角色卡字段落入 `applyGeneric()` 的入口，统一调用 `characterCardUpdateOperations.applyMany()`。

- [ ] **Step 6: 直接修复 membership replace**

在 `settlement-actions.js` 中让组织结算的 membership 操作同样使用精确 `add|replace|delete`。删除“非 remove 一律 upsert”的错误分支；不存在 target 的 replace 不得变成 add。不要保留旧 mode 兼容。

- [ ] **Step 7: 登记运行时模块并生成 manifest**

把 `character-card-update-operations.js` 放在 `progression.js`、角色状态存储之后，`real-world-actions.js` 和 `real-world-agent-loop.js` 之前。

Run: `node dev/scripts/generate-script-manifest.cjs`

Expected: `scripts.json` 与 `script-manifest.js` 均包含新模块且顺序正确。

- [ ] **Step 8: 运行测试并提交**

Run: `node --test tests/character-card-update-operations.test.js tests/faction-membership-actions.test.js tests/real-world-loop-update.test.js tests/real-world-actions.test.js tests/real-world-settlement-actions.test.js`

Expected: PASS。

```powershell
git add publish/character-card-update-operations.js publish/real-world-agent-loop.js publish/update/generic-update-applier.js publish/real-world-actions.js publish/app/org-territory/settlement-actions.js publish/boot/scripts.json publish/boot/script-manifest.js tests/character-card-update-operations.test.js tests/faction-membership-actions.test.js tests/real-world-loop-update.test.js
git commit -m "fix(stage4): replace broken role card update path"
```

### Task 3: 统一当前位置结构和所有完整角色卡入口

**Files:**
- Modify: `publish/current-location-field.js`
- Modify: `publish/character-profile.js`
- Modify: `publish/character-profile-template-class.js`
- Modify: `publish/player-setup-defaults.js`
- Modify: `publish/player-setup-actions.js`
- Modify: `publish/player-setup-guard.js`
- Modify: `publish/player-identity-actions.js`
- Modify: `publish/prompts/character-profile-part1-base-identity.md`
- Modify: `publish/prompts/推演引擎/update/map-update-prompt.md`
- Generate: matching prompt `.js` files and `publish/inference-prompts-runtime.js`
- Modify: `tests/current-location-field.test.js`
- Modify: `tests/character-profile-current-location.test.js`
- Modify: relevant player setup tests discovered by `rg --files tests | rg "player-(setup|identity)"`

- [ ] **Step 1: 写失败测试锁定位置语义**

测试合法例：

```text
2026现代都市现实世界·中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601室卧室右侧床边
```

并断言解析结果能分别得到 `currentWorld`、`currentFaction`、动态 `hierarchyParts`、`mapNodeName` 与 `detailPosition`。缺少当前世界、势力、地图节点或详细位置时必须拒绝。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/current-location-field.test.js tests/character-profile-current-location.test.js`

Expected: FAIL，现有解析器仍使用旧的固定/不完整段语义。

- [ ] **Step 3: 更新单一位置解析器**

让 `current-location-field.js` 成为唯一结构判断入口：第一段是当前世界，第二段是当前势力，倒数第二段是地图地点，最后一段是详细位置，中间任意数量段为势力本地定义的层级链。至少四段；不硬编码省/市/区名称。

- [ ] **Step 4: 所有新角色入口使用同一规则**

账户激活、AI 完整角色卡生成、介绍卡升格和 Stage4 位置更新都调用同一解析/校验函数。`worldTag` 继续表示出生世界且不可改；`currentLocation` 的首段表示当前所在世界。

Stage4 应用位置成功后，同时更新 `profile.currentLocation`、日程位置和地图当前节点；失败时保留旧值并记录拒绝原因。

- [ ] **Step 5: 先修改 Markdown 再生成提示词**

在 Part1 和地图更新 Markdown 中写明动态层级、地图地点与详细位置的边界，再运行：

Run: `node scripts/sync-inline-assets.js`

- [ ] **Step 6: 运行位置与创建入口测试并提交**

Run: `node --test tests/current-location-field.test.js tests/character-profile-current-location.test.js tests/player-identity-actions.test.js tests/predefined-role-card-selection.test.js`

Expected: PASS。

```powershell
git add publish/current-location-field.js publish/character-profile.js publish/character-profile-template-class.js publish/player-setup-defaults.js publish/player-setup-actions.js publish/player-setup-guard.js publish/player-identity-actions.js publish/prompts/character-profile-part1-base-identity.md publish/prompts/character-profile-part1-base-identity.js publish/prompts/推演引擎/update/map-update-prompt.md publish/prompts/推演引擎/update/map-update-prompt.js publish/inference-prompts-runtime.js tests/current-location-field.test.js tests/character-profile-current-location.test.js tests/player-identity-actions.test.js
git commit -m "fix(profile): enforce current location structure"
```

### Task 4: 实现介绍卡类型化操作和双向确定性同步

**Files:**
- Create: `publish/character-intro-update-operations.js`
- Modify: `publish/character-intro-store.js`
- Modify: `publish/character-card-update-operations.js`
- Modify: `publish/boot/scripts.json`
- Generate: `publish/boot/script-manifest.js`
- Create: `tests/character-intro-update-operations.test.js`
- Create: `tests/character-card-intro-sync.test.js`
- Modify: `tests/character-intro-store.test.js`
- Modify: `tests/character-social-drive.test.js`

- [ ] **Step 1: 写失败测试覆盖介绍卡操作**

断言标量 `set`、好感/熟悉度 `delta` 并钳制 `0..100`、四类介绍卡集合精确增删改；非法技术字段、整组覆盖、零增量和找不到 target 的替换都应拒绝。

- [ ] **Step 2: 写失败测试覆盖双向同步**

断言：

- 角色卡 → 介绍卡同步姓名、出生世界、身份、年龄、性别、职业摘要、说明、性格、普通偏好、外貌摘要、关系、熟悉度、好感与议程。
- `identity.baseLocation` 只取完整位置中的地图节点，不复制房间/床边等详细位置。
- 介绍卡 → 角色卡升格同步好感、熟悉度、关系和议程；身份背景等只作为生成上下文，生成后按字段所有权校正。
- 联系时间、渠道、reach、cooldown、ID、links 和 meta 不被 AI 操作覆盖。

- [ ] **Step 3: 运行测试并确认失败**

Run: `node --test tests/character-intro-update-operations.test.js tests/character-card-intro-sync.test.js tests/character-intro-store.test.js tests/character-social-drive.test.js`

Expected: FAIL，新模块和确定性同步函数尚不存在。

- [ ] **Step 4: 实现介绍卡操作模块**

公开：

```js
window.GameModules.characterIntroUpdateOperations = {
  normalize(raw) {},
  apply(store, raw) {},
  applyMany(store, ops) {},
  syncRoleToIntro(roleState, introCard) {},
  syncIntroToRole(introCard, roleState) {},
};
```

保存时继续走 `characterIntroStore.normalize()` 和 `save()`；不要直接写底层存储。

- [ ] **Step 5: 在角色卡应用后接入角色 → 介绍卡同步**

`characterCardUpdateOperations.applyMany()` 完成一个角色的合法操作并保存角色状态后，如存在对应介绍卡，调用一次 `syncRoleToIntro()`。不调用 AI，不新增兼容字段。

- [ ] **Step 6: 登记模块、生成 manifest、运行测试并提交**

Run: `node dev/scripts/generate-script-manifest.cjs`

Run: `node --test tests/character-intro-update-operations.test.js tests/character-card-intro-sync.test.js tests/character-intro-store.test.js tests/character-social-drive.test.js`

Expected: PASS。

```powershell
git add publish/character-intro-update-operations.js publish/character-intro-store.js publish/character-card-update-operations.js publish/boot/scripts.json publish/boot/script-manifest.js tests/character-intro-update-operations.test.js tests/character-card-intro-sync.test.js tests/character-intro-store.test.js tests/character-social-drive.test.js
git commit -m "feat(intro): add typed updates and card synchronization"
```

### Task 5: 新增独立 Stage5 介绍卡更新阶段

**Files:**
- Create: `publish/inference/intro-card-stage-update.js`
- Modify: `publish/real-world-agent-loop.js`
- Modify: `publish/boot/scripts.json`
- Generate: `publish/boot/script-manifest.js`
- Create: `tests/intro-card-stage5-update.test.js`
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `tests/real-world-agent-history.test.js`

- [ ] **Step 1: 写失败测试锁定候选人与调用次数**

覆盖：

- 本轮出现、已加载资料且只有介绍卡的人物进入 Stage5 AI 请求。
- 已有完整角色卡的人物不进入 AI 候选，而是执行 `syncRoleToIntro()`。
- 无介绍卡或未参与本轮的人物不更新。
- 整个 Stage5 每回合最多一次 AI 请求；没有 AI 候选时零次请求但仍执行角色卡同步。
- Stage5 使用与正文前资料加载相同的 KV fork/session，不另造完整角色卡上下文请求。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/intro-card-stage5-update.test.js tests/real-world-loop-update.test.js tests/real-world-agent-history.test.js`

Expected: FAIL，因为独立 Stage5 尚未接入。

- [ ] **Step 3: 实现 Stage5 编排模块**

模块职责只包含：收集候选、序列化当前介绍卡、拼接共享规则和 Stage5 Markdown、调用一次 AI、解析 `ops`、调用 `characterIntroUpdateOperations.applyMany()`、记录 applied/rejected 行。

不要在此模块复制角色卡字段判断或同步算法。

- [ ] **Step 4: 在 Stage4 后插入 Stage5**

`real-world-agent-loop.js` 在 Stage4 所有现有结算保存后调用 `introCardStageUpdate.runAfterStage4(...)`，然后再进入原外观判断阶段。Stage5 错误应作为该阶段错误记录，不回滚已经完成的 Stage4，也不跳过后续阶段。

- [ ] **Step 5: 登记模块、生成 manifest、运行测试并提交**

Run: `node dev/scripts/generate-script-manifest.cjs`

Run: `node --test tests/intro-card-stage5-update.test.js tests/real-world-loop-update.test.js tests/real-world-agent-history.test.js tests/character-intro-update-operations.test.js`

Expected: PASS。

```powershell
git add publish/inference/intro-card-stage-update.js publish/real-world-agent-loop.js publish/boot/scripts.json publish/boot/script-manifest.js tests/intro-card-stage5-update.test.js tests/real-world-loop-update.test.js tests/real-world-agent-history.test.js
git commit -m "feat(inference): add intro card stage5"
```

### Task 6: 修复介绍卡升格同步并补齐外观后的回写

**Files:**
- Modify: `publish/solidify-actions.js`
- Modify: `publish/real-world-profile-stage5.js`
- Modify: `tests/presence-kind-solidify.test.js`
- Modify: `tests/character-card-intro-sync.test.js`
- Modify: relevant appearance orchestration tests discovered by `rg --files tests | rg "profile.*orchestration|appearance"`

- [ ] **Step 1: 写失败测试锁定升格与外观同步**

升格测试断言介绍卡的 `social.affection` 进入 `metrics.playerFeelings.好感`，熟悉度、关系说明和议程进入 `profile.socialDrive`。外观测试断言自然/盛装外观补丁应用后，同回合立即同步介绍卡摘要。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/presence-kind-solidify.test.js tests/character-card-intro-sync.test.js tests/wechat-album-profile-orchestration.test.js tests/wechat-album-body-profile-generator-orchestration.test.js`

Expected: FAIL，现有升格没有完整反向同步，外观阶段也未统一回写。

- [ ] **Step 3: 升格后调用同一同步函数**

完整角色卡生成成功并取得 live state 后，调用 `syncIntroToRole()`，随后保存角色状态并调用 `syncRoleToIntro()` 校正介绍卡。禁止在 solidify 模块再写一份字段映射。

- [ ] **Step 4: 外观补丁后立即同步**

原自然外观和盛装外观阶段每次成功保存角色状态后，调用 `syncRoleToIntro()`。只增加同步调用，不改外观判定和生成逻辑。

- [ ] **Step 5: 运行测试并提交**

Run: `node --test tests/presence-kind-solidify.test.js tests/character-card-intro-sync.test.js tests/wechat-album-profile-orchestration.test.js tests/wechat-album-body-profile-generator-orchestration.test.js`

Expected: PASS。

```powershell
git add publish/solidify-actions.js publish/real-world-profile-stage5.js tests/presence-kind-solidify.test.js tests/character-card-intro-sync.test.js tests/wechat-album-profile-orchestration.test.js tests/wechat-album-body-profile-generator-orchestration.test.js
git commit -m "fix(profile): synchronize intro cards after promotion and appearance"
```

### Task 7: 顺延 Stage6–12 的编号、状态与推理阶段

**Files:**
- Modify: `publish/real-world-agent-loop.js`
- Modify: `publish/real-world-profile-stage5.js`
- Modify: `publish/inference/faction-stage-update.js`
- Modify: `publish/real-world-map-fog.js`
- Modify: `publish/inference/life-energy-stage.js`
- Modify: `publish/inference/news-driver-stage-update.js`
- Modify: `publish/real-world-thinking-actions.js`
- Modify: `publish/prompt-templates.js`
- Modify: `publish/prompts/推演引擎/stage5-profile-gate.md`
- Modify: `publish/prompts/推演引擎/stage5-body-profile-patch.md`
- Modify: `publish/prompts/推演引擎/stage5-dressed-profile-patch.md`
- Modify: `publish/prompts/推演引擎/stage6-faction-update.md`
- Modify: `publish/prompts/推演引擎/update/map-update-prompt.md`
- Modify: `publish/prompts/推演引擎/stage10-life-energy-exp.md`
- Modify: `publish/prompts/推演引擎/stage11-world-news-update.md`
- Generate: corresponding `.js` files and `publish/inference-prompts-runtime.js`
- Modify: `tests/faction-stage-update.test.js`
- Modify: `tests/life-energy-exp.test.js`
- Modify: `tests/news-driver-stage11.test.js`
- Modify: `tests/real-world-thinking-actions.test.js`
- Modify: `tests/real-world-loop-update.test.js`

- [ ] **Step 1: 写失败测试锁定最终阶段序列**

期望序列：Stage4 角色卡与现有结算、Stage5 介绍卡、Stage6 外观门控、Stage7 自然外观、Stage8 盛装外观、Stage9 势力、Stage10 地图、Stage11 经验、Stage12 新闻。

同时断言 reasoning parser 接受 `stage10`、`stage11`、`stage12`，不再只解析单数字阶段。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/faction-stage-update.test.js tests/life-energy-exp.test.js tests/news-driver-stage11.test.js tests/real-world-thinking-actions.test.js tests/real-world-loop-update.test.js`

Expected: FAIL，旧阶段标签和单数字正则仍存在。

- [ ] **Step 3: 顺延代码标签但不重写业务逻辑**

仅更新 status 文案、sourceTitle、reasoningPhase 和调用顺序。将阶段正则改为可识别 `stage2` 至 `stage12` 的完整 token，例如：

```js
/\bstage(?:[2-9]|1[0-2])\b/iu
```

历史模块文件名和公开对象名可以保留，避免无关重命名；运行时语义和用户可见编号必须全部是新编号。

- [ ] **Step 4: 更新 Markdown 标题并重新生成**

先修改各阶段 `.md` 中的标题、前后依赖和输出说明，再运行：

Run: `node scripts/sync-inline-assets.js`

- [ ] **Step 5: 运行阶段测试并提交**

Run: `node --test tests/faction-stage-update.test.js tests/faction-prompt-alignment.test.js tests/life-energy-exp.test.js tests/news-driver-stage11.test.js tests/real-world-thinking-actions.test.js tests/real-world-loop-update.test.js`

Expected: PASS，新闻测试文件虽保留历史文件名，但断言 Stage12。

```powershell
git add publish/real-world-agent-loop.js publish/real-world-profile-stage5.js publish/inference/faction-stage-update.js publish/real-world-map-fog.js publish/inference/life-energy-stage.js publish/inference/news-driver-stage-update.js publish/real-world-thinking-actions.js publish/prompt-templates.js publish/prompts/推演引擎 publish/inference-prompts-runtime.js tests/faction-stage-update.test.js tests/life-energy-exp.test.js tests/news-driver-stage11.test.js tests/real-world-thinking-actions.test.js tests/real-world-loop-update.test.js
git commit -m "refactor(inference): insert intro stage and renumber settlement"
```

### Task 8: 完整回归与生成物一致性验收

**Files:**
- Verify only; fix only failures caused by Tasks 1–7

- [ ] **Step 1: 检查不应残留的旧实现**

Run:

```powershell
rg -n "roleCardFieldPath|buildRoleCardSettlementUpdate" publish/real-world-agent-loop.js publish/update/generic-update-applier.js
```

Expected: 无旧角色卡通用路径命中。membership 精确替换是否残留 upsert 由 `tests/faction-membership-actions.test.js` 和 `tests/character-card-update-operations.test.js` 验证，避免误伤势力结构、穿着或关系模块中仍属合法的 upsert。

- [ ] **Step 2: 检查 Markdown/JavaScript 生成一致性**

Run: `node scripts/sync-inline-assets.js`

Run: `git diff --exit-code -- publish/prompts publish/inference-prompts-runtime.js`

Expected: 第二次生成无差异，证明 Markdown 是唯一源且生成稳定。

- [ ] **Step 3: 运行本功能完整测试集**

Run:

```powershell
node --test tests/card-update-prompt-contract.test.js tests/stage4-role-card-completeness.test.js tests/character-card-update-operations.test.js tests/faction-membership-actions.test.js tests/current-location-field.test.js tests/character-profile-current-location.test.js tests/character-intro-update-operations.test.js tests/character-card-intro-sync.test.js tests/character-intro-store.test.js tests/character-social-drive.test.js tests/intro-card-stage5-update.test.js tests/presence-kind-solidify.test.js tests/real-world-loop-update.test.js tests/real-world-agent-history.test.js tests/faction-stage-update.test.js tests/faction-prompt-alignment.test.js tests/life-energy-exp.test.js tests/news-driver-stage11.test.js tests/real-world-thinking-actions.test.js
```

Expected: 全部 PASS。

- [ ] **Step 4: 运行运行时和共享回归**

Run: `npm run verify:required-runtime-syntax`

Run: `npm run verify:runtime-coverage`

Run: `npm run verify:runtime-deps`

Run: `npm run verify:shared`

Expected: 全部退出码 0。若失败，只修复本计划引入的失败；不顺带处理工作区既有无关改动。

- [ ] **Step 5: 检查最终差异边界并提交验证修正**

Run: `git status --short`

Run: `git diff --check`

Run: `git diff --stat`

确认没有修改 Android 镜像、密钥文件、预设存档或本计划外的业务模块。若验证阶段产生必要修正：

```powershell
git add <仅本计划产生的修正文件>
git commit -m "test(cards): verify update pipeline"
```

若没有额外修正，不创建空提交。
