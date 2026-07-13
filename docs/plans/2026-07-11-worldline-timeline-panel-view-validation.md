# 2026-07-11 worldline timeline panel view validation

## Goal

为 worldline 模块建立新的时间线 panel view 样板，优先收口普通世界线卡片与现实世界记录卡片中重复度最高的 timeline 展示区块，降低 `index.html` 对 `timelineItems()` / `timelineMeta()` 等零散 store 调用的直接依赖。

## Scope

- 在 `publish/ui/worldline/view-helpers.js` 新增 timeline row/panel view helper。
- 在 `publish/worldline-actions.js` 暴露 compat 入口。
- 将 `publish/index.html` 中两个时间线列表区块改为统一消费 `view.rows`。
- 不改动世界线事件生成、情节归纳、势力详情和现实记录写入逻辑。

## Changed Files

- `publish/ui/worldline/view-helpers.js`
- `publish/worldline-actions.js`
- `publish/index.html`

## Validation

1. `publish/ui/worldline/view-helpers.js`
- 新增 `timelineRow(item)`，统一整理 timeline 单行展示字段。
- 新增 `loreTimelinePanelView(lore)`，用于普通世界线卡片。
- 新增 `realWorldTimelinePanelView()`，用于现实世界记录卡片。
- helper 输出统一包含：
- `timelineTitle`
- `timeRange`
- `rows`
- `emptyText`

2. `publish/worldline-actions.js`
- 新增 compat 转发：
- `loreTimelinePanelView(lore)`
- `realWorldTimelinePanelView()`

3. `publish/index.html`
- 普通世界线卡片 timeline 区块切换为：
- `x-data="{ view: $store.game.loreTimelinePanelView(lore) }"`
- `x-effect="view = $store.game.loreTimelinePanelView(lore)"`
- 现实世界线卡片切换为：
- `x-data="{ view: $store.game.realWorldTimelinePanelView() }"`
- `x-effect="view = $store.game.realWorldTimelinePanelView()"`
- 两处时间线列表都改为循环 `view.rows`，不再直接模板拼 `timelineItems()/timelineMeta()`。

## Checks

- `node --check publish/ui/worldline/view-helpers.js`
- `node --check publish/worldline-actions.js`
- 使用 Node 逐行读取确认：
- 普通世界线 timeline 已切到 `loreTimelinePanelView(lore)`
- 现实世界完整记录列表已切到 `realWorldTimelinePanelView()`

## Result

这一步让 worldline 成为继 real-world / event / faction / calendar 之后的新展示层迁移样板。虽然本轮没有整页重构，但已经优先拿下了两个最重复、最适合抽成 panel view 的时间线区块，符合“最小改动、先收高价值重复块”的低风险策略。