# Calendar Compat Gate Precheck (2026-07-12)

## 目的

对 `calendar` 模块进行第一轮“小模块 compat 删除 gate 候选预审”，不是立即删除入口，而是判断它距离“可进入删除候选”还差哪些证据。

## 预审对象

当前重点观察的 calendar 相关公开面包括：

- `calendarPanelView()`
- `changeCalendarMonth(delta)`
- `calendarMonthTitle()`
- `calendarDays()`
- `eventsForCalendarDay(day)`
- `formatCalendarTime(value)`

## 已确认的积极信号

### 1. 模板主显示面已经较集中

Web 与 Android 镜像模板当前主要通过以下方式消费 calendar：

- `calendarPanelView()`
- `changeCalendarMonth(delta)`

这说明：

- calendar 模板主显示面已经不是大面积散落在多个 `$store.game.calendar...` 入口上
- 它更接近 `view contract + 少量动作入口` 的成熟形态

### 2. 只读派生入口已基本内聚到模块侧

以下能力已经在 `publish/calendar-actions.js` / `ui.calendar.viewHelpers` 中形成稳定实现：

- `calendarMonthTitle()`
- `calendarDays()`
- `eventsForCalendarDay(day)`
- `formatCalendarTime(value)`
- `calendarPanelView()`

并且：

- `calendarMonthTitle()` / `calendarDays()` 已在 `publish/game.js` 中变为薄桥接层

### 3. Web / Android 镜像消费结构一致

`publish/index.html` 与 Android 镜像 `index.html` 在 calendar 区块上的消费方式是对齐的。

这意味着：

- 后续如果做 calendar 级别的 contract 调整
- 同步验证范围相对明确
- 不像更复杂模块那样容易出现消费面分裂

## 当前仍不满足删除 gate 的原因

### 1. `calendarPanelView()` / `changeCalendarMonth(delta)` 仍是模板活跃公开面

当前模板仍直接使用：

- `$store.game.calendarPanelView()`
- `$store.game.changeCalendarMonth(...)`

因此：

- 现在还不能说 calendar 已脱离 `$store.game` 公开面
- 若未来要继续压缩 compat，必须先决定这两个入口是否长期保留为稳定 contract

### 2. `calendarMonthTitle()` / `calendarDays()` 仍有模块外部可见能力意义

虽然当前模板主显示面不直接依赖它们，但项目中仍存在对它们的能力说明与模块协作语义，例如：

- `publish/skills-definitions-apps.js` 中对 `calendarDays()`、`eventsForCalendarDay()`、`formatCalendarTime()` 的能力说明
- `boss-appointment-actions.js` 对 `formatCalendarTime()` 的调用

因此：

- 不能只从模板消费角度判断 calendar compat 已可删
- 还需要把“模板外能力调用面”一起算进 gate

### 3. `game.js` 上的 compat 层仍承担最低兜底职责

当前 `publish/game.js` 上：

- `calendarMonthTitle()`
- `calendarDays()`

仍保留 fallback 兜底返回值。

在尚未明确这些兜底是否还能完全移除前，不宜进入删除阶段。

## 当前预审结论

`calendar` 是当前最接近“可进入 compat 删除 gate 评估”的轻量模块之一，但它还没有真正进入“可删除 compat”的阶段。

更准确的结论应是：

- 它适合作为第一批删除 gate 对照组
- 它的模板显示面已经较成熟
- 但仍需先处理模板公开面与模板外能力调用面的最终边界判断

## 若要继续推进 calendar 的删除 gate，下一步应补什么

### 1. 明确 `calendarPanelView()` / `changeCalendarMonth()` 的长期定位

需要先决定：

- 这两个入口是否长期作为稳定模板 contract 保留
- 还是未来也计划迁到新的模块公开面

### 2. 补模板外调用面清单

至少应再确认：

- `calendarDays()`
- `eventsForCalendarDay()`
- `formatCalendarTime()`

是否还有除当前已知位置外的活跃调用者。

### 3. 判断 `game.js` 上 calendar compat 是否还有必要保留兜底

如果要进入真正删除候选，必须先回答：

- `calendarMonthTitle()` / `calendarDays()` 的 fallback 是否仍有必要
- 是否已有更安全的模块初始化前置条件可以替代

## 当前阶段判断

与 `skills`、`prompt`、`boss`、`taobao` 相比，`calendar` 更适合作为：

- 第一批 compat 删除 gate 预审对照模块

但不应直接把它当成：

- 第一批立即删除 compat 的模块

## 当前结论

`calendar` 已经非常接近“收口完成态样板”，但距离“真正进入 compat 删除”之间，仍差一层关键证据：

1. 模板公开面最终定位
2. 模板外调用面补全
3. fallback 必要性判断

在这三项证据补齐前，calendar 仍应继续视为“高成熟度 compat 样板”，而不是“已可删除 compat 的模块”。