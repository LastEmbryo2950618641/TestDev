# Worldline Residual Compat Entry Inventory (2026-07-12)

## 目的

这份清单进一步细化 `worldline` 的残余 compat 入口。

动作层 compat 审计已经说明：

- worldline 是当前最适合的 compat 迁移试点
- 但它仍保留一批 `worldlineViewHelperForwarders`

本文档继续回答：

- 这些入口分别是什么性质
- 哪些只是页面只读 facade
- 哪些是仍应暂时保留的界面写入点
- 哪些虽然还挂在 compat 名义下，但实际上已被更明确的 panel/helper contract 间接包住

## 审计范围

本轮聚焦：

- `publish/worldline-actions.js`
- `publish/ui/worldline/view-helpers.js`
- `publish/index.html`

## 残余入口分组

### A. 界面状态写入 / UI 控制入口

这组入口不应与纯只读 helper 混为一谈，因为它们仍直接写入界面状态：

- `selectWorldlineDebugSection`
  - 实际落点：`selectDebugSection(name)`
  - 作用：写入 `this.worldlineDebugSection`
  - 当前页面用途：debug 选中态切换、面板高亮
  - 当前判断：
    - 属于 UI 写入点
    - 不应在未设计替代 UI state surface 前贸然删除

- `toggleWorldline`
  - 实际落点：`toggleLore(lore)`
  - 作用：切换某条 lore 世界线展开状态
  - 当前页面用途：世界线卡片展开/收起
  - 当前判断：
    - 属于 UI 写入点
    - 当前仍应保留为显式界面行为入口

- `selectRealWorldPlot`
  - 实际落点：`selectRealWorldPlot(plotId)`
  - 作用：写入 `selectedRealWorldPlotId`
  - 当前页面用途：现实情节选择状态
  - 当前判断：
    - 这是当前最典型的“应继续暂存的最小界面写入点”
    - 不应和只读 facade 一起收缩

### B. 页面只读 facade

这组入口主要仍为页面模板服务，但不直接承担状态写入：

- `isWorldlineDebugSection`
  - 实际落点：`isDebugSection(name)`
  - 当前用途：模板 class / debug 选中判断
  - 当前判断：
    - 只读 UI 辅助
    - 未来可考虑与 debug surface 一并整理，而不是单独急删

- `isWorldlineOpen`
  - 实际落点：`isLoreOpen(lore)`
  - 当前用途：模板判断 lore 面板是否展开
  - 当前判断：
    - 只读 UI 辅助
    - 与 `toggleWorldline` 成对存在，适合后续按“展开态 UI contract”整体审视

- `controlWorldLores`
  - 实际落点：`controlLores()`
  - 当前用途：control tab 列表渲染
  - 当前判断：
    - 只读数据入口
    - 未来可考虑是否并入更完整的 control panel view

- `realWorldTag`
  - 实际落点：`realTag()`
  - 当前用途：real lore tag 推导
  - 当前判断：
    - 只读 facade
    - 更多像 lore 语义辅助，而不是 domain state 核心入口

- `realWorldLore`
  - 实际落点：`realLore()`
  - 当前用途：真实世界 lore 展示
  - 当前判断：
    - 页面仍直接消费
    - 但本身更像只读展示辅助，不是动作写入面

- `realWorldSummarizedPlots`
  - 实际落点：`summarizedPlots()`
  - 当前用途：现实情节摘要列表
  - 当前判断：
    - 只读 facade
    - 后续可评估是否收进更完整的 plot panel view

- `realWorldSelectedPlot`
  - 实际落点：`selectedPlot()`
  - 当前用途：当前选中情节
  - 当前判断：
    - 只读 facade
    - 和 `selectRealWorldPlot` 形成读写对

- `realWorldPlotEvents`
  - 实际落点：`selectedPlotEvents(plot)`
  - 当前用途：选中情节关联事件列表
  - 当前判断：
    - 只读 facade
    - 可与 plot 相关 view contract 一并审视

- `realWorldRecordingEvents`
  - 实际落点：`recordingEvents()`
  - 当前用途：现实记录列表数据源
  - 当前判断：
    - 原先模板曾直接依赖
    - 现已更多被 panel view 间接消费
    - 这是“已被新 contract 包住，但旧 facade 仍在”的代表入口

- `timelineItems`
  - 实际落点：`timelineItems(lore)`
  - 当前用途：时间线行原始列表拼装
  - 当前判断：
    - 模板主路径已不再直接细粒度消费它
    - 当前更像 panel view 的内部依赖
    - 后续可评估是否继续留在 compat facade 对外暴露

- `timelineMeta`
  - 实际落点：`timelineMeta(item)`
  - 当前用途：时间线 meta 拼装
  - 当前判断：
    - 与 `timelineItems` 类似，主模板路径已不再直接细粒度消费
    - 当前主要被 panel row helper 间接使用

- `worldlineEventsNewestFirst`
  - 实际落点：`worldlineEventsNewestFirst(events)`
  - 当前用途：事件排序
  - 当前判断：
    - 更像内部排序 helper
    - 不太像长期应暴露给页面层的 compat 入口

### C. 已有更明确 domain / panel 落点的周边能力

这组能力说明 worldline 已经出现了“compat 外的更明确归宿”：

- state service
  - `realWorldline()`
  - `loreWorldline(lore)`
  - `updateWorldlineFromTurn(result)`
  - `appendWorldlineEvent(...)`

- query service
  - `worldlinePlots(lore)`
  - `worldlineFactions(lore)`

- format helper
  - `connectionWorldlineEvent(...)`
  - `worldlineTurnEventId(...)`
  - `worldlineSafeId(...)`
  - `worldlineTurnDetail(...)`
  - `factionAttrs(...)`
  - `factionRelations(...)`

- panel / summary contract
  - `loreTimelinePanelView(lore)`
  - `realWorldTimelinePanelView()`
  - `pendingRealPlotSummaryView()`

这说明：

- worldline 的真正主趋势不是“保留 compat 不动”
- 而是“越来越多职责已经能放进更清楚的边界里”
- 残余 compat 入口主要是一些 UI 读写 facade 和历史对外别名

## 当前最适合优先收缩的目标

若后续进入第一批 worldline compat 收缩准备，更适合优先观察：

1. `timelineItems`
2. `timelineMeta`
3. `worldlineEventsNewestFirst`
4. `realWorldRecordingEvents`

原因：

- 它们更像内部只读 helper 或已被 panel contract 间接包住
- 相比 UI 写入点，迁移风险通常更低
- 更容易形成“先缩只读 facade，再保留必要写入点”的安全路径

## 当前不应优先动的入口

以下入口不建议作为第一批收缩目标：

- `selectWorldlineDebugSection`
- `toggleWorldline`
- `selectRealWorldPlot`

原因：

- 它们仍直接承担界面状态写入
- 若贸然收掉，只会把状态写入重新散回模板或别处
- 这会违背当前“降低耦合”的主目标

## 当前统一结论

worldline 残余 compat 入口已经不再是一个同质集合。

更准确地说，它现在分成三类：

- 必须暂留的 UI 写入点
- 可逐步收缩的只读 facade
- 已被更明确 domain / panel contract 包住的历史别名

这意味着下一阶段若真的开始 worldline compat 迁移准备，正确顺序应是：

1. 先识别可收缩的只读 facade
2. 保留必要 UI 写入点
3. 继续扩大 domain / panel contract 的覆盖面

而不是整批删除 `worldlineViewHelperForwarders`。
