# 2026-07-11 calendar panel view validation

## Goal

为 calendar 模块建立一个轻量的 view helper 样板，验证 panel view 模式不仅适用于 faction / event / real-world，也适用于更简单的独立应用面板。目标是在不改玩法逻辑的前提下，降低 index.html 对 calendar store 细节的直接依赖。

## Scope

- 新增 `publish/ui/calendar/view-helpers.js`。
- 为日历应用主界面提供 `calendarPanelView()`。
- 将 `publish/index.html` 的日历主面板改为统一消费 `view`。
- 不改动月份切换、事件归并、节假日查询、日期格计算逻辑。

## Changed Files

- `publish/ui/calendar/view-helpers.js`
- `publish/calendar-actions.js`
- `publish/index.html`

## Validation

1. `publish/ui/calendar/view-helpers.js`
- 新增 `weekdayLabels()`，统一提供周标题。
- 新增 `dayCellRows()`，将 `calendarDays()` 的结果转换为模板直用数据：
- `blank`
- `day`
- `holiday`
- `marked`
- `events[]`
- 事件行内仅暴露 `title` 与 `isSystemEvent`，不让模板继续依赖原始 event 结构。
- 新增 `panelView()`，统一输出眉题、标题、副标题、关闭按钮文案、工具栏文案、周标题与日历格。

2. `publish/calendar-actions.js`
- 新增 compat 入口 `calendarPanelView()`，由 store 转发到 `window.GameModules.ui.calendar.viewHelpers.panelView`。
- 保留既有 `calendarDays()`、`calendarMonthTitle()`、`changeCalendarMonth()` 等业务接口，兼容渐进迁移。

3. `publish/index.html`
- 日历面板切换为：
- `x-data="{ view: $store.game.calendarPanelView() }"`
- `x-effect="view = $store.game.calendarPanelView()"`
- 模板只消费 `view.toolbar`、`view.weekdays`、`view.cells`。
- 月份切换按钮仍调用 `$store.game.changeCalendarMonth(...)`，未改变交互行为。
- 关闭按钮仍调用 `$store.game.closeCalendarApp()`。

## Checks

- `node --check publish/ui/calendar/view-helpers.js`
- `node --check publish/calendar-actions.js`
- 使用 Node 逐行读取 `publish/index.html` 目标区段，确认日历模板已切换为 `calendarPanelView()`。

## Result

本轮让 calendar 成为了第四个展示层迁移样板，说明当前 panel/detail/section view 的收口方式不依赖某个重模块。这样后续整理多端共用展示 contract 时，可以把 calendar 当作轻量级对照样本。