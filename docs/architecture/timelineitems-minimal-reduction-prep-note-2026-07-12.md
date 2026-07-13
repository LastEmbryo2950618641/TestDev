# TimelineItems Minimal Reduction Prep Note (2026-07-12)

## 目的

这份说明用于给 `timelineItems` 的下一步做一个很明确的当前判断：

- 在 rows contract 第一刀已经完成之后
- `timelineItems` 是否已经像 `timelineMeta` 那样退化为“接近空转壳”的状态
- 如果还没有，真正卡住它的最后一层是什么

它不是实现稿。

## 当前观察结果

当前 `timelineItems` 的链路仍然是：

1. `publish/ui/worldline/timeline-view-helpers.js`
   - 真实实现
2. `publish/ui/worldline/view-helpers.js`
   - facade 转发
3. `publish/worldline-actions.js`
   - 通用 forwarder 表中的动作层桥接
4. `publish/ui/worldline/timeline-panel-view-helpers.js`
   - `buildLoreTimelineRows(lore)` 中直接调用
   - `buildRealWorldTimelineRows(lore)` 中直接调用

虽然 rows contract 第一步已经把 panel 体内联逻辑拆开，但当前 `timelineItems` 仍直接处在 rows builder 的上游。

## 与 timelineMeta 当前状态的差异

### timelineMeta 当前状态

在首轮试点成功后，`timelineMeta` 已经表现出：

1. 模板主路径不直接消费
2. panel helper 内部已有本地 helper `buildTimelineMeta(...)`
3. facade / action bridge 已接近显式兼容壳

### timelineItems 当前状态

当前仍不具备这些特征，因为：

1. lore rows builder 仍直接调用 `this.timelineItems(lore)`
2. real rows builder 仍直接调用 `this.timelineItems(lore)`
3. 它还没有退化成 panel helper 内部更低层的细节 helper
4. 它仍是 rows builder 的共同上游

因此，`timelineItems` 现在还不是“接近空转壳”的入口。

## 当前最后一层阻塞是什么

当前阻塞它进入最小收缩试点的最后一层，不再是模板消费，而是：

- `timelineItems` 还没有从 rows builder 上游位置后移

更直白地说：

- 我们已经把 panel 方法体整理干净了
- 但 rows builder 本身还没有摆脱对 `timelineItems` 的直接依赖

所以如果现在就去动 facade，只会把风险从 panel 方法体转移到 rows builder，不会真正降低耦合。

## 真正进入下一刀前还缺什么

若要让 `timelineItems` 真正接近 `timelineMeta` 当时的状态，至少还需要补一层：

1. lore rows builder 的更低层数据组装 helper
2. real rows builder 的更低层数据组装 helper
3. 明确 story/event list 的内部来源归属
4. 明确排序逻辑是否仍由 `worldlineEventsNewestFirst` 独立承担

也就是说，还需要让：

- `buildLoreTimelineRows(...)`
- `buildRealWorldTimelineRows(...)`

不再直接以 `this.timelineItems(...)` 作为唯一入口。

## 当前不建议做的事

在这一步之前，不建议：

1. 删除 `view-helpers.js` 中的 `timelineItems` facade
2. 把 `timelineItems` 从 `worldlineActions` 的 forwarder 表里拆出来
3. 直接改 Android / desktop 镜像树对应入口
4. 把 `timelineItems` 和 `worldlineEventsNewestFirst` 混成同一刀

## 当前最合理的下一步

如果继续推进，最合理的动作不应是直接收 compat，而是：

1. 继续在 `timeline-panel-view-helpers.js` 或其邻近 helper 中
2. 再下沉一层 rows source builder
3. 让 lore / real rows builder 从“直接吃 `timelineItems`”变成“吃更低层内部 helper”

只有到那一步，`timelineItems` 才会真正开始接近“可收缩 facade”。

## 当前结论

`timelineItems` 现在的状态是：

- 候选仍成立
- rows contract 第一步已经为它铺了路
- 但它还没有进入“可直接开始最小收缩”的状态

当前最后的门槛不是模板消费，而是：

- 它仍然直接占据 lore / real rows builder 的共同上游位置

只有这层位置再后移一步，`timelineItems` 的 facade 收缩才会真正变得安全。
