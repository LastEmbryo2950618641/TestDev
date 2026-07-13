# Final Cleanup Audit (2026-07-12)

## 当前结论

1. `publish/index.html` 与 Android 资产镜像 `index.html` 的主干 contract 已经对齐到以下入口：
- `loadingScreenView()`
- `roleCardLoadingPanelView()`
- `homeLoadOverlayView()`
- `companyAttendanceView()`
- `companyPayPanelView()`
- `controlLoreCardView()`
- `realLoreCardView()`
- `pendingRealPlotSummaryView()`
- `realWorldTimelinePanelView()`
- `textProviderSectionView()`
- `textModelSectionView()`
- `drawProviderSectionView()`
- `drawModelSectionView()`

2. Android 工作树剩余主要差异：
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html` 中仍有一块超大的 `settings` 模板区域差异与少量尾部空行。
- 这说明 Android 最后真正未收束的，主要是配置模板区域，而不是多条业务主干同时未完成。

3. 关键旧桥现状：
- `loading` 相关旧 facade 大多已退出模板层，只剩 `progress-view` 内部实现。
- `company`/`worldline` 中 `currentWorkAttendance()`、`companyOrganization()`、`timelineItems()`、`timelineMeta()`、`realWorldRecordingEvents()` 等名字，当前更像模块内部 helper 或聚合层调用，不再是模板主入口。

## 可进入最终清理候选

1. `currentModelSummaryView()`
- 当前模板未消费。
- 若后续确认没有外部调用，可列入直接删除候选。

2. `loading` 线内部 helper
- 模板主入口已收束为高层 contract。
- 后续可继续判断 `progress-view` 内部 helper 是否需要保留为局部实现，还是可以进一步内联/删除。

3. `company`/`worldline` 聚合 helper
- 需要区分“模板主入口”与“仅模块内部转发”。
- 仅模块内部转发且无必要的，可作为第二批旧代码清理候选。

## 下一阶段建议

1. 先解决 Android `settings` 模板剩余差异。
2. 然后做一次“旧 helper 删除候选表”，按：
- 模板仍消费
- 仅内部自用
- 无消费者
三类分组。
3. 最后再开始真实的旧代码删除与验证。
