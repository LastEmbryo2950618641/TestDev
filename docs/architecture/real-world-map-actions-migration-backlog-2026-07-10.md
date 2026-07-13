# 2026-07-10 real-world-map-actions migration backlog

## 背景

`publish/real-world-map-actions.js` 已经从“地图逻辑总入口”开始逐步拆分。
当前目标不是一次性重写，而是继续使用兼容转发模式，把只读展示逻辑稳定下沉到 `publish/ui/real-world/`，同时保留动作层负责交互、运行时、绘制与状态写入。

## 当前已下沉到 UI 层的函数

这些函数当前已经更适合作为展示 helper 存在，并且已接入 `publish/ui/real-world/map-view-helpers.js`：

- `realWorldMapRoomResidentsLabel`
- `realWorldMapInteriorView`
- `realWorldMapInteriorTitle`
- `realWorldMapInteriorZones`
- `realWorldMapInteriorSummary`
- `realWorldMapSelectedRoom`
- `realWorldMapSelectedRoomResidentsLine`
- `realWorldMapSelectedRoomTemplateLabel`
- `realWorldMapZoneGridClass`
- `realWorldMapInfoControlLine`
- `realWorldMapInfoControlHistory`
- `realWorldMapNodeControlLine`
- `realWorldMapNodeControlCachedLine`
- `realWorldMapInfoNode`
- `realWorldMapInfoFacts`
- `realWorldMapFactText`

说明：

- 动作文件中这些函数当前应继续保留兼容转发入口。
- 其真实实现应优先维护在 `publish/ui/real-world/map-view-helpers.js`。

## 当前应保留在动作层的函数

这些函数仍然属于动作 / 宿主交互 / 状态写入 / 流程层，不适合直接下沉到 `ui` helper：

- `ensureMapView`
- `realWorldMapRuntime`
- `realWorldMapAfterPaint`
- `realWorldMapCurrentMap`
- `realWorldMapInteractionView`
- `realWorldMapGraphSourceSignature`
- `realWorldMapGraph`
- `realWorldMapGraphSignature`
- `realWorldMapHasGraphNodes`
- `renderRealWorldMapGraph`
- `realWorldMapCanvasElement`
- `realWorldMapCanvasSize`
- `realWorldMapStageElement`
- `realWorldMapStageStyle`
- `realWorldMapWrapText`
- `realWorldMapRoundRect`
- `realWorldMapShortLabel`
- `realWorldMapDrawPill`
- `drawRealWorldMapCanvas`
- `realWorldMapCanvasHitTest`
- `realWorldMapHandleCanvasTap`
- `paintRealWorldMapView`
- `queueRealWorldMapViewPaint`
- `commitRealWorldMapView`
- `resetRealWorldMapView`
- `fitRealWorldMapView`
- `_realWorldMapViewportSize`
- `ensureRealWorldMapNativeInput`
- `realWorldMapWheel`
- `realWorldMapZoomBy`
- `realWorldMapPanStart`
- `realWorldMapPanMove`
- `realWorldMapPanEnd`
- `openRealWorldMapGraph`
- `toggleRealWorldMapNode`
- `showRealWorldMapInfo`
- `closeRealWorldMapInfo`
- `showRealWorldMapInterior`
- `closeRealWorldMapInterior`
- `toggleRealWorldMapInteriorFloor`
- `openRealWorldMapRoom`
- `prepareRealWorldMapInteriorFloors`
- `backRealWorldMapInteriorTree`
- `renderRealWorldMapRoomCanvas`

## 当前属于“可观察但暂不下沉”的函数

这些函数虽然读多写少，但仍与运行时缓存、结构准备或节点派生逻辑耦合，当前阶段不建议直接下沉：

- `realWorldMapRows`
- `realWorldMapInteriorFloorOpen`
- `realWorldMapInteriorNode`
- `realWorldMapInteriorFloorSignature`
- `realWorldMapInteriorFloors`

建议：

- 只有在它们与缓存/准备逻辑进一步解耦后，再考虑拆入 `ui` 或单独的 `app/real-world/` 层。

## 推荐的下一步拆分顺序

### 优先级一

继续从 `realWorldMapRows` 周边查找只读的行数据整理逻辑，优先抽“列表包装 / 只读标签 / 文本摘要”。

### 优先级二

如果 `realWorldMapInteriorFloors` 周边逻辑需要复用，可先将“缓存与准备”逻辑拆到更明确的应用层文件，再把只读输出保留给 `ui` helper。

### 优先级三

当 `map-view-helpers.js` 继续增长后，再拆为：

- `map-info-view-helpers.js`
- `map-interior-view-helpers.js`
- `map-control-view-helpers.js`

## 结论

`publish/real-world-map-actions.js` 当前已经进入“可控减重”阶段。
下一阶段不应追求把所有函数都搬走，而应继续按照职责拆分：

- 只读展示 -> `publish/ui/real-world/`
- 运行时与状态流 -> 保留在动作层或后续 app 层
- 交互与绘制 -> 未来单独分层

这样最符合当前长期目标：

- 低耦合
- 高复用
- 玩法不变
- 便于后续桌面端与移动端共用前端结构