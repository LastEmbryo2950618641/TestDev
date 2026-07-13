# 2026-07-11 Compat Forwarder Gap List

## 1. 目的

本文档用于记录当前仓库中“真实 helper 已经落地，但兼容聚合入口或旧动作入口可能尚未完全补齐转发”的位置。

这类缺口通常适合作为低风险修补点，因为它们：

- 不要求直接进入玩法主链
- 不要求重写大文件
- 更偏向结构连通性补全，而不是新增复杂逻辑

## 2. 当前已基本闭环的模块

### `real-world`

当前观察：

- `publish/ui/real-world/map-interior-view-helpers.js` 已承接室内展示 helper
- `publish/ui/real-world/map-view-helpers.js` 已提供聚合转发
- `publish/real-world-map-actions.js` 已能看到 `interiorTitle`、`interiorSummary`、`selectedRoomResidentsLine`、`selectedRoomTemplateLabel`、`zoneGridClass` 等兼容转发

当前结论：

- 该模块当前看起来已经形成“真实 helper -> 聚合入口 -> 动作入口”的基本闭环
- 后续更适合继续新增只读 helper，而不是优先补兼容缝

### `faction`

当前观察：

- `publish/ui/faction/overview-view-helpers.js` 已承接详情页和组织树相关 helper
- `publish/faction-actions.js` 已对 `roleText`、`orgNodes`、`parentName`、`affiliatedLabel`、`consistencyNotice`、`reconciliationText`、`stubNotice` 做兼容转发

当前结论：

- 当前兼容层基本齐全
- 后续应继续从详情页和总览页抽新的只读 helper，不优先补转发

## 3. 当前明确存在兼容缺口的模块

### `settings`

当前观察：

- `publish/ui/settings/view-helpers.js` 已新增：
  - `stage1MaterialIterationModeText`
  - `textProviderSummaryLabel`
  - `textModelSummaryLabel`
  - `drawProviderSummaryLabel`
  - `drawModelSummaryLabel`
  - `stage3OutputSummaryLabel`
  - `currentSettingsSummaryParts`
  - `currentSettingsSummaryText`
- 但 `publish/settings-actions.js` 当前可见转发只到：
  - `selectedDrawModelId`
  - `selectedDrawProviderId`
  - `currentDrawModels`
  - `drawModelOptionLabel`
  - `stage1MaterialMaxIterations`
  - `stage1MaterialIterationLimitText`

当前结论：

- `settings` 存在明确的“真实 helper 已落地，但旧动作入口未全量暴露”的兼容缺口
- 这是一个可以继续修补的低风险目标，但前提是：
  - 只做最小范围转发追加
  - 不顺势进入请求、保存、provider 管理主链
  - 先确认 `publish/settings-actions.js` 的编码状态，再动文件

建议后续最小修补清单：

- `stage1MaterialIterationModeText`
- `textProviderSummaryLabel`
- `textModelSummaryLabel`
- `drawProviderSummaryLabel`
- `drawModelSummaryLabel`
- `stage3OutputSummaryLabel`
- `currentSettingsSummaryParts`
- `currentSettingsSummaryText`


### `real-world` 的一个小型展示缺口

当前观察：

- `publish/real-world-map-actions.js` 当前仍调用 `realWorldMapRoomResidentsLabel(room)`
- 该方法转发到 `window.GameModules.ui.realWorld.mapViewHelpers.roomResidentsLabel.call(this, room)`
- 但 `publish/ui/real-world/map-view-helpers.js` 当前未显式提供 `roomResidentsLabel()`
- `publish/ui/real-world/map-interior-view-helpers.js` 当前只有 `selectedRoomResidentsLine()`，未单独暴露 `roomResidentsLabel(room)`

当前结论：

- 这是一个真实存在但范围很小的兼容缺口
- 适合作为后续 `real-world` 的低风险修补点
- 修补时只需要改 `ui/real-world/` 安全区文件，不必进入 `real-world-map-actions.js` 主链## 4. 当前暂不作为兼容缺口修补重点的模块

### `worldline`

原因：

- 当前重点风险不在“聚合入口少几个转发”，而在于写回链与数据组合职责仍较重
- 后续更适合继续抽极小纯 helper，不适合把注意力放在表面补齐接口上

### `save` / `loading` / `company`

原因：

- 这些模块的主风险是高副作用链、启动链或编码污染
- 当前收益不在于补几个兼容转发，而在于继续维持边界与停手纪律

## 5. 后续使用方式

如果下一轮准备补兼容转发，默认优先顺序建议是：

1. `settings` 中缺失的只读 summary helper 转发
2. 其他已确认“真实 helper 已有、旧入口只差薄转发”的模块
3. 不要为了表面完整性，强行进入 `save`、`loading`、`company` 这类高风险模块

补兼容转发前，至少先确认：

- 真实 helper 是否已经稳定存在
- 新增的只是薄转发，而不是复制逻辑
- 本次不会顺势扩大到请求、保存、持久化、启动链或宿主差异链
