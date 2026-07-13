# 2026-07-11 Real-World Helper Backlog

## 1. 目的

本文档用于记录 `real-world` 模块中，后续仍适合继续下沉到 `publish/ui/real-world/` 的只读展示 helper backlog。

目标不是一次性搬空 `publish/real-world-map-actions.js`，而是继续沿着已验证路径，小步收敛：

- 真实 helper 文件承接展示逻辑
- `map-view-helpers.js` 保留聚合兼容入口
- `real-world-map-actions.js` 继续保留运行时、交互、绘制与状态写入职责

## 2. 当前已稳定落地的主题 helper

当前已明确形成主题文件：

- `map-info-view-helpers.js`
- `map-control-view-helpers.js`
- `map-interior-view-helpers.js`
- `map-view-helpers.js`（兼容聚合入口）

这意味着后续新增 helper 默认优先放进对应主题文件，而不是继续堆到 `map-view-helpers.js`。

## 3. 下一批优先 backlog

### P1. `map-info-view-helpers.js`

优先原因：

- 当前 info 节点相关展示逻辑已经有清晰落位
- 最容易继续承接只读摘要与标签拼装
- 对多端共用价值高

适合继续收敛的切口：

- info 节点的只读摘要文本
- facts 列表的二次包装与展示标签
- 只基于现有节点数据生成的说明文本

当前硬边界：

- 不进入 `showRealWorldMapInfo()` 的异步 cache 更新流程
- 不进入 revealed / pending 的状态写回
- 不进入 `requestAnimationFrame` / `setTimeout` 调度链

### P1.0 已补齐的同步只读切口（追加）

本轮已继续落地到 `map-info-view-helpers.js` 的展示 helper：

- `infoTitleText()`
- `infoSubtitleText()`
- `infoDescriptionText()`
- `infoFactsSummaryText()`
- `infoFactsJoinedText()`
- `hasInfoFacts()`
- `infoFactsEmptyText()`
- `infoEmptyStateText()`
- `factKey(fact, index)`
- `factText(fact, index)`

本轮补充收益：

- 信息弹层标题、副标题、facts 数量摘要、description 展示已不再散落在模板层
- facts 列表的空态显示、key 规则、汇总文本能力进一步收口到 UI helper
- 旧入口仍通过 `map-view-helpers.js` 与 `real-world-map-actions.js` 保持兼容
- 统一 facts 展示规则已经开始被真实读链复用，而不是只停留在 helper 文件内部

当前已接入统一 facts 展示规则的真实调用点：

- `publish/real-world-prompt.js`
- `publish/inference/material-loader.js`
- `publish/real-world-map-fog.js`
- `publish/real-world-agent-location-fill.js`

这些调用点当前采用的共同模式：

- 先 `normalizeFacts(...)`
- 再复用 `map-info-view-helpers.js` 的 `factText(...)`
- 保留各自原有的 fallback 文案与外层业务结构

仍未进入的边界：

- `showRealWorldMapInfo()` 的异步 cache 填充
- `realWorldMapInfoCache.pending` / `controlLine`
- facts 生成逻辑本身（`normalizeFacts` / `formatFact` 的来源实现）
- 地图交互、迷雾写回、路线补齐、推演结果生成

### P1.1 info 节点的可继续观察项

优先考虑但尚未直接下沉的展示项：

- info 节点 facts 列表项的进一步标签包装
- facts joined text 在更多只读读链中的复用
- info 节点 description 的只读展示包装继续统一
- 只读空态与摘要文案的进一步规范化

当前不应直接下沉的相关链路：

- `realWorldMapInfoCache.pending`
- `showRealWorldMapInfo()` 中的异步 cache 填充
- revealed 状态驱动的异步控制线刷新
- 路线补齐、人物地点推理、地图生成结果修正

建议：

- 下一轮如果继续推进 `map-info-view-helpers.js`，优先继续挑“已存在重复 facts 文本拼装”的只读读链替换
- 替换时保持统一模式：只改 facts 展示规则，不碰调用点原有业务过滤、结构拼装和 fallback 约定

### P2. `map-control-view-helpers.js`

优先原因：

- 控制信息展示已经有真实 helper 基础
- 适合继续承接控制线、缓存线、历史列表的只读格式化

适合继续收敛的切口：

- 控制历史列表的展示包装
- 控势标签的只读摘要文本
- 只读 badge / 空状态文案

当前硬边界：

- 不进入 `orgTerritory` 的写回或推演链
- 不在 helper 中引入新的缓存状态管理

### P2.0 已补齐的同步只读切口（追加）

本轮已继续落地到 `map-control-view-helpers.js` 的展示 helper：

- `nodeControlDisplayLine()`
- `infoControlDisplayLine()`
- `hasInfoControlHistory()`
- `infoControlHistoryEmptyText()`
- `infoControlHistoryKey(line, index)`
- `infoControlHistoryText(line)`

本轮补充收益：

- 控制线占位文案已经从模板层收口到 helper 层
- control history 的空态、key 与 item 文本包装已经具备兼容入口
- 地图 info 弹层已经开始消费 control history 的展示壳

仍未进入的边界：

- `orgTerritory.controlHistoryForNode()` 的结果生成逻辑
- `realWorldMapInfoCache.controlLine` 的 cache 读取语义
- territory 控制状态推演与写回链

### P2.1 control 展示的可继续观察项

优先考虑但尚未直接下沉的展示项：

- control history 列表的更细粒度 badge / 分段包装
- control line 的只读 badge / 占位文案（如 `infoControlDisplayLine()` / `nodeControlDisplayLine()`）
- 只基于已有 history 数组的同步列表包装

当前不应直接下沉的相关链路：

- `realWorldMapInfoCache.controlLine`
- `realWorldMapNodeControlCachedLine()` 的 cache 读取语义
- `orgTerritory.controlHistoryForNode()` 的结果生成逻辑
- revealed 状态驱动的条件判断与异步刷新语义

建议：

- 下一轮如果继续推进 `map-control-view-helpers.js`，优先做“已拿到 controlLine / history 之后”的只读包装，不直接继续下沉数据来源与 cache 语义。

### P3. `map-interior-view-helpers.js`

优先原因：

- 室内主题 helper 已经足够清晰
- 房间、分区、标题、住户文案这类逻辑都适合继续在这里收口

适合继续收敛的切口：

- 房间列表的只读显示标签（如 `roomChipTitle()`）
- 分区标题 / 空状态文案（如 `zoneKindLabel()` / `zoneDescriptionText()`）
- 房间模板相关的补充摘要文本

当前硬边界：

- 不进入楼层预热
- 不进入 room canvas 绘制
- 不进入 `interiorFloorCache` 与 `interiorPreparingNodeId`

## 4. 当前可观察但暂不下沉的区域

### `realWorldMapRows` 周边

当前判断：

- 这是最值得后续继续观察的区域
- 但应优先只抽“列表包装 / 标签 / 摘要文本”
- 不要把行数据准备流程、图结构依赖或视图切换逻辑一起带下沉

建议：

- 如果后续进入这里，先找行级别 `title / subtitle / badge / empty-state` 的同步只读逻辑
- 不要直接移动节点筛选、地图结构判断、行状态切换条件
