# Commit Set Draft (2026-07-12)

## 提交 A：主真源低耦合清理

目标：
- 删除已无消费者的旧 helper / 聚合壳 / facade 残影
- 保持玩法、模板表现与平台行为不变
- 为后续 Android 镜像纳管提供更干净的共享运行时源头

当前候选文件：
- `publish/settings-actions.js`
- `publish/ui/settings/view-helpers.js`
- `publish/ui/worldline/timeline-view-helpers.js`
- `docs/architecture/2026-07-12-legacy-helper-cleanup-candidates.md`

当前已落地内容：
- 从 `SETTINGS_VIEW_HELPER_METHODS` 移除：
  - `currentModelSummaryView`
  - `stage1MaterialSettingView`
  - `aiOutputLimitSectionView`
  - `settingsSummaryView`
- 从 settings view helpers 删除：
  - `currentSettingsSummaryParts()`
  - `currentSettingsSummaryText()`
  - `settingsSummaryView()`
  - `stage1MaterialSettingView()`
  - `aiOutputLimitSectionView()`
- 从 worldline timeline helper 删除：
  - `timelineItems()`

提交前门禁：
- 确认以上名称在主真源搜索中已无外部消费者
- 确认不引入模板渲染缺口

## 提交 B：Android 共享运行时镜像纳管

目标：
- 让 Android WebView 壳中 `publish/` 镜像与共享运行时的模块化结构正式对齐
- 解决当前 Git 历史未完整纳管共享镜像的问题

当前候选文件：
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/ui/settings/view-helpers.js`
- 以及按同步计划应整体纳管的目录：
  - `mobile/android-webview-shell/app/src/main/assets/publish/boot/`
  - `mobile/android-webview-shell/app/src/main/assets/publish/assets/`
  - `mobile/android-webview-shell/app/src/main/assets/publish/domain/`
  - `mobile/android-webview-shell/app/src/main/assets/publish/ui/`
- `docs/architecture/2026-07-12-android-shared-runtime-asset-governance.md`

当前证据：
- `node mobile/shell/android-webview-asset-sync-verify.js` => `ok: true`
- `node mobile/shell/android-webview-asset-sync-plan-verify.js` => `ok: true`
- `.last-asset-sync.json` 记录 copy plan 为：
  - `publish/index.html`
  - `publish/boot`
  - `publish/assets`
  - `publish/domain`
  - `publish/ui`

提交前门禁：
- 再跑一次 `node mobile/shell/android-webview-asset-sync-verify.js`
- 只按共享 `publish/` 镜像边界纳管，不零散补录单个 Android 文件
- 若发现主真源资产策略本身需要调整，则先停在主真源侧处理

## 暂不建议纳入

- `publish/platform/.artifacts/unified-platform-readiness.json`
  - 当前 diff 仅为 `generatedAt` 时间戳变化
  - 现阶段应视为提交噪音候选，除非后续需要保留新的报告时间点证据
