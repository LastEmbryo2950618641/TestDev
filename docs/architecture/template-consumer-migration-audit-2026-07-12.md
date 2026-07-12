# Template Consumer Migration Audit (2026-07-12)

## 目的

这份审计记录当前展示层“模板消费收敛”阶段已经落地的真实迁移结果。

它服务于两个后续目标：

- 为 compat 清理提供更细粒度的前置证据
- 为继续推进 Web / Windows / Android 共用展示 contract 提供现状基线

本文档不宣布 compat 可删除。

它回答的是：

- 哪些模板片段已经从“直接读底层结构/老 helper”迁到“消费 view contract”
- 哪些模块已经出现稳定的 panel view / section view 模式
- 哪些路径虽然更成熟了，但仍然保留 compat 依赖，不能提前清旧代码

## 审计范围

本轮重点记录以下源码范围：

- `publish/index.html`
- `publish/ui/event/*`
- `publish/ui/worldline/*`
- `publish/ui/company/*`

说明：

- 只以当前工作树中的源码为准
- 宿主镜像仍可能滞后，不在本文中重复展开
- 宿主/产物依赖证据仍以 `compat-callsite-audit-2026-07-12.md` 为准

## event 模块当前迁移结果

### 已完成的模板消费收敛

以下片段已经改为优先消费显式 view contract：

- 事件卡片顶层
  - `publish/index.html`
  - 当前由 `eventPanelView()` 在 `event-card` 容器级提供共享 `view`
  - header 与 tabs 不再各自重复取同一份 panel view

- 事件列表区域
  - `publish/index.html`
  - 当前消费 `eventListView()` 提供的：
    - `events`
    - `emptyText`
  - 模板不再直接调用：
    - `currentEventList()`
    - `eventName(event)`
    - `eventMeta(event)`

- 事件详情区域
  - `publish/index.html`
  - 当前消费 `selectedEventDetailView()` 提供的统一 contract：
    - `hasEvent`
    - `emptyText`
    - `title`
    - `meta`
    - `content`
    - `tags`
    - `hasTags`
    - `statusFieldLabel`
    - `statusLabel`
    - `showTriggeredCount`
    - `triggeredCountFieldLabel`
    - `triggeredCountText`
  - 模板不再直接依赖 `selectedEventEmptyText()` 做空态判断

### 当前形成的 helper 模式

event 已形成较清晰的三层模式：

- 基础查询/兼容入口：`publish/ui/event/view-helpers.js`
- 标签/文案层：`publish/ui/event/label-view-helpers.js`
- 面板展示层：`publish/ui/event/panel-view-helpers.js`

这说明：

- event 已不只是“零散 helper 抽取”
- 而是开始具备“模板主要消费 panel view”的结构特征

### 仍未完成的事项

- compat facade 仍保留并仍被动作层依赖
- 页面模板虽然已明显收敛，但并未完全脱离 compat 入口
- 因此 event 还不能进入旧入口删除阶段

## worldline 模块当前迁移结果

### 已完成的模板消费收敛

以下片段已经改为优先消费显式 view contract：

- lore 世界线时间线面板
  - `publish/index.html`
  - 当前消费 `loreTimelinePanelView(lore)`
  - 模板直接读取：
    - `view.timelineTitle`
    - `view.timeRange`
    - `view.rows`
    - `view.emptyText`
  - 已不再回到 `timelineItems(lore)` / `timelineMeta(item)` 的旧细粒度组合方式

- 现实进行中情节摘要
  - `publish/index.html`
  - 当前消费 `pendingRealPlotSummaryView()`
  - 模板直接读取：
    - `summary.title`
    - `summary.timeRange`
    - `summary.statsText`
  - 模板不再直接读取 `realWorldline().pendingPlot.*`

- 现实记录列表
  - `publish/index.html`
  - 当前消费 `realWorldTimelinePanelView()` 提供的：
    - `recordingRows`
    - `recordingEmptyText`
  - 模板不再直接执行：
    - `realWorldRecordingEvents().map(...)`
    - `realWorldTimelineRow(entry)`

- 现实世界线主列表
  - `publish/index.html`
  - 当前消费 `realWorldTimelinePanelView()` 提供的：
    - `rows`
    - `emptyText`

### 当前形成的 helper 模式

worldline 已形成如下职责分层：

- lore 辅助：`lore-view-helpers.js`
- 时间线数据排序：`timeline-view-helpers.js`
- 情节摘要：`plot-view-helpers.js`
- 时间线展示 contract：`timeline-panel-view-helpers.js`
- 现实情节摘要：`real-plot-summary-view-helpers.js`
- compat 入口：`view-helpers.js`

这说明：

- worldline 已是当前最成熟的模板消费收敛样板之一
- 它适合继续作为“展示 contract 迁移”的试点模块
- 但它仍不是可直接删 compat 的模块

### 仍未完成的事项

- `publish/index.html` 仍直接依赖 worldline compat 暴露的聚合入口
- 宿主产物仍可见 worldline compat 路径
- 高风险 `real-world` 旧 helper 文件仍不适合直接纳入这条小步迁移线

## company 模块当前状态

company 当前已完成多组 section/header helper 拆分，但本文档记录的是“模板消费收敛”阶段，因此仅说明现状：

- 已形成 summary / organization / field / contract / employment record 等 helper 边界
- compat facade 仍作为外部统一入口存在
- 当前更像“helper 拆分已成形”，而不是“模板消费收敛已大面积完成”

因此：

- company 仍然是后续可继续推进的模块
- 但在“模板 contract 样板成熟度”上暂时落后于 worldline 与 event

## 当前统一结论

基于本轮审计，可以得出以下结论：

- event 与 worldline 已进入“模板主要消费 view contract”的阶段
- 这两者都已显著降低模板层对底层结构和散装 helper 的直接依赖
- company 已具备 helper 边界，但模板消费收敛证据相对较少
- 三个模块目前都还不满足 compat 删除条件

因此当前正确动作仍然是：

- 继续收敛模板消费
- 继续积累调用链与边界证据
- 暂不清理 compat facade
- 暂不清理高风险 legacy 文件

## 建议的下一阶段动作

### 1. 继续以 worldline / event 为展示 contract 迁移样板

优先寻找：

- 模板仍直接认识底层字段的片段
- 模板仍直接 `.map(...)` 或拼接文案的片段
- 同层重复调用同一 panel view 的片段

### 2. 为 company 增补模板消费收敛证据

下一阶段可重点观察：

- company 页面模板是否仍有直接依赖底层结构的块
- 哪些 section 已经可以切换成完整 section view contract

### 3. 不要把“结构更成熟”误判为“可以删 compat”

compat 删除前仍需要同时满足：

- 页面模板调用迁移完成
- 动作层调用迁移完成
- 宿主装配链同步路径明确
- callsite audit 与 cleanup gate 都给出正证据

在这些条件满足前，本文档只能说明“迁移基础变好了”，不能说明“清旧代码时机到了”。
