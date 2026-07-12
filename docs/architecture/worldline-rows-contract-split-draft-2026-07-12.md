# Worldline Rows Contract Split Draft (2026-07-12)

## 目的

这份草案用于为 `timelineItems` 的后续收缩试点补一层前置边界：

- 先明确 lore timeline 与 real world timeline 当前共享什么 rows contract
- 再明确两者分别在哪些位置发生分叉
- 让后续 `timelineItems` 不必直接等于 panel rows 的入口

它不是实现稿。

## 当前问题

在现状下：

- `timelineItems(lore)` 同时服务于 `loreTimelinePanelView(lore)` 与 `realWorldTimelinePanelView()`
- 因此它既是只读入口，又贴着 rows 列表骨架
- 若直接像 `timelineMeta` 一样内收，很容易同时影响 lore / real 两条展示链

这说明当前真正缺少的不是“再找一个 helper”，而是：

- 一层更明确的 rows contract

## A. 当前共享 contract

无论 lore panel 还是 real panel，当前都向模板提供了以下稳定字段：

- `timelineTitle`
- `timeRange`
- `rows`
- `emptyText`

模板当前更多依赖的是这些高层字段，而不是 `timelineItems` 本身。

这说明存在一个可以形式化的共享 contract：

- `timelinePanelRowsView`

## B. 当前分叉点

### 1. lore panel 的 rows 生成

当前路径：

- `timelineItems(current)`
- `timelineRow(item)`

当前特点：

1. 使用标准 row builder
2. 保留 story/event 两种 `kind`
3. `meta` 来自 `buildTimelineMeta(item)`

### 2. real panel 的 rows 生成

当前路径：

- `timelineItems(lore)`
- `realWorldTimelineRow(item)`
- `realWorldRecordingEvents()`
- `realWorldTimelineRow(entry)`

当前特点：

1. 主 rows 与 recording rows 是两条来源
2. 使用现实世界专用 row builder
3. `meta` 规则和 lore row 不同
4. 比 lore panel 多出：
   - `recordingRows`
   - `recordingEmptyText`

## C. 建议的中间边界

若后续要为 `timelineItems` 降风险，更合理的中间边界应接近以下形式：

### 1. 共享基础 contract

- `buildTimelinePanelBaseView(line, rows, emptyText)`

职责：

1. 统一生成 `timelineTitle / timeRange / rows / emptyText`
2. 不关心 rows 是 lore 还是 real

### 2. lore rows contract

- `loreTimelineRowsView(lore)`

职责：

1. 负责从 lore 世界线构出 rows
2. 内部决定是否继续使用 `timelineItems`
3. 不直接暴露给模板细粒度消费

### 3. real rows contract

- `realWorldTimelineRowsView()`

职责：

1. 负责现实世界 timeline 的主 rows
2. 负责现实记录 `recordingRows`
3. 明确主 rows 与 recording rows 的分工

## D. 为什么这层拆分能降低风险

若先补这层 contract，则后续 `timelineItems` 的位置会自然后移：

- 当前：`panel -> timelineItems`
- 目标：`panel -> rows view -> timelineItems/internal helpers`

好处：

1. lore / real 的分叉能显式表达
2. `timelineItems` 不再直接等于 panel 对外入口
3. 以后即使调整 `timelineItems`，模板与 panel contract 也更稳定
4. 更容易分别验证 lore / real 两条链

## E. 不建议的做法

在没有这层 rows contract 前，不建议：

1. 直接从 `worldlineActions` 里删除 `timelineItems`
2. 直接删除 `view-helpers.js` 中的 `timelineItems` facade
3. 把 `timelineItems` 的实现逻辑散回多个 panel helper
4. 同时把 `timelineItems` 与 `worldlineEventsNewestFirst` 当一刀处理

## F. 若后续进入真实实现，推荐顺序

1. 先抽共享基础 contract
2. 再抽 lore rows contract
3. 再抽 real rows contract
4. 最后再评估 `timelineItems` 是否还能继续向内退化

## 当前结论

`timelineItems` 当前之所以还不适合直接进入下一刀，不是因为它不够“只读”，而是因为它仍处在 rows 列表骨架层。

因此，在它进入真实收缩前，最合理的前置动作不是直接删 facade，而是：

- 先把 rows contract 再上移一层
- 让 lore / real timeline 的上游边界更明确

这一步完成后，`timelineItems` 才更有机会复制 `timelineMeta` 的试点路径。
