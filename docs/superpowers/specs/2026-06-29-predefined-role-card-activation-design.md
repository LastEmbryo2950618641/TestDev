# 已有账号预定义角色卡激活设计

## 背景

默认账号激活手机时，需要直接使用 `/publish/predefined-role-cards` 中的四张角色卡：刘悠作为玩家卡，刘思瑶、刘思琪、刘思怡作为关系角色卡。该路径必须允许玩家在确认页查看并调整角色卡详情字段，同时在最终激活时不触发玩家 AI 补全、角色卡 AI 生成或 AI 修复。

## 目标

- 点击“已有账号”后进入确认/详情页，而不是自动激活。
- 默认选中刘悠作为玩家卡。
- 默认选中刘思瑶、刘思琪、刘思怡作为关系角色卡。
- 玩家在确认页点击详情后可以调整角色卡字段。
- 点击“激活”后直接保存这四张卡，且保存编辑后的字段。
- 预定义路径不调用 AI 补全或角色生成。
- 新账号等非预定义路径保持现有 AI 补全行为。

## 非目标

- 不新增多卡组 preset 系统。
- 不改变角色卡 JSON 文件格式。
- 不重做确认页 UI，只复用现有详情编辑能力。
- 不移除新账号路径的 AI 补全能力。

## 方案

采用现有 `roleCardSetup` 与 `predefinedRoleCards` 流程，强化“已有账号 = 四张预定义卡”的默认行为。

### 已有账号入口

`chooseExistingAccountSetup()` 保持当前交互：玩家点击“已有账号”后，系统读取默认资料并展示确认/详情页。

该入口需要确保：

1. 初始化 `/publish/predefined-role-cards` 的四张卡。
2. 设置 `roleCardSetup.usePredefinedPlayerCard = true`。
3. 设置 `roleCardSetup.selectedPlayerName = '刘悠'`。
4. 设置 `roleCardSetup.selectedRelationNames = ['刘思瑶', '刘思琪', '刘思怡']`。
5. 为三张关系卡同步默认关系角色。
6. 调用现有同步方法，把玩家卡和关系卡写入 `playerProfile` 展示态。
7. 设置 `phoneActivationChoice = 'existing'`，等待玩家点击“激活”。

### 详情编辑

继续使用 `role-card-editor.js` 中的编辑能力：

- 简单字段通过 `setRoleCardField()` 修改。
- 结构化字段通过 `setRoleCardLeafValue()` 修改。
- 角色初始数值通过现有 metric 编辑逻辑维护。
- 玩家卡修改后同步到 `playerProfile`。
- 关系卡修改后保留在 `roleCardSetup.cards` 中，最终激活保存编辑后的对象。

### 激活保存

`completePlayerSetup()` 由 `player-setup-guard.js` 判定：

- 当 `roleCardSetup.usePredefinedPlayerCard = true` 时，进入 `completePredefinedPlayerSetup()`。
- 当该标记为 false 时，保持原有新账号 AI 补全路径。

`completePredefinedPlayerSetup()` 的职责限定为：

1. 同步关系文本。
2. 标准化玩家基础资料。
3. 同步玩家资料词条。
4. 调用 `predefinedRoleCards.saveSelectedRoleCardStates()` 保存玩家卡和三张关系卡。
5. 同步已知职业。
6. 保存存档。

该路径不得调用：

- `enrichPlayerProfile()`。
- `ensurePlayerRpgState()`。
- `characterProfile.ensureInitialMetricSources()`。
- 任意角色卡 AI 生成或修复 prompt。

### 预定义卡保存

`predefinedRoleCards.saveSelectedRoleCardStates()` 继续作为统一保存入口：

- 玩家卡通过 `ensurePlayerState()` 保存为 `player-self`。
- 关系卡通过 `saveSelectedRelationshipStates()` 保存。
- 保存来源优先使用 `store.roleCardSetup.cards`，因此确认页编辑结果会被保存。
- 保存过程复用 `rpgState.createCharacterState()` 与 `rpgProfileMetrics.rebase()`，只做本地状态构建，不请求 AI。

## 数据流

1. 玩家点击“已有账号”。
2. `chooseExistingAccountSetup()` 读取默认资料，加载四张预定义卡。
3. 系统进入已有账号确认页，展示玩家资料与角色卡详情。
4. 玩家可编辑详情字段，修改落在 `roleCardSetup.cards`。
5. 玩家点击“激活”。
6. `completePlayerSetup()` 被 guard 转发到 `completePredefinedPlayerSetup()`。
7. `saveSelectedRoleCardStates()` 保存刘悠、刘思瑶、刘思琪、刘思怡四张卡。
8. 存档完成，手机激活结束。

## 错误处理

- 预定义卡脚本缺失时，保留现有 `console.warn`，并让确认页显示已有错误信息。
- 默认资料缺少姓名或生日时，继续阻止激活。
- 角色卡保存失败时，`completePredefinedPlayerSetup()` 捕获错误并写入 `setupError`。
- 如果 SQLite 尚未初始化，`createState()` 返回 null，调用方只保存可用状态，不触发 AI 兜底。

## 测试计划

- 覆盖已有账号点击后默认选择刘悠与三张关系卡。
- 覆盖确认页编辑后的 `roleCardSetup.cards` 会被保存。
- 覆盖预定义激活路径不调用 `enrichPlayerProfile()`、`ensurePlayerRpgState()` 或角色卡 AI 修复。
- 覆盖非预定义新账号路径仍调用原 AI 补全链路。
- 覆盖保存结果包含 `player-self`、刘思瑶、刘思琪、刘思怡四个角色状态。

## 原则应用

- KISS：复用现有 `roleCardSetup`、`predefinedRoleCards`、`role-card-editor`，不新增抽象层。
- YAGNI：只实现当前四张卡固定加载，不设计未来多卡组。
- DRY：保存逻辑集中在 `saveSelectedRoleCardStates()`。
- SOLID：账号入口、详情编辑、激活保存各自承担单一职责。
