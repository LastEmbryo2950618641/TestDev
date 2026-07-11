# 2026-07-10 real-world ui helper boundary snapshot

## 背景

本阶段围绕现实世界模块持续进行低风险拆分，目标是在不改变玩法逻辑的前提下，将只读展示逻辑逐步从大文件和动作文件中剥离到 `publish/ui/real-world/`。

## 当前目录边界

### 1. `publish/ui/real-world/log-view-helpers.js`

职责：

- 现实世界日志列表展示
- 日志分页文本
- 用户 / 系统日志的展示去重与压缩

当前已承接：

- `displayLog`
- `logPageLabel`

### 2. `publish/ui/real-world/panel-view-helpers.js`

职责：

- 现实世界功能面板的只读文案、状态图标、按钮文案
- 与面板展示直接相关但不写状态的列表包装

当前已承接：

- `choiceIcon`
- `entryIcon`
- `statusIcon`
- `matterButtonText`
- `functionEyebrow`
- `functionTitle`
- `functionHint`
- `choicesWithMatters`

### 3. `publish/ui/real-world/map-info-view-helpers.js`

职责：

- 当前 info 节点的标题、副标题、description、facts 文本与空状态展示
- facts 列表的 key、摘要、joined text 与 item 级显示规则

当前已承接：

- `infoNode`
- `infoFacts`
- `hasInfoFacts`
- `infoTitleText`
- `infoSubtitleText`
- `infoDescriptionText`
- `infoFactsSummaryText`
- `infoFactsJoinedText`
- `infoFactsEmptyText`
- `infoEmptyStateText`
- `factKey`
- `factText`

### 4. `publish/ui/real-world/map-control-view-helpers.js`

职责：

- 地图节点控制信息、缓存控制线、info 控制线与历史列表的只读格式化

当前已承接：

- `nodeControlLine`
- `nodeControlCachedLine`
- `infoControlLine`
- `infoControlHistory`
- `nodeControlDisplayLine`
- `infoControlDisplayLine`

### 5. `publish/ui/real-world/map-interior-view-helpers.js`

职责：

- 建筑内部标题、楼层 / 房间 / 分区标签、室内摘要与空状态展示

当前已承接：

- `interiorView`
- `interiorTitle`
- `interiorZones`
- `interiorSummary`
- `selectedRoom`
- `roomResidentsLabel`
- `selectedRoomResidentsLine`
- `selectedRoomTemplateLabel`
- `roomChipTitle`
- `zoneKindLabel`
- `zoneDescriptionText`
- `zoneGridClass`
- `selectedRoomTemplateLabel`

### 6. `publish/ui/real-world/map-view-helpers.js`

职责：

- 作为 map 主题 helper 的兼容聚合入口
- 为旧入口和模板保持调用路径稳定

当前已承接：

- `infoNode`
- `infoFacts`
- `hasInfoFacts`
- `infoTitleText`
- `infoSubtitleText`
- `infoDescriptionText`
- `infoFactsSummaryText`
- `infoFactsJoinedText`
- `infoFactsEmptyText`
- `infoEmptyStateText`
- `factKey`
- `factText`
- `nodeControlLine`
- `nodeControlCachedLine`
- `infoControlLine`
- `infoControlHistory`
- `interiorView`
- `interiorTitle`
- `interiorZones`
- `interiorSummary`
- `selectedRoom`
- `roomResidentsLabel`
- `selectedRoomResidentsLine`
- `selectedRoomTemplateLabel`
- `zoneGridClass`

## 与动作层的关系

当前策略不是直接删除旧入口，而是：

1. 将真实展示实现迁移到 `publish/ui/real-world/`
2. 保留 `publish/game.js` 或 `publish/real-world-map-actions.js` 中的兼容转发入口
3. 保持调用方不变，逐步收敛旧文件职责

这样可以做到：

- 降低一次性大改带来的玩法回归风险
- 让现有模块继续可运行
- 给后续 exe / apk 共用 UI 逻辑留出稳定边界

## 当前已验证的复用路径

`map-info-view-helpers.js` 中的 facts 展示规则已经开始被多个真实读链复用，而不是只停留在地图 info 弹层：

- `publish/index.html` 中的地图 info 弹层
- `publish/real-world-prompt.js`
- `publish/inference/material-loader.js`
- `publish/real-world-map-fog.js`

这些调用点当前采用的安全模式是：

- 使用 `normalizeFacts(...)` 规范 facts 数据
- 使用 `factText(...)` 统一 facts 的文本显示规则
- 保留调用点自己的外层结构、过滤条件与 fallback 文案

这说明现实世界模块已经开始形成“展示规则一处收口，多处只读消费”的复用边界。

## 当前明确不应混入 `ui/real-world/` 的逻辑

以下内容目前不应继续塞进这些 helper 文件：

- 拖拽、缩放、画布绘制
- 地图交互状态写入
- 运行时缓存管理
- 流程编排
- 现实推演结果落库 / 持久化
- 地图迷雾写回与 revealed 状态驱动逻辑
- 路线补齐、人物地点推理、地点生成修正

这些逻辑仍应留在动作层、平台层或后续专门的交互模块中。

## 后续拆分建议

### 优先级一

继续优先从 `real-world-map-actions.js`、模板层和只读资料拼装层中抽 / 复用：

- 当前 info 节点的摘要类函数
- 控制信息的格式化与列表包装
- 与 facts 展示相关的纯只读函数
- 已存在重复 facts 文本拼装的读链

### 优先级二

沿着已验证模式继续扩张 facts 展示复用，但只挑：

- 只读 prompt 上下文拼装
- 只读资料搜索 / 汇总
- 只读地图文案输出

不直接进入：

- 运行时缓存链
- 路线推理链
- 写回 / 持久化链

### 优先级三

等 `real-world` 这一条线足够稳定后，再把同样模式复制到：

- `ui/company/`
- `ui/taobao/`
- `ui/faction/` 中风险较低的纯展示切片

## 结论

现实世界模块已经不再只是“从 `game.js` 挪一些函数”，而是开始形成真实的分层：

- `game.js` / `real-world-map-actions.js`：兼容入口与流程层
- `ui/real-world/*-view-helpers.js`：只读展示层
- 只读 prompt / 资料 / 地图文本调用点：复用展示规则的消费层

这条路径符合长期目标：

- 低耦合
- 高复用
- 玩法不变
- 便于后续桌面端与移动端共用前端逻辑

## 本轮补充：map control history row 收口（2026-07-11）

继续沿 `real-world` 的成熟样板模式推进，本轮确认了一类适合继续抽离的只读展示切口：

- 地图 info 弹层中的 control history 列表 row
- 列表 key 与文本的结构化输出
- 模板对 `line / index` 的直接拼装移除

本轮新增 helper：

- `publish/ui/real-world/map-control-view-helpers.js`
  - `infoControlHistoryRows()`

对应聚合转发：

- `publish/ui/real-world/map-view-helpers.js`
  - `infoControlHistoryRows()`

对应兼容入口：

- `publish/real-world-map-actions.js`
  - `realWorldMapInfoControlHistoryRows()`

对应 UI 消费：

- `publish/index.html`
  - real-world 地图 info 弹层的 control history 区已改为消费 `realWorldMapInfoControlHistoryRows()`

这说明：

- `real-world` 不仅适合收口 facts 文本，也适合继续把控制历史这类只读列表包装成统一 row 结构
- 它和 `faction` 一样，正在形成“helper 真实现 + 聚合转发 + 旧 actions 兼容壳 + 模板消费”的稳定样板

## 本轮补充：map info facts row 收口（2026-07-11）

继续沿 `real-world` 的成熟样板模式推进，本轮确认了另一类适合继续抽离的只读展示切口：

- 地图 info 弹层中的 facts 列表 row
- facts key 与 facts text 的结构化输出
- 模板对 `fact / index` 的直接拼装移除

本轮新增 helper：

- `publish/ui/real-world/map-info-view-helpers.js`
  - `infoFactRows()`

对应聚合转发：

- `publish/ui/real-world/map-view-helpers.js`
  - `infoFactRows()`

对应兼容入口：

- `publish/real-world-map-actions.js`
  - `realWorldMapInfoFactRows()`

对应 UI 消费：

- `publish/index.html`
  - real-world 地图 info 弹层的 facts 区已改为消费 `realWorldMapInfoFactRows()`

这说明：

- `real-world` 当前已经能把 control history、facts 这两类列表型展示统一收口为 row 结构
- 它和 `faction` 一样，正在从“若干 helper 文件”稳定演进为可持续复用的模块级展示样板

## 本轮补充：interior zone rows 收口（2026-07-11）

继续沿 `real-world` 的成熟样板推进，本轮确认了室内结构区一类适合继续抽离的只读展示切口：

- interior zone 列表 row
- zone name / kind / description / className 的结构化输出
- 模板对 zone 原始字段与 class 拼装的直接依赖移除

本轮新增 helper：

- `publish/ui/real-world/map-interior-view-helpers.js`
  - `interiorZoneRows()`

对应聚合转发：

- `publish/ui/real-world/map-view-helpers.js`
  - `interiorZoneRows()`

对应兼容入口：

- `publish/real-world-map-actions.js`
  - `realWorldMapInteriorZoneRows()`

对应 UI 消费：

- `publish/index.html`
  - real-world 室内面板中的 zone grid 已改为消费 `realWorldMapInteriorZoneRows()`

这说明：

- `real-world` 已不只是在 info 弹层里形成 list row 模式，也开始把 interior 区域推进到同一条收口路径
- 它与 `faction`、`settings` 一样，正在形成“列表型展示对象化”的稳定共性
