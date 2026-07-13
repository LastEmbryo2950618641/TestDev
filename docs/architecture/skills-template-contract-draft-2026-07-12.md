# Skills Template Contract Draft (2026-07-12)

## 目的

在 `skills` 已被确认是当前第一优先 compat 删除候选评估对象的前提下，先补一份模板公开 contract 草案。

这份草案不代表立即改代码，只用于回答：

- 如果未来继续压缩 `publish/game.js` 上的 `skills` compat 入口
- 模板到底应该读取什么
- 动作层应该暴露什么
- 哪些原始 `skillsState` 字段不应继续直接散落在模板里

## 当前模板实际消费面

根据当前 Web 与 Android 镜像模板核对，`skills` 模块的消费面完全对齐，主要分成三类。

### 1. APP 显隐层

当前模板直接依赖：

- `$store.game.skillsState?.open`
- `$store.game.openSkillsApp()`
- `$store.game.closeSkillsApp()`

说明：

- 模板当前直接以原始 state 的 `open` 字段决定 Skills APP 是否显示
- 这意味着 APP 开关还没有被收敛成更稳定的显示 contract

### 2. 列表筛选层

当前模板直接依赖：

- `$store.game.skillsState.query`
- `$store.game.skillsState.category`
- `$store.game.skillCategories()`
- `$store.game.skillsList()`

说明：

- 模板当前直接写入 `query` 与 `category`
- 模块方法只负责返回分类与过滤结果
- 因此当前结构是“模板直接持有筛选输入，模块方法返回派生列表”

### 3. 详情弹层层

当前模板直接依赖：

- `$store.game.skillsState?.detailOpen`
- `$store.game.openSkillDetail(skill.id)`
- `$store.game.closeSkillDetail()`
- `$store.game.selectedSkill()`

并直接读取 `selectedSkill()` 返回对象的字段：

- `category`
- `name`
- `description`
- `method`
- `params`
- `returns`
- `detail`

说明：

- 当前详情显隐直接由原始 state 字段驱动
- 当前详情内容由 `selectedSkill()` 提供
- 这已经体现出“显示状态”和“详情数据”是两组不同 contract，但现在仍混在一起暴露

## 当前结构的关键判断

### 1. 现在还不能只删函数入口

因为模板除了依赖：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`
- `openSkillDetail()`
- `closeSkillDetail()`

还直接依赖：

- `skillsState.open`
- `skillsState.query`
- `skillsState.category`
- `skillsState.detailOpen`

所以未来如果要做真实迁移，不能只迁方法名，必须一起处理状态读取 contract。

### 2. Web / Android 双端同步成本可控

当前两端 Skills 模板片段几乎镜像一致，说明：

- 迁移工作量虽不是零
- 但消费面集中、结构对齐
- 适合做成一份可复制的模块模板迁移样板

### 3. skills 比 calendar 更适合做“contract 收紧试点”

与 `calendar` 相比：

- `calendar` 已更接近高成熟度稳定 facade
- `skills` 仍保留明显的原始 state 直连特征
- 因而 `skills` 更适合继续推进到“模板 contract 收紧”这一步

## 推荐的长期 contract 方向

当前最推荐的不是立刻删除 `$store.game.skills...`，而是先把它收敛为更稳定的模板公开面。

推荐拆成三层。

### 第一层：APP 显示 contract

建议未来模板优先读取统一的显示 helper，而不是直接读 `skillsState.open`。

候选形式例如：

- `skillsAppView().open`
- 或 `isSkillsAppOpen()`

目标：

- 让模板不再直接知道原始 state 字段名
- 后续若内部状态组织变化，不需要立刻改模板

### 第二层：列表展示 contract

建议未来模板读取统一的列表 view 对象，例如：

- `skillsPanelView()`

候选字段例如：

- `query`
- `category`
- `categories`
- `items`
- `empty`

目标：

- 把 `skillCategories()` 与 `skillsList()` 收束成一个只读展示面
- 未来即使列表过滤逻辑变化，模板读取方式仍稳定

### 第三层：详情展示 contract

建议未来模板读取统一的详情 view 对象，例如：

- `selectedSkillDetailView()`
- 或把详情一起放进 `skillsPanelView()`

候选字段例如：

- `detailOpen`
- `item`
- `item.category`
- `item.name`
- `item.description`
- `item.method`
- `item.params`
- `item.returns`
- `item.detail`

目标：

- 让模板不再一遍遍调用 `selectedSkill()`
- 让显隐与详情数据集中在同一层读取

## 推荐的动作 contract

动作层建议尽量保持少而稳定。

### 建议保留的动作

- `openSkillsApp()`
- `closeSkillsApp()`
- `openSkillDetail(id)`
- `closeSkillDetail()`

原因：

- 这些动作语义清楚
- 与模板交互关系直观
- 即使未来内部状态重组，也适合继续保留一段时间作为稳定 facade

### 建议新增但可后置的动作

如果未来不希望模板继续直接写原始筛选字段，可后续考虑新增：

- `setSkillsQuery(value)`
- `selectSkillCategory(value)`

原因：

- 这样可以把 `query` 与 `category` 的写入也从模板中收走
- 但这一步属于第二阶段收紧，不必在第一轮就一起做完

## 推荐的迁移分批顺序

### 第 1 批：只读展示面收束

优先整理：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`

目标：

- 先定义一个稳定的 `skillsPanelView()` 或同类 view helper
- 暂时不强求模板立刻停止使用原始状态写入

### 第 2 批：详情显隐收束

再处理：

- `skillsState.detailOpen`
- 详情对象字段读取

目标：

- 让详情弹层不再直接依赖原始 state 字段
- 让详情模板从重复调用 `selectedSkill()` 迁到读取统一 view

### 第 3 批：筛选写入动作收束

最后处理：

- `skillsState.query`
- `skillsState.category`

目标：

- 把输入写入也从模板里收回动作层
- 使模板尽量只读 view contract、触发显式动作

## 当前最稳的策略结论

对 `skills` 来说，当前最稳的策略不是：

- 直接删除 `publish/game.js` 上的 compat 入口

而是：

1. 先承认现状是“函数入口 + 原始 state 直连”的混合 contract
2. 先定义新的模板公开 contract 草案
3. 先做 view 读取面的集中化
4. 再分批决定哪些原始 state 读取可以退出模板
5. 最后才进入真实 compat 删除评估

## 当前阶段结论

`skills` 已经具备成为“第一批 contract 收紧试点模块”的条件，但它的关键不在于马上删掉几个方法，而在于先把模板真实依赖的状态面与展示面一起收口。

更准确地说：

- 现在的主要问题不是函数数量略多
- 而是模板同时依赖函数 contract 和原始 state contract
- 因此真正低风险的推进顺序，必须是“先定义 view contract，再逐步退出原始 state 直连”
