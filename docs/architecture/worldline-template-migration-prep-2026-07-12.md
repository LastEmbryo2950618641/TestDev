# Worldline Template Migration Prep (2026-07-12)

## 目的

这份清单专门用于整理 `publish/index.html` 中 worldline 相关模板调用的迁移准备顺序。

目标不是立即改模板，而是回答：

- 当前模板里哪些 worldline 调用还停留在细粒度 compat 消费模式
- 哪些地方已经具备更稳定的 panel view 消费模式
- 如果未来选择 worldline 作为首个 compat 迁移试点，应先迁哪些模板调用

## 审计范围

本轮重点关注 `publish/index.html` 中 worldline 相关调用。

已确认的关键调用点包括：

- `timelineItems(lore)`
- `timelineMeta(item)`
- `loreTimelinePanelView(lore)`
- `realWorldTimelinePanelView()`

## 当前模板中的两类消费模式

### 模式 A：细粒度 helper 直接消费

当前模板中仍有部分区域直接调用：

- `timelineItems(lore)`
- `timelineMeta(item)`

特点：

- 模板自行拼装 timeline item 的展示结构
- 模板需要知道 item 的更多细节字段
- 这会让模板与 compat 入口耦合更深

### 模式 B：panel view 聚合消费

当前模板中已有部分区域使用：

- `loreTimelinePanelView(lore)`
- `realWorldTimelinePanelView()`

特点：

- 模板更多消费整块 view 对象
- helper 层负责组装 rows / title / timeRange / emptyText
- 与我们当前的结构收口方向更一致

## 当前迁移成熟度判断

worldline 当前已经出现了“更成熟的模板消费模式”，这意味着它是最适合作为 compat 迁移试点的模块。

原因：

1. helper 分层已经较完整
2. 模板中已经存在 panel-view 风格消费样板
3. 可以先做模板消费方式统一，再考虑 compat 删除

## 迁移优先级建议

### 第一优先：收敛 lore 世界线区域的细粒度调用

当前 lore 世界线区域仍存在：

- `timelineItems(lore)`
- `timelineMeta(item)`

这是第一批最值得迁移的目标，因为：

- 这些调用已经有 `loreTimelinePanelView(lore)` 对应的更高层聚合对象
- 若后续继续扩展 `timelinePanelViewHelpers`，模板可逐步减少对细粒度 helper 的直接依赖
- 这类迁移不涉及写入状态，只影响展示消费方式

### 第二优先：审视现实世界 timeline 区域中仍保留的直接读取

现实世界区域虽然已经使用：

- `realWorldTimelinePanelView()`

但它仍混有一些对 `realWorldline()`、`realWorldRecordingEvents()` 等路径的直接读取。

这些不一定马上要迁，但后续需要判断：

- 哪些应继续留在页面层
- 哪些应进一步收进 panel / plot 相关 helper

### 第三优先：最后再考虑 compat facade 清理

只有在模板消费面已经明显收敛后，才有资格讨论：

- 是否减少对 `worldline.viewHelpers.*` 的直接依赖
- 是否可以逐步收缩 compat 聚合入口

## 当前不建议做的事

### 1. 不要直接删 worldline compat

当前模板里仍然存在活跃的 compat 消费点，尤其是细粒度 helper 调用。

### 2. 不要同时改模板消费方式和 domain 层边界

模板迁移应聚焦于“消费方式收敛”，不应和 domain 层拆分混做。

### 3. 不要把界面选择状态写入点混入这轮迁移

`selectRealWorldPlot()` 仍属于最小界面状态写入点，不属于当前模板消费迁移的第一优先级。

## 下一阶段建议动作

### 动作 A：补 worldline 模板消费迁移计划

建议下一步专门形成一份计划，回答：

- lore 世界线区域哪些细粒度调用可合并进 `loreTimelinePanelView`
- 模板需要消费的最终 rows / meta / empty state 是否已足够稳定
- 改完后要做哪些最小回归验证

### 动作 B：先迁 lore 世界线，再看现实世界区域

推荐顺序：

1. lore 世界线模板
2. 现实世界 timeline 模板
3. compat facade 清理评估

## 当前阶段结论

worldline 现在已经不只是“结构成熟”，而是已经进入：

- 可以准备模板消费迁移
- 但还不适合直接删 compat

它是当前所有模块里，最接近“未来首个 compat 迁移试点”的模块。
