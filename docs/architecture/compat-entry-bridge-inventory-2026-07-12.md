# Compat Entry Bridge Inventory (2026-07-12)

## 目的

记录 `publish/game.js` 中已经从“静态空壳 fallback”收口为“优先桥接正式模块实现，缺失时再兜底”的兼容入口。

这份清单的目标不是宣布旧入口已经可以删除，而是帮助后续协作者判断：

1. 哪些入口已经开始具备“兼容 facade”特征
2. 哪些模块的正式实现已经回收到 `actions` / `domain` / `ui helpers`
3. 下一步哪些入口适合继续桥接
4. 什么时候才适合进入旧代码清理审计

## 当前已收口入口

### 1. taobao

- `selectedTaobaoSlot()` -> `gm.taobaoActions.selectedTaobaoSlot`
- `taobaoFilteredSlots()` -> `gm.taobaoActions.taobaoFilteredSlots`
- `taobaoProductDetail(product = null)` -> `gm.taobaoActions.taobaoProductDetail`
- `taobaoSetItems(product = null)` -> `gm.taobaoActions.taobaoSetItems`
- `taobaoWalletRows()` -> `gm.taobaoActions.taobaoWalletRows`
- `taobaoFilterLabel(slot = this.taobaoState?.filterSlot)` -> `gm.taobaoActions.taobaoFilterLabel`
- `taobaoWearFilters()` -> `gm.taobaoActions.taobaoWearFilters`

特点：
- 模板直接消费 `$store.game.taobao...`
- 正式实现已在 `publish/taobao-actions.js`、`publish/domain/taobao/filter-helpers.js`、`publish/ui/taobao/view-helpers.js`
- 当前仍保留兜底返回值，避免模块缺失时直接抛错

### 2. calendar

- `calendarMonthTitle()` -> `gm.calendarActions.calendarMonthTitle`
- `calendarDays()` -> `gm.calendarActions.calendarDays`

特点：
- 纯视图/派生入口
- 正式实现已在 `publish/calendar-actions.js` / `ui.calendar.viewHelpers`
- 是低风险桥接样板

### 3. skills

- `skillCategories()` -> `gm.skillsActions.skillCategories`
- `skillsList()` -> `gm.skillsActions.skillsList`
- `selectedSkill()` -> `gm.skillsActions.selectedSkill`

特点：
- 只读查询入口
- 模板直接消费
- 正式实现已在 `publish/skills-actions.js`

### 4. prompt

- `promptCategoryLabel()` -> `gm.promptActions.promptCategoryLabel`
- `promptCategories()` -> `gm.promptActions.promptCategories`
- `promptList()` -> `gm.promptActions.promptList`
- `currentPromptItem()` -> `gm.promptActions.currentPromptItem`

特点：
- 只读展示/派生入口
- 模板直接消费
- 正式实现已在 `publish/prompt-actions.js`

### 5. boss（只读展示子集）

- `currentBossJobs()` -> `gm.bossActions.currentBossJobs`
- `selectedBossJob()` -> `gm.bossActions.selectedBossJob`
- `selectedBossCompanyJob()` -> `gm.bossActions.selectedBossCompanyJob`
- `bossOptions(key)` -> `gm.bossActions.bossOptions`
- `bossCompanyFields(job = this.selectedBossCompanyJob?.())` -> `gm.bossActions.bossCompanyFields`
- `bossApplyHint(job = this.selectedBossCompanyJob?.())` -> `gm.bossActions.bossApplyHint`
- `bossJobPayText(job)` -> `gm.bossActions.bossJobPayText`
- `bossMatchText(job, key)` -> `gm.bossActions.bossMatchText`

特点：
- 当前只处理只读查询 / 展示面
- 没有触碰生成、申请、预约等高副作用动作
- 适合作为复杂模块渐进收口样板

## 当前尚未进入清理候选的原因

虽然上述入口已经开始表现为 compat facade，但当前仍不能直接删除，原因包括：

1. `publish/index.html` 仍直接消费 `$store.game` 上的这些名字
2. Android 资产镜像中的 `index.html` 仍消费同名 contract
3. 这些入口仍承担“模块缺失时的兜底返回值”职责
4. 部分复杂模块仍有内部调用链通过这些同名入口间接协作

因此，当前阶段的结论应是：

- 已收口，不等于可删除
- 已桥接，不等于模板已迁移
- 已具备 compat facade 特征，但仍需继续做调用审计与迁移准备

## 下一步建议

### 1. 继续优先处理同类低风险入口

推荐优先顺序：

1. `bossAppointmentChoices()` 等仍偏只读/派生的边缘入口
2. 其他模板直接消费、且正式实现已存在的查询型入口
3. 最后才进入生成、提交、状态切换类动作

### 2. 为旧代码清理准备门槛

在真正删除 `publish/game.js` 上的 compat 入口前，至少应补齐：

1. 模板消费迁移审计
2. Android 镜像 contract 一致性确认
3. 复杂模块内部调用链确认
4. fallback 是否仍承担安全兜底职责的判断

### 3. 后续可以形成的配套文档

- compat 入口调用迁移清单
- compat 入口删除 gate 清单
- game.js 残余厚入口优先级表

## 当前阶段结论

`publish/game.js` 正在从“历史逻辑堆积点”逐步转向“兼容 facade 层”。

这条路线当前已经在轻量模块和中等复杂模块上得到验证，说明后续继续推进的重点应该是：

1. 保持模板 contract 稳定
2. 保持玩法和行为不变
3. 继续把真实实现留在模块侧
4. 等 bridge 覆盖度与调用审计足够后，再进入旧代码清理阶段