# Worldline Rows Contract Minimal Implementation Plan (2026-07-12)

## 目的

这份计划用于把 `rows contract` 草案推进到“可实施”的程度：

- 明确若后续真的要为 `timelineItems` 铺路
- 第一刀应改哪些文件
- 哪些文件当前绝对不应一起动
- 为什么这个顺序最能降低跨端回归风险

它不是直接实现。

## 当前判断

在现状下：

- `timelineItems` 仍是 lore / real 两条 panel rows 的共同上游
- 它的 facade 还同时存在于：
  - `timeline-view-helpers.js`
  - `view-helpers.js`
  - `worldline-actions.js`
- 但模板主路径已只消费：
  - `loreTimelinePanelView(lore)`
  - `realWorldTimelinePanelView()`

因此最合理的策略不是马上处理 `timelineItems` facade，而是先在 panel helper 内部引入更清楚的 rows builder contract。

## A. 第一刀应只改的文件

建议第一步只碰：

1. `publish/ui/worldline/timeline-panel-view-helpers.js`

理由：

1. lore / real 两条 panel 的高层 contract 已集中在这里
2. 这里最适合先抽内部 rows builder，而不改变模板消费路径
3. 只动这一处，最容易维持玩法不变

## B. 第一刀建议新增的内部边界

建议只在 `timeline-panel-view-helpers.js` 内部先引入以下非对外 helper：

### 1. `buildTimelinePanelBaseView(...)`

职责：

- 统一 `timelineTitle`
- 统一 `timeRange`
- 统一 `rows`
- 统一 `emptyText`

### 2. `buildLoreTimelineRows(lore)`

职责：

- 只负责 lore panel rows 的内部生成
- 内部仍可继续使用 `this.timelineItems(lore)`
- 但对外不再让 `loreTimelinePanelView()` 自己拼细节

### 3. `buildRealWorldTimelineRows(lore)`

职责：

- 只负责 real panel 主 rows 的内部生成
- 内部仍可继续使用 `this.timelineItems(lore)`

### 4. `buildRealWorldRecordingRows()`

职责：

- 只负责 `recordingRows`
- 将 `realWorldRecordingEvents()` 的消费与主 rows 分开

## C. 第一刀明确不该动的文件

在 rows contract 第一刀里，不建议同时修改：

1. `publish/ui/worldline/timeline-view-helpers.js`
2. `publish/ui/worldline/view-helpers.js`
3. `publish/worldline-actions.js`
4. `publish/index.html`
5. Android / desktop 镜像树中的对应 helper 文件

原因：

1. 第一刀目标只是把 panel helper 内部结构理顺
2. 若同时动 facade，容易把“rows contract 抽取”和“compat 收缩”混成一刀
3. 这样会让定位回归来源变难

## D. 第一刀完成后的成功标准

只有以下条件同时成立，才说明 rows contract 第一刀是成功的：

1. `publish/index.html` 完全不需要改
2. `loreTimelinePanelView(lore)` 与 `realWorldTimelinePanelView()` 的返回 shape 保持不变
3. lore / real timeline 的 rows 渲染结果保持一致
4. `recordingRows` 与 `recordingEmptyText` 行为不变
5. Android / desktop main / desktop minimal 能继续通过既有宿主验证链

## E. 第一刀之后才能考虑的第二步

只有在 panel helper 内部 rows builder 已稳定后，才适合进入下一步评估：

1. `timelineItems` 是否还能继续向内退化
2. `view-helpers.js` 的 `timelineItems` facade 是否变成空转壳
3. `worldline-actions.js` 是否能把 `timelineItems` 从通用 forwarder 表中拆出，或进一步收缩

也就是说：

- rows contract 第一步 = 内部结构整理
- `timelineItems` 收缩第二步 = compat 边界处理

## F. 推荐实施顺序

建议严格按这个顺序推进：

1. 先在 `timeline-panel-view-helpers.js` 内部引入 rows builder
2. 保持所有 facade 不动
3. 跑主真源检查
4. 跑 Android sync/verify
5. 跑 desktop main/minimal 重装配
6. 再决定是否进入 `timelineItems` facade 收缩评估

## 当前结论

如果后续真的开始为 `timelineItems` 铺路，最小、最稳、最符合当前架构方向的第一刀并不是删入口，而是：

- 先只改 `timeline-panel-view-helpers.js`
- 先把 lore / real rows builder 在内部拆清楚
- 让 `timelineItems` 先失去“直接等于 panel rows 上游”的位置

这样做之后，`timelineItems` 才更接近下一轮安全试点候选。
