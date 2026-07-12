# Execution Readiness Note (2026-07-12)

## 当前判断

### 提交 A：可进入 staging 准备

建议 stage 候选：
- `publish/settings-actions.js`
- `publish/ui/settings/view-helpers.js`
- `publish/ui/worldline/timeline-view-helpers.js`
- `docs/architecture/2026-07-12-legacy-helper-cleanup-candidates.md`

理由：
- 变更边界集中于主真源旧 helper / facade 清理
- 已删除名称全仓搜索无残留消费者
- 不依赖 Android 镜像未跟踪目录的完整纳管

### 提交 B：暂不建议直接 staging

当前显式改动文件：
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/ui/settings/view-helpers.js`

但实际纳管缺口还包括：
- `mobile/android-webview-shell/app/src/main/assets/publish/boot/`
- `mobile/android-webview-shell/app/src/main/assets/publish/domain/`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/` 下的未跟踪资源
- `mobile/android-webview-shell/app/src/main/assets/publish/ui/` 下多组未跟踪模块化 helper 目录

原因：
- Android 镜像当前是“系统性未完整纳管”，不是“仅两处文件修改”
- 若只 stage 当前两个已修改文件，会形成半纳管状态
- 半纳管状态不符合目录规范化与多端复用的目标

## 纯噪音候选

- `publish/platform/.artifacts/unified-platform-readiness.json`
  - 当前仅 `generatedAt` 时间戳变化
  - 现阶段不建议纳入提交

## 下一步建议

1. 先将提交 A 作为独立提交完成。
2. 再单独补齐 Android 镜像纳管缺口，形成提交 B 的完整文件集合。
3. 提交 B 前继续通过：
- `node mobile/shell/android-webview-asset-sync-verify.js`
- `node mobile/shell/android-webview-asset-sync-plan-verify.js`
