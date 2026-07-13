# Calendar Template Migration Prep (2026-07-12)

## 目的

把 `calendar` 模块作为第三份“模板迁移准备样板”拆清楚，用来补齐一种比 `skills` / `prompt` 更小、更接近收口完成态的模板场景。

这份文档重点回答：

- 当前 calendar 模板到底还直接依赖哪些 `$store.game` 入口
- 为什么它比其他模块更接近“模板公开面已收缩”
- 如果未来继续推进，应该优先迁什么，或者根本不必迁什么

## 当前状态

### 1. 当前公开面

当前与 calendar 模板直接相关的入口主要包括：

- `calendarPanelView()`
- `changeCalendarMonth(delta)`

同时，模块内部仍保留的只读/派生能力包括：

- `calendarMonthTitle()`
- `calendarDays()`
- `eventsForCalendarDay(day)`
- `formatCalendarTime(value)`

其中：

- `calendarMonthTitle()` / `calendarDays()` 已在 `publish/game.js` 中收口为桥接到 `gm.calendarActions`
- 模板主消费面当前更依赖 `calendarPanelView()`，而不是直接散布大量 `$store.game.calendar...` 调用

### 2. 模板消费位置

当前 Web 与 Android 镜像模板都通过以下方式消费 calendar 公开面：

- `publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`

关键模式为：

1. `x-data="{ view: $store.game.calendarPanelView() }"`
2. `x-effect="view = $store.game.calendarPanelView()"`
3. `@click="$store.game.changeCalendarMonth(-1)"`
4. `@click="$store.game.changeCalendarMonth(1)"`

这说明当前 calendar 模板更接近“对象化视图 contract + 少量动作入口”的形态。

## 为什么 calendar 是最小迁移样板

与 `skills`、`prompt` 相比，calendar 有几个明显差异：

1. 模板直接消费的入口更少
2. 展示数据已经被收口进 `calendarPanelView()`
3. 模板没有大面积直接散用 `calendarMonthTitle()` / `calendarDays()`
4. 动作层主要只剩 `changeCalendarMonth(delta)`

因此，calendar 更像是“模板收口已经较成熟”的样板，而不是“还需要大面积拆分”的样板。

## 未来迁移的两个可选方向

### 方向 A：保持当前模式，视为已接近目标状态

做法：

1. 继续保留 `calendarPanelView()` 作为模板主显示 contract
2. 保留 `changeCalendarMonth(delta)` 作为模板动作入口
3. 继续让 `calendarMonthTitle()` / `calendarDays()` 等留在模块内部协作面或 compat 层

优点：
- 当前已经较接近理想状态
- 无需为了“更纯”而再制造模板改动
- Web / Android 同步压力最小

缺点：
- `game.js` 仍保留少量 compat 入口
- 内部协作面还没有完全与外部公开面切割

### 方向 B：进一步压缩 `$store.game` 暴露面

做法：

1. 评估是否将 `changeCalendarMonth(delta)` 也纳入更明确的模块公开结构
2. 评估 `calendarPanelView()` 是否应成为唯一稳定模板显示入口
3. 明确 `calendarMonthTitle()` / `calendarDays()` 是否仍需长期保留在 compat 层

优点：
- 更有利于把 calendar 做成“小而完整”的标准模块
- 有助于形成“对象化 view contract”样板

缺点：
- 实际收益可能不如其他更厚模块明显
- 有可能为了更纯的结构付出不成比例的迁移成本

## 迁移前必须确认的事项

1. `calendarPanelView()` 是否已经足够承载长期模板显示 contract
2. `changeCalendarMonth(delta)` 是否应长期保留为稳定动作入口
3. `calendarMonthTitle()` / `calendarDays()` 是否还有模板外部消费者
4. Web 与 Android 镜像是否都能继续围绕同一 `view` contract 保持同步
5. 若真要继续压缩公开面，是否值得投入相应迁移成本

## 与 skills / prompt 样板的差异

- `skills` 样板说明的是“只读列表 + 详情查看”的迁移准备
- `prompt` 样板说明的是“只读展示 + 轻交互弹层”的迁移准备
- `calendar` 样板说明的是“模板主显示面已经对象化，只剩少量动作入口”的迁移准备

因此，calendar 更适合作为“收口接近完成态”的最小样板，而不是下一批大规模迁移对象。

## 当前最推荐策略

当前阶段最推荐：

1. 先把 calendar 视为更成熟的模板收口样板
2. 不急着继续为了纯度改模板
3. 若后续需要选一个“可以较早进入删除 gate 评估”的模块，calendar 可以排在 skills / prompt 前面做复核

## 当前阶段结论

`calendar` 不是最适合继续大动模板的模块，而是最适合用来证明：

- 某些模块的模板公开面已经可以相对稳定地收敛到 `view contract + 少量动作入口`

因此，calendar 更像是一个“接近收口完成态”的迁移样板。后续若继续推进 compat 清理，应优先把它作为对照组，而不是优先大改对象。