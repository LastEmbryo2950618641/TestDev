# Legacy Helper Cleanup Candidates (2026-07-12)

## 分类规则

1. 模板仍消费
- 仍被 `publish/index.html` 或 Android 资产镜像 `index.html` 直接引用。
- 当前不能删除，只能继续作为高层 contract 或等待模板进一步收口。

2. 代码层仍消费
- 模板不直接引用。
- 但仍通过 action bridge、子 helper、兼容聚合层或同模块调用链暴露给外部。
- 当前不能直接删除，只能继续评估是否值得收口或改为内部实现。

3. 无消费者
- 模板无直连，代码层也无外部调用。
- 可进入真实删除候选。

## 当前分类

### 模板仍消费
- `publish/loading-actions.js::homeLoadOverlayView`
- `publish/loading-actions.js::loadingScreenView`
- `publish/loading-actions.js::roleCardLoadingPanelView`
- `publish/ui/company/view-helpers.js::companyAttendanceView`
- `publish/ui/company/view-helpers.js::companyPayPanelView`
- `publish/ui/company/view-helpers.js::companyHeaderView`
- `publish/ui/company/view-helpers.js::companyEmploymentRecordSectionView`
- `publish/ui/worldline/view-helpers.js::controlLoreCardView`
- `publish/ui/worldline/view-helpers.js::realLoreCardView`
- `publish/ui/worldline/view-helpers.js::pendingRealPlotSummaryView`
- `publish/ui/worldline/view-helpers.js::realWorldTimelinePanelView`
- `publish/ui/settings/view-helpers.js::textProviderSectionView`
- `publish/ui/settings/view-helpers.js::textModelSectionView`
- `publish/ui/settings/view-helpers.js::drawProviderSectionView`
- `publish/ui/settings/view-helpers.js::drawModelSectionView`

### 代码层仍消费
- `publish/ui/company/view-helpers.js::currentWorkAttendance`
  说明：仍被 `publish/company-actions.js`、`publish/company-attendance-actions.js`、`publish/game.js`、`publish/skills-definitions-apps.js` 与 company 子 helper 调用，当前必须保留。
- `publish/ui/company/view-helpers.js::companyOrganization`
  说明：仍被 `publish/company-actions.js`、`publish/game.js` 与 company 子 helper 调用，当前必须保留。
- `publish/ui/company/view-helpers.js::companyPayPreviewView`
  说明：被 `company-contract-view-helpers.js` 调用，当前仍是 contract 组装链的一部分。
- `publish/ui/company/view-helpers.js::companyContractSectionView`
  说明：被 `company-contract-view-helpers.js` 调用，当前仍是 contract 组装链的一部分。
- `publish/ui/worldline/timeline-panel-view-helpers.js::timelineMeta`
  说明：被同文件 `timelineRow()` / `realWorldTimelineRow()` 使用，不属于可直接删除项。
- `publish/ui/worldline/view-helpers.js::selectedPlotEvents`
  说明：转发到 `plot-view-helpers.js`，仍在兼容聚合层对外暴露。
- `publish/ui/worldline/view-helpers.js::recordingEvents`
  说明：转发到 `plot-view-helpers.js`，仍被 `timeline-panel-view-helpers.js` 使用。
- `publish/ui/worldline/view-helpers.js::worldlineEventsNewestFirst`
  说明：转发到 `timeline-view-helpers.js`，仍被 plot/timeline helper 共同使用。
- Android 镜像对应的同名 helper 先按相同结论处理。

### 已完成的公开 surface 收口
- `publish/settings-actions.js::stage1MaterialSettingView`
- `publish/settings-actions.js::aiOutputLimitSectionView`
  说明：两者除 `settings-actions.js` 自动 facade 外已无其它消费者，现已从公开 helper 白名单移除，不再作为对外 surface 暴露。

### 已完成的旧 helper 删除
- `publish/ui/settings/view-helpers.js::currentModelSummaryView`
- `mobile/android-webview-shell/app/src/main/assets/publish/ui/settings/view-helpers.js::currentModelSummaryView`
  说明：该 helper 已确认无模板与代码层消费者，且已在已提交改动中删除。
- `publish/ui/worldline/timeline-view-helpers.js::timelineItems`
  说明：已确认无模板与代码层消费者，现已从主真源 worldline timeline helper 删除。

## 已核清的误判

1. `currentWorkAttendance()` 与 `companyOrganization()` 不是“仅内部自用空壳”，而是仍有真实业务消费者。
2. `companyHeaderView()` 与 `companyEmploymentRecordSectionView()` 仍被模板直接引用。
3. `companyPayPreviewView()` 与 `companyContractSectionView()` 仍在 contract 组装链中使用。
4. 文档里先前出现的 `realWorldRecordingEvents()` 目前在代码中已无对应 helper 名称，属于过时候选，不再继续列出。
5. `stage1MaterialSettingView()` 与 `aiOutputLimitSectionView()` 已确认无模板或代码消费者，并已从 `publish/settings-actions.js` 的公开 facade 白名单中移除。
6. `timelineItems()` 已确认无模板与代码层消费者，现已从主真源 `publish/ui/worldline/timeline-view-helpers.js` 删除。

## Android 资产备注

1. 当前工作树中的 `mobile/android-webview-shell/app/src/main/assets/publish/index.html` 已与 `publish/index.html` 对齐。
2. 但它相对 `HEAD` 仍是大体量 diff，说明这更像“尚未提交的 Android 资产镜像收口”，而不是仅尾行差异。
3. Android 模块化镜像目录当前仍有一整批未跟踪文件；`HEAD` 里并未完整纳管这些拆分后的 helper 文件，因此后续应按“系统性镜像纳管”处理，而不是零散补录单个文件。
4. 该资产纳管动作需与旧 helper 删除分开处理，避免将业务清理与镜像入库风险混在同一提交里。
