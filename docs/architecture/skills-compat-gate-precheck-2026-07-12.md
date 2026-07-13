# Skills Compat Gate Precheck (2026-07-12)

## 目的

对 `skills` 模块进行第二轮“小模块 compat 删除 gate 候选预审”，用来和 `calendar` 形成对照：

- 为什么 `skills` 比 `calendar` 更适合继续做迁移准备，而不是优先进入删除阶段
- `skills` 当前距离真正进入 compat 删除候选，还差哪些证据

## 预审对象

当前重点观察的 skills 相关公开面包括：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`
- `openSkillDetail(id)`
- `closeSkillDetail()`

## 已确认的积极信号

### 1. 只读查询面已经完成桥接收口

`publish/game.js` 上以下入口已经收口为薄桥接层：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`

这说明：

- `skills` 的只读查询能力已经较明确地下沉到 `gm.skillsActions`
- `game.js` 在这条线上已经表现出 compat facade 特征

### 2. 模板消费区域集中

Web 与 Android 镜像模板对 `skills` 的消费主要集中在同一块区域：

1. 分类筛选
2. skills 列表
3. 点击打开详情
4. 详情弹层展示
5. 关闭详情

这意味着：

- 若未来要做模板迁移，改动区块相对集中
- 比起分散在多个子面板中的复杂模块，更适合做样板

### 3. Web / Android 镜像消费方式一致

`publish/index.html` 与 Android 镜像 `index.html` 对 `skills` 的消费方式是对齐的。

因此：

- 后续若做迁移验证，消费面边界较清晰
- 多端同步成本相对可控

## 当前仍不满足删除 gate 的原因

### 1. 模板仍直接依赖多项 `$store.game.skills...` 公开面

当前模板仍直接使用：

- `$store.game.skillCategories()`
- `$store.game.skillsList()`
- `$store.game.selectedSkill()`
- `$store.game.openSkillDetail(id)`
- `$store.game.closeSkillDetail()`

因此：

- `skills` 还没有像 `calendar` 那样收敛到“对象化 view contract + 少量动作入口”
- 模板仍重度绑定在 `$store.game.skills...` 这组 contract 上

### 2. 详情开关动作仍直接暴露在模板公开面

虽然 `openSkillDetail(id)` / `closeSkillDetail()` 风险不高，但它们当前仍是：

- 活跃模板动作入口
- 与 `skillsState.selectedSkillId` / `detailOpen` 直接相连的状态写入面

因此：

- `skills` 当前不只是“只读 contract 问题”
- 还涉及轻交互状态动作的迁移准备

### 3. `game.js` 上的只读 compat 仍承担兜底职责

当前 `publish/game.js` 上：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`

仍保留 fallback 兜底。

在没有明确这些兜底能否撤除前，不能进入删除阶段。

## 与 calendar 的对照结论

与 `calendar` 相比，`skills` 当前有两个明显差异：

1. `calendar` 模板主显示面已经较集中到 `calendarPanelView()`
2. `skills` 模板仍直接散布消费多个只读入口和动作入口

因此：

- `calendar` 更像“接近收口完成态的预审对照组”
- `skills` 更像“适合继续做模板迁移准备样板，但尚未接近删除 gate”的预审对照组

## 当前预审结论

`skills` 是适合继续做模板迁移准备的轻量模块，但当前还不适合作为第一批真正进入 compat 删除评估的模块。

更准确地说：

- 它比 `boss`、`taobao` 更轻
- 它比 `calendar` 更不接近“收口完成态”
- 它当前最适合承担“迁移样板模块”角色，而不是“首批删除候选模块”角色

## 若要继续推进 skills 的删除 gate，下一步应补什么

### 1. 明确是否要为 skills 定义新的模块模板公开面

需要先决定：

- 未来是否继续保留 `$store.game.skills...`
- 还是改为新的模块公开结构

### 2. 先分离只读查询面与轻交互动作面

至少应先把两类问题分开：

- 只读查询：`skillCategories()` / `skillsList()` / `selectedSkill()`
- 动作交互：`openSkillDetail()` / `closeSkillDetail()`

### 3. 判断 `skillsState` 是否仍应被模板直接依赖

目前模板还依赖：

- `skillsState.detailOpen`

若未来要进一步削弱 `$store.game` 模板绑定，需要先判断这类状态是否也应经过更稳定的显示 contract。

## 当前阶段判断

`skills` 不是当前最优先的 compat 删除试点，但它是非常适合继续扩展迁移样板方法的模块。

因此，当前最合理的定位是：

- 迁移准备样板模块
- 非首批删除候选模块

## 当前结论

在当前证据下，`skills` 应继续被视为：

1. 适合做模板迁移准备演练
2. 还不适合进入真正的 compat 删除 gate
3. 下一步更适合继续补迁移边界，而不是直接推进 compat 清理