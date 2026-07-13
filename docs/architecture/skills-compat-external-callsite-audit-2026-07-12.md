# Skills Compat External Callsite Audit (2026-07-12)

## 目的

补齐 `skills` 模块在模板之外的调用面审计，作为它进入“首批真实 compat 删除候选评估”前的重要证据。

这份文档主要回答：

- `skills` 相关入口除了 Web / Android 模板外，还有哪些活跃依赖
- 哪些属于模块内部状态协作
- 哪些已经属于模板外公开能力
- 这些事实如何影响 `skills` 的 compat 删除候选评估

## 本轮审计范围

聚焦以下入口与状态：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`
- `openSkillDetail(id)`
- `closeSkillDetail()`
- `skillsState.detailOpen`
- `skillsState.selectedSkillId`

## 审计结果

### 1. 模板主消费面

Web 与 Android 镜像模板当前仍直接消费：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`
- `openSkillDetail(id)`
- `closeSkillDetail()`
- `skillsState.detailOpen`

位置：

- `publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`

结论：
- `skills` 目前仍明显依赖 `$store.game.skills...` 与 `skillsState` 的组合公开面
- 与 `calendar` 不同，它还没有收敛到 `view contract + 少量动作入口` 的形态

### 2. 模块内部状态协作面

以下状态与方法当前主要在 `publish/skills-actions.js` / `publish/skills-app.js` 内部协作：

- `skillsState.detailOpen`
- `skillsState.selectedSkillId`
- `openSkillDetail(id)`
- `closeSkillDetail()`
- `selectedSkill()`

结论：
- `skills` 的详情弹层交互仍直接依赖状态字段
- 这类状态协作在未来若要推进 compat 删除，需要先判断模板是否继续直接读这些字段

### 3. 模板外公开能力面

本轮确认的模板外能力说明调用主要包括：

- `publish/skills-definitions-core.js` 中对以下能力的公开说明：
  - `skillsList()`
  - `skillCategories()`

结论：
- `skills` 的只读查询能力已经不仅是模板私用方法
- 它们也被作为对 AI / 系统可见的公开能力记录
- 删除、改名或迁移时需要同步考虑说明层一致性

### 4. 当前未见的更复杂跨模块运行时调用

与 `calendar` 相比，本轮没有发现类似：

- 其他业务模块在运行时主动调用 `skillsList()` / `selectedSkill()` 来驱动业务结果

结论：
- `skills` 的模板外运行时耦合当前明显轻于 `calendar`
- 这进一步支持它比 `calendar` 更适合作为“首批真实 compat 删除候选评估”的对象

## 对 compat 删除候选评估的影响

基于本轮审计，`skills` 具备两个有利条件：

1. 模板外运行时调用面相对窄
2. 主要额外公开面集中在能力说明层，而不是复杂业务模块协作链

但它仍有两个关键限制：

1. 模板仍直接依赖：
   - `skillCategories()`
   - `skillsList()`
   - `selectedSkill()`
   - `openSkillDetail()`
   - `closeSkillDetail()`
   - `skillsState.detailOpen`
2. 详情弹层状态仍直接绑定在 `$store.game.skillsState`

因此：

- `skills` 现在已经比 `calendar` 更像“可继续推进局部 compat 删除评估”的模块
- 但前提是先处理模板读取面与状态动作面的分层问题

## 当前阶段结论

`skills` 的模板外调用面已经足够轻量，说明它更适合作为：

- 首批真实 compat 删除候选评估模块

但这并不代表当前已经可以直接删除 compat。它仍需要继续补齐：

1. 长期定位判断
2. 动作面与只读面拆分策略
3. 删除前最小验证方案

只有这些补齐后，`skills` 才可能真正进入“局部 compat 删除评估”的下一阶段。