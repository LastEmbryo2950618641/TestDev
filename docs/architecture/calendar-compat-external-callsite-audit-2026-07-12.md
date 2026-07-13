# Calendar Compat External Callsite Audit (2026-07-12)

## 目的

补齐 `calendar` 模块在模板之外的调用面审计，作为 `calendar` 进入 compat 删除 gate 深化评估前的关键证据之一。

这份文档重点回答：

- `calendar` 相关入口除了 Web / Android 模板外，还有哪些活跃调用面
- 哪些是模块内部协作
- 哪些已经属于模块外能力消费
- 这些事实对 compat 删除 gate 有什么影响

## 本轮审计范围

聚焦以下入口：

- `calendarMonthTitle()`
- `calendarDays()`
- `eventsForCalendarDay(day)`
- `formatCalendarTime(value)`
- `calendarPanelView()`
- `changeCalendarMonth(delta)`

## 审计结果

### 1. 模板主消费面

Web 与 Android 镜像模板当前仍直接消费：

- `calendarPanelView()`
- `changeCalendarMonth(delta)`

位置：

- `publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`

结论：
- 这两个入口当前仍是活跃模板 contract
- 在未重新定义模板公开面前，不应删除相关 compat 能力

### 2. calendar 模块内部协作面

以下入口当前主要在 `publish/calendar-actions.js` 与 `ui.calendar.viewHelpers` 协作中存在：

- `calendarMonthTitle()`
- `calendarDays()`
- `eventsForCalendarDay(day)`
- `formatCalendarTime(value)`
- `calendarPanelView()`

结论：
- 这些能力已经较稳定地下沉到 calendar 模块侧
- 但这不自动等于外部公开面已经可以删除

### 3. 模块外运行时调用面

本轮确认的活跃模块外运行时调用：

- `publish/boss-appointment-actions.js` 调用 `formatCalendarTime(event.time)`

结论：
- `formatCalendarTime()` 不是纯模板内部能力
- 它已经被其他业务模块当作公开工具使用
- 因此，若未来考虑缩减 calendar compat 入口，必须把跨模块调用一起纳入 gate

### 4. 能力说明 / 文档化调用面

以下能力当前被记录在 `publish/skills-definitions-apps.js` 中：

- `changeCalendarMonth(delta)`
- `calendarDays()`
- `eventsForCalendarDay(day)`
- `formatCalendarTime(value)`

结论：
- 即使其中部分不是模板主显示面，它们也已经属于“对 AI / 系统可见的能力公开面”
- 删除或改名不能只看模板消费，还要考虑能力说明层的同步调整

## 当前判断

基于本轮审计，`calendar` 的外部调用面比表面上略宽：

1. 模板主显示面使用 `calendarPanelView()` / `changeCalendarMonth()`
2. 跨模块运行时调用至少存在 `formatCalendarTime()`
3. 能力说明层已把多项 calendar 能力视为对外可见方法

这说明：

- `calendar` 的确是当前最成熟的 compat 候选模块之一
- 但它并不是“只有模板消费、删掉就完”的简单场景

## 对 compat 删除 gate 的影响

若未来要继续推进 `calendar` 的 compat 删除 gate，至少应额外补齐：

1. `formatCalendarTime()` 的跨模块公开面策略
2. `calendarDays()` / `eventsForCalendarDay()` 是否仍应保留为外部能力
3. `skills-definitions-apps.js` 等能力说明是否需要同步调整
4. `calendarPanelView()` / `changeCalendarMonth()` 是否长期保留为模板 contract

## 当前阶段结论

`calendar` 当前最适合被视为：

- 第一优先的 compat gate 深化评估模块

但它还不应被误判成：

- 一个只要模板迁一迁就能直接删 compat 的模块

因为它已经存在：

1. 模板公开面
2. 跨模块运行时调用面
3. 能力说明公开面

这三层都需要纳入最终 gate 审计。