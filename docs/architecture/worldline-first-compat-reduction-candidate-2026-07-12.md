# Worldline First Compat Reduction Candidate Note (2026-07-12)

## 目的

这份说明用于从 `worldline` 残余 compat 入口里，选出第一批最安全的只读 facade 收缩试点候选。

它不直接执行收缩实现。

它回答的是：

- 当前哪一个入口最像“已脱离页面主消费、只剩内部 helper 链路使用”
- 为什么它比其他候选更适合做第一批试点
- 现在是否已经具备进入实现前准备的证据

## 候选范围

本轮对比以下入口：

- `timelineMeta`
- `timelineItems`
- `worldlineEventsNewestFirst`
- `realWorldRecordingEvents`

这些入口都来自此前的 `worldline` 残余 compat 清单，并被视为只读 facade 候选。

## 当前调用证据

### `timelineMeta`

当前调用位置：

- `publish/ui/worldline/view-helpers.js`
  - 作为 compat 暴露
- `publish/ui/worldline/timeline-panel-view-helpers.js`
  - `timelineRow(item)` 内部调用 `this.timelineMeta(item)`

当前未发现：

- `publish/index.html` 直接调用
- `publish/worldline-actions.js` 主体逻辑直接调用
- 其他页面模板直接调用

初步判断：

- `timelineMeta` 已经基本退化为 panel row helper 的内部依赖
- 它仍挂在 compat facade 上，但页面主消费面已不再需要知道它

### `timelineItems`

当前调用位置：

- `publish/ui/worldline/view-helpers.js`
  - 作为 compat 暴露
- `publish/ui/worldline/timeline-panel-view-helpers.js`
  - `loreTimelinePanelView(...)`
  - `realWorldTimelinePanelView()`
- `publish/ui/worldline/timeline-view-helpers.js`
  - helper 自身定义

当前未发现模板主路径直接细粒度消费，但它仍承担：

- 时间线主行数据的核心拼装职责
- lore / real world timeline panel 的直接上游输入

初步判断：

- `timelineItems` 仍是 panel 级 contract 的重要内部数据源
- 它比 `timelineMeta` 更接近“内部核心构件”，暂不适合作为最先试点

### `worldlineEventsNewestFirst`

当前调用位置：

- `publish/ui/worldline/view-helpers.js`
  - 作为 compat 暴露
- `publish/ui/worldline/timeline-view-helpers.js`
  - 用于构建 lore 时间线事件顺序
- `publish/ui/worldline/plot-view-helpers.js`
  - 用于情节事件与记录事件筛选前排序

初步判断：

- 这是多个 helper 共享的排序基础能力
- 虽然模板主路径不直接消费，但内部传播面比 `timelineMeta` 更广
- 若拿它做第一批试点，风险高于 `timelineMeta`

### `realWorldRecordingEvents`

当前调用位置：

- `publish/ui/worldline/view-helpers.js`
  - 作为 compat 暴露
- `publish/ui/worldline/timeline-panel-view-helpers.js`
  - `realWorldTimelinePanelView()` 中构建 `recordingRows`

它的上游定义来自：

- `publish/ui/worldline/plot-view-helpers.js`
  - `recordingEvents()`

初步判断：

- 主模板虽然已不再直接消费它
- 但它仍是现实记录列表 panel contract 的直接输入
- 作为第一批候选，风险也高于 `timelineMeta`

## 当前最优先候选

基于当前源码证据，第一批最安全的 worldline compat 收缩候选更接近：

- `timelineMeta`

原因：

1. 页面主模板已不再直接依赖它
2. 动作层也未直接显式消费它
3. 当前主要只在 `timeline-panel-view-helpers.js` 内部被 `timelineRow(...)` 使用
4. 它比其他候选更像“已退化为内部 helper 细节、但 compat 暴露尚未收缩”的入口

## 为什么现在还不直接改

虽然 `timelineMeta` 是最优先候选，但本轮仍不直接实现收缩，原因是：

- 需要先把试点选择本身沉淀成文档证据
- 需要避免在同一轮里同时做“候选判断”和“真实删改”，降低误判风险
- 还应先确认是否存在宿主镜像或未搜索到的间接调用依赖

## 下一步建议

若继续推进第一批小规模 compat 收缩试点，更建议按以下顺序：

1. 以 `timelineMeta` 作为第一候选
2. 先审一轮宿主镜像/构建产物里是否仍直接引用该入口
3. 若未发现额外强依赖，再设计最小收缩实现：
   - 优先让 `timeline-panel-view-helpers.js` 直接调用本地 helper，而不是经 compat facade 暴露
   - 保证不把逻辑重新散回模板或 actions

## 当前结论

在当前证据下，`worldline` 已存在一个较清晰的第一批 compat 收缩候选：

- `timelineMeta`

但当前正确动作仍是：

- 先完成候选确认与证据沉淀
- 再进入最小实现试点

而不是直接跳到大范围 compat 删除。
