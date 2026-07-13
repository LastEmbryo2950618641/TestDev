# TimelineItems Reduction Trigger Note (2026-07-12)

## 目的

这份说明用于记录一个关键判断点：

- 在 rows contract 第一刀和 rows source builder 补位之后
- `timelineItems` 是否已经开始接近真正的 compat 收缩门槛

它不是实现稿。

## 当前状态

当前 `timelineItems` 只剩以下三层位置：

1. `publish/ui/worldline/timeline-view-helpers.js`
   - 真实实现
2. `publish/ui/worldline/view-helpers.js`
   - facade 转发
3. `publish/worldline-actions.js`
   - forwarder 表中的 action bridge

## 当前最关键的新变化

此前 `timelineItems` 最大的问题是：

- 它仍被 `timeline-panel-view-helpers.js` 中的 rows builder 直接消费

现在这一点已经发生了变化：

1. `buildLoreTimelineRows(...)` 不再直接调用 `this.timelineItems(...)`
2. `buildRealWorldTimelineRows(...)` 不再直接调用 `this.timelineItems(...)`
3. rows source builder 已经先行承接：
   - `buildTimelineEventItems(...)`
   - `buildTimelineStoryItems(...)`
   - `buildLoreTimelineItems(...)`
   - `buildRealWorldTimelineItems(...)`

这意味着：

- `timelineItems` 已经退出 panel helper 的直接上游位置
- 它开始更像一个残留实现入口，而不是当前 rows 骨架的必经路径

## 为什么这是一个触发点

和此前相比，当前最大的结构变化是：

- `timelineItems` 不再直接卡在 panel / rows builder 中间
- 它现在更像 `timelineViewHelpers` 对外保留的旧实现接口

这使得它第一次开始接近 `timelineMeta` 当时进入最小收缩试点前的形态。

## 当前还不能直接下刀的原因

虽然它已经接近触发点，但还不能立刻删的原因是：

1. `timeline-view-helpers.js` 里的真实实现仍在
2. `view-helpers.js` 的 facade 仍然存在
3. `worldline-actions.js` 里仍混在通用 forwarder 表中
4. 它与 `worldlineEventsNewestFirst` 的边界还未显式剥离

也就是说，现在的状态更准确地说是：

- 已接近门槛
- 但还处在“可以开始最小收缩试点准备”而不是“可以直接删”

## 最小试点如果开始，第一刀应怎么选

如果后续真的让 `timelineItems` 进入试点，建议优先顺序是：

1. 先处理 `view-helpers.js` 中的 `timelineItems` facade
2. 保持 `worldline-actions.js` 暂不立即删除，只考虑是否先从通用 forwarder 表中拆出
3. 暂不同时动 `worldlineEventsNewestFirst`

原因：

1. `view-helpers.js` 更接近 `timelineMeta` 当时的空转 facade 形态
2. `worldline-actions.js` 仍承担更广的兼容暴露面
3. 排序 helper 不应和列表 source helper 混成一刀

## 当前结论

`timelineItems` 现在已经第一次进入了一个很关键的状态：

- 它不再占据 panel rows 的直接上游位置
- 它开始接近最小收缩试点的触发门槛

更准确地说：

- 现在已经不需要继续证明“它能不能成为候选”
- 下一步可以开始认真准备它的最小 facade 收缩试点

但这一步仍应保持克制：

- 先从 `view-helpers.js` facade 评估开始
- 不要把 `worldlineActions` 和 `worldlineEventsNewestFirst` 一起卷进来
