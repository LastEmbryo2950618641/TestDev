# Legacy Helper Cleanup Candidates (2026-07-12)

## 分类规则

1. 模板仍消费
- 仍被 `publish/index.html` 或 Android 资产镜像 `index.html` 直接引用。
- 当前不能删除，只能继续作为高层 contract 或等待模板进一步收口。

2. 仅内部自用
- 模板不直接引用。
- 代码层无跨文件外部消费者，主要作为本模块内部聚合、兼容层或局部实现细节存在。
- 可作为第二阶段收缩候选，需结合模块内部可读性判断是否保留。

3. 无消费者
- 模板无直连，代码层也无外部调用。
- 可进入第一批真实删除候选。

## 当前分类

### 模板仍消费
- `publish/loading-actions.js::homeLoadOverlayView`
- `publish/loading-actions.js::loadingScreenView`
- `publish/loading-actions.js::roleCardLoadingPanelView`
- `publish/ui/company/view-helpers.js::companyAttendanceView`
- `publish/ui/company/view-helpers.js::companyPayPanelView`
- `publish/ui/worldline/view-helpers.js::controlLoreCardView`
- `publish/ui/worldline/view-helpers.js::realLoreCardView`
- `publish/ui/worldline/view-helpers.js::pendingRealPlotSummaryView`
- `publish/ui/worldline/view-helpers.js::realWorldTimelinePanelView`
- `publish/ui/settings/view-helpers.js::textProviderSectionView`
- `publish/ui/settings/view-helpers.js::textModelSectionView`
- `publish/ui/settings/view-helpers.js::drawProviderSectionView`
- `publish/ui/settings/view-helpers.js::drawModelSectionView`

### 仅内部自用
- `publish/ui/company/view-helpers.js::currentWorkAttendance`
- `publish/ui/company/view-helpers.js::companyOrganization`
- `publish/ui/worldline/view-helpers.js::timelineItems`
- `publish/ui/worldline/view-helpers.js::timelineMeta`
- `publish/ui/worldline/view-helpers.js::realWorldRecordingEvents`
- Android 镜像对应的同名 helper 也属于这一类

### 无消费者
- `mobile/android-webview-shell/app/src/main/assets/publish/ui/settings/view-helpers.js::currentModelSummaryView`
  说明：当前模板未消费，代码层排除自身文件后也未发现外部调用，可作为第一批直接删除候选。

## 下一步建议

1. 优先验证并删除 `currentModelSummaryView()` 这类最明确无消费者项。
2. 然后再评估 `currentWorkAttendance()`、`companyOrganization()`、`timelineItems()` 等仅内部自用聚合壳是否值得继续保留。
3. Android `settings` 模板区域仍是最后一个大块收尾点，建议与旧 helper 删除分开处理，避免混淆风险。
