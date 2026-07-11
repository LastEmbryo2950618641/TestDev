# Real-World Map Interior Helper Boundary（2026-07-11）

本文档记录 `real-world` 模块中室内地图展示 helper 的当前边界。

## 本次已落地

真实只读展示实现集中在：

- `publish/ui/real-world/map-interior-view-helpers.js`

兼容聚合入口继续保留：

- `publish/ui/real-world/map-view-helpers.js`

动作层兼容入口继续保留：

- `publish/real-world-map-actions.js`

## 本次新增下沉的 helper

- `interiorTitle`
- `interiorSummary`
- `selectedRoomResidentsLine`
- `selectedRoomTemplateLabel`
- `zoneGridClass`

## 这些 helper 的共同特点

- 只读取当前室内节点、楼层、房间与分区数据
- 只负责标题、摘要、标签、住户文案与分区格类名生成
- 不管理 runtime cache
- 不触发楼层预热
- 不进行 canvas 绘制
- 不写入地图交互状态

## 当前保留在动作层的逻辑

`publish/real-world-map-actions.js` 当前仍保留：

- 室内节点切换
- 楼层缓存与预热
- 房间打开 / 返回树视图
- requestAnimationFrame 调度
- canvas 绘制

## 当前结论

`real-world` 当前已经形成：

- 主题 helper 真实实现
- `mapViewHelpers` 兼容聚合转发
- `real-world-map-actions.js` 兼容动作入口

这条路径适合作为后续“展示层先抽离、动作层保兼容”的继续样板。

## 本轮补充：info interior action 收口（2026-07-11）

继续沿 `real-world` 的成熟样板推进，本轮确认了地图 info 弹层中一类适合继续抽离的只读展示切口：

- 打开室内视图按钮文案
- 按钮显示条件
- 从 info 弹层跳转到室内视图的目标节点 id

本轮新增 helper：

- `infoInteriorTargetNodeId()`
- `canOpenInfoInterior()`
- `infoInteriorActionLabel()`

对应聚合转发：

- `publish/ui/real-world/map-view-helpers.js`

对应兼容入口：

- `publish/real-world-map-actions.js`

对应 UI 消费：

- `publish/index.html` 中 real-world 地图 info 弹层的“查看建筑内部”按钮已改为消费 helper

这说明：

- `real-world` 不仅适合把列表型展示对象化，也适合继续把按钮文案与显示条件回收到展示层
- info 弹层与 interior 视图之间的最后一层展示跳转信息，已经开始具备可复用边界

## 本轮补充：interior room detail labels 收口（2026-07-11）

继续沿 `real-world` 的成熟样板推进，本轮确认了室内视图中的一类适合继续抽离的只读展示切口：

- 楼层按钮上的房间数文案
- 房间详情中的“返回楼层”按钮文案

本轮新增 helper：

- `interiorFloorRoomCountText(floor)`
- `interiorBackToFloorsLabel()`

对应聚合转发：

- `publish/ui/real-world/map-view-helpers.js`

对应兼容入口：

- `publish/real-world-map-actions.js`

对应 UI 消费：

- `publish/index.html` 中 real-world 室内树视图的 floor room count 文案
- `publish/index.html` 中 room detail 的返回按钮文案

这说明：

- `real-world` 已经从 info 弹层进一步延伸到 interior 详情区域的按钮与计数文案收口
- interior 区域正在形成更完整的展示对象化边界，而不仅是 title / summary / zone row

## 本轮补充：interior room chip rows 收口（2026-07-11）

继续沿 `real-world` 的成熟样板推进，本轮确认了室内树视图中的一类适合继续抽离的只读展示切口：

- room chip 标题
- room chip 住户行
- room chip 列表 row 结构化输出

本轮新增 helper：

- `interiorRoomRows(floor)`

对应聚合转发：

- `publish/ui/real-world/map-view-helpers.js`

对应兼容入口：

- `publish/real-world-map-actions.js`

对应 UI 消费：

- `publish/index.html` 中 real-world 室内树视图的 room chip 区已改为消费 `realWorldMapInteriorRoomRows(floor)`

这说明：

- `real-world` 的 interior 区域已经从 title / summary / zone row / button label 继续推进到 room chip row 对象化
- 室内树视图与房间详情区域的展示层边界正在变得更一致

## 本轮补充：interior floor rows 收口（2026-07-11）

继续沿 `real-world` 的成熟样板推进，本轮确认了室内树视图中的另一类适合继续抽离的只读展示切口：

- floor 行标题
- floor 行房间数文案
- floor 行展开图标
- floor 行下挂 room row 结构

本轮新增 helper：

- `interiorFloorRows()`

对应聚合转发：

- `publish/ui/real-world/map-view-helpers.js`

对应兼容入口：

- `publish/real-world-map-actions.js`

对应 UI 消费：

- `publish/index.html` 中 real-world 室内树视图的 floor card 区已改为消费 `realWorldMapInteriorFloorRows()`

这说明：

- `real-world` 的 interior 树视图已经从零散模板字段拼装，继续演进为 floor row + room row 的连续对象化结构
- interior 区域正在形成比单点 helper 更稳定的展示层样板

## 本轮补充：room detail view 收口（2026-07-11）

继续沿 `real-world` 的成熟样板推进，本轮确认了房间详情区一类适合继续抽离的只读展示切口：

- room detail 住户行
- room detail 模板标签
- room detail 是否显示模板标签的派生判断

本轮新增 helper：

- `selectedRoomDetailView()`

对应聚合转发：

- `publish/ui/real-world/map-view-helpers.js`

对应兼容入口：

- `publish/real-world-map-actions.js`

对应 UI 消费：

- `publish/index.html` 中 real-world room detail 的住户行与模板标签已改为消费 `realWorldMapSelectedRoomDetailView()`

这说明：

- `real-world` 的 interior 线已经从树视图 row 对象，继续推进到详情区 view object
- 室内树视图与房间详情区正在形成统一的展示层建模方式
