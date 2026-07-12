# Worldline UI Helper Boundary Review (2026-07-12)

## 目的

这份文档用于记录 `publish/ui/worldline/` 当前阶段已经完成的只读展示层收口结果、仍需保留的兼容入口，以及后续继续推进或清理时应遵守的边界。

目标不是宣布 worldline 模块已经全部完成重构，而是形成一份稳定的阶段证据，帮助后续协作者判断：

- 哪些 helper 簇已经独立
- 哪些 compat 入口当前仍有保留价值
- 哪些逻辑后面还能继续拆
- 哪些动作现在不该过早执行

## 当前目录现状

截至 2026-07-12，`publish/ui/worldline/` 已形成以下结构：

### 兼容聚合入口

- `view-helpers.js`
  - 对外保留 `window.GameModules.ui.worldline.viewHelpers.*` 访问路径
  - 内部已经主要退化为 compat facade 与聚合入口

### 主题 helper

- `lore-view-helpers.js`
  - lore expand/collapse 只读行为
  - control lore 过滤
  - real-world lore 展示对象组装

- `timeline-view-helpers.js`
  - timeline item 整理
  - newest-first 事件排序

- `plot-view-helpers.js`
  - real-world plot 选择派生
  - selected plot 事件过滤
  - recording 事件列表派生

- `timeline-panel-view-helpers.js`
  - timeline meta 文本拼装
  - row 对象组装
  - lore / real-world timeline panel 展示对象

## 已完成的迁移结论

以下逻辑已经从 `view-helpers.js` 内联实现迁移为独立 helper：

- `toggleLore`
- `isLoreOpen`
- `controlLores`
- `realTag`
- `realLore`
- `timelineItems`
- `worldlineEventsNewestFirst`
- `summarizedPlots`
- `selectedPlot`
- `selectedPlotEvents`
- `recordingEvents`
- `timelineMeta`
- `timelineRow`
- `realWorldTimelineRow`
- `loreTimelinePanelView`
- `realWorldTimelinePanelView`

当前只有 `selectRealWorldPlot()` 仍保留在 `view-helpers.js` 中作为界面选择状态的最小写入点。

## 为什么 `view-helpers.js` 现在仍应保留

虽然 `view-helpers.js` 已明显变薄，但当前仍不建议直接删除，原因如下：

1. 旧调用方可能仍依赖 `window.GameModules.ui.worldline.viewHelpers.*`
2. 当前尚未完成完整调用链审计，不能证明所有入口都已切换到新 helper 直接访问
3. `view-helpers.js` 作为 compat facade 的维护成本已经很低，保留它能显著降低回归风险

因此当前策略应为：

- 保留 `view-helpers.js` 作为 broader compat entry
- 暂不把“结构已经清晰”误判为“可以立刻删除兼容层”
- 在没有调用面审计前，不推进 compat 删除

## 当前模块的成熟度判断

与当前其他模块相比，worldline 的 UI helper 线已经表现出更高的稳定性：

- 连续多刀拆分都能通过最小语法验证
- 没有像 `real-world` 那样暴露出同级别的编码脆弱面
- 没有像 `company` 基础 helper 那样存在明显的历史脏编码文本阻塞主推进节奏
- helper 簇边界天然、依赖关系清晰、迁移顺序稳定

因此 worldline 当前适合作为“可持续推进的展示层收口样板模块”。

## 当前暂不建议做的事

### 1. 不要直接删除 `view-helpers.js`

即便它已经很薄，也不要把 compat facade 过早删除。

### 2. 不要把界面选择写入点硬塞进纯只读 helper

`selectRealWorldPlot()` 当前仍留在聚合入口中，是合理的。

原因是：

- 它会写入 `selectedRealWorldPlotId`
- 它属于最小界面选择状态变更
- 继续保留在聚合入口，比把写入点混入纯只读 helper 更清晰

### 3. 不要为了目录对称继续无意义细切

当 helper 已经足够聚焦时，不需要为了“每个函数一个文件”继续机械拆分。

## 下一阶段建议

### 方向 A：在 worldline 内继续谨慎推进

若继续沿 worldline 深化，可优先考虑：

- 对剩余聚合入口做调用链审计
- 判断 `selectDebugSection / isDebugSection` 是否值得单独归类
- 判断是否需要补 worldline 的阶段验证或迁移样板文档

### 方向 B：把 worldline 作为成熟样板，回到其他模块复制方法

更推荐的路线是：

- 以 worldline 当前结构为样板
- 继续在 `event` 或其他低风险模块复制同类拆分方式
- 把高风险编码区继续留在后置清理阶段处理

## 当前阶段结论

worldline 模块当前应被视为：

- 已形成稳定主题 helper 分层
- 已形成清晰 compat facade 边界
- 适合作为后续模块重构的参考样板
- 暂不进入 compat 删除阶段

换句话说，worldline 现在最适合“沉淀样板、稳定扩展”，而不是“急于清旧入口”。
