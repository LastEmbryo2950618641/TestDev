# Calendar Compat Gate Deepening Checklist (2026-07-12)

## 目的

基于当前已完成的 `calendar` 模块 bridge inventory、模板迁移准备、gate 预审与模板外调用审计，整理出一份“继续推进到真实 compat 删除 gate 评估前，还差哪些证据”的深化清单。

这份清单不是删除计划，而是删除前的证据补齐清单。

## 当前已具备的证据

`calendar` 当前已经具备的事实基础包括：

1. 模板主显示面较集中，围绕：
   - `calendarPanelView()`
   - `changeCalendarMonth(delta)`
2. `calendarMonthTitle()` / `calendarDays()` 已在 `publish/game.js` 中收口为薄桥接
3. Web / Android 镜像模板消费方式一致
4. 模板外调用面已确认至少包括：
   - `publish/boss-appointment-actions.js` 对 `formatCalendarTime()` 的调用
   - `publish/skills-definitions-apps.js` 中的能力说明公开面

## 当前仍缺的关键证据

### 1. 模板公开面最终定位结论

需要补齐的问题：

- `calendarPanelView()` 是否长期保留为稳定模板显示 contract
- `changeCalendarMonth(delta)` 是否长期保留为稳定动作入口
- 如果长期保留，这一组是否应从“待删除 compat”转为“稳定 facade，不再删除候选”

未补齐前风险：

- 会把“应该长期保留的公开 contract”误判成“应该尽快删掉的 compat 残留”

### 2. 模板外能力调用面完整清单

当前已知：

- `formatCalendarTime()` 有跨模块运行时调用
- `calendarDays()` / `eventsForCalendarDay()` / `formatCalendarTime()` 有能力说明层暴露

仍需补齐：

- 是否还有其他运行时模块直接使用这些方法
- 是否还有 AI 能力、说明层、提示层依赖这些名字

未补齐前风险：

- 删除 compat 时只看模板消费，漏掉模板外活跃依赖

### 3. fallback 兜底是否仍有必要的结论

需要补齐的问题：

- `calendarMonthTitle()` / `calendarDays()` 在 `publish/game.js` 上的 fallback 是否仍承担必要的初始化安全职责
- 如果去掉 fallback，是否存在模块尚未加载就被访问的路径
- 是否已有更安全的初始化前置条件可以替代 fallback

未补齐前风险：

- 过早删掉 compat 或兜底，导致运行期在边缘初始化路径上报错

### 4. 删除后的最小验证方案

需要先定义最小验证：

1. Web 端：
   - 日历卡片显示正常
   - 月份切换正常
   - 事件显示正常
2. Android 镜像端：
   - 同样的模板行为正常
3. 跨模块：
   - `boss-appointment-actions.js` 的日历提示时间格式仍正常
4. 能力层：
   - 与 `skills-definitions-apps.js` 相关的方法说明未出现失配

未补齐前风险：

- 即便结构上看似能删，也缺乏删除后的回归验证基线

## 当前最可能的两种结论分支

### 分支 A：calendar 相关 compat 入口不删除，只正式认定为稳定 facade

适用条件：

- `calendarPanelView()` / `changeCalendarMonth()` 被确认应长期保留为模板公开面
- `calendarMonthTitle()` / `calendarDays()` 等能力也仍有对外可见价值

意义：

- `calendar` 成为“收口完成态样板”，而不是“清理删空样板”

### 分支 B：calendar 中只有部分 compat 入口进入删除候选

适用条件：

- 模板公开面和模板外能力公开面被重新划分清楚
- 可以明确区分：
  - 哪些应长期保留
  - 哪些只是过渡壳

意义：

- `calendar` 成为“首批局部 compat 清理”试点，而不是整组清掉

## 当前最推荐的下一步

优先顺序建议：

1. 先补模板外调用面完整清单
2. 再补 fallback 必要性判断
3. 再决定 `calendarPanelView()` / `changeCalendarMonth()` 的长期定位
4. 最后才决定是否真的值得进入删除 gate

## 当前阶段结论

`calendar` 当前已经不是“是否成熟”的问题，而是“成熟到哪一步、最终是进入删除 gate，还是正式转为稳定 facade”的问题。

因此，接下来最重要的不是继续泛化样板，而是继续围绕 `calendar` 把这几条关键证据补齐。