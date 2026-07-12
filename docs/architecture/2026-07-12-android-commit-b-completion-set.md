# Android Commit B Completion Set (2026-07-12)

## 当前判断

Android 共享运行时镜像纳管不能只提交已修改的两个文件。
当前最小完整集合应按目录/分组补齐，否则会形成半纳管状态。

## 必须整体补齐的分组

1. `mobile/android-webview-shell/app/src/main/assets/publish/boot/`
- 当前 tracked 数量：0
- 工作树中整目录存在
- 应按完整镜像目录纳管

2. `mobile/android-webview-shell/app/src/main/assets/publish/domain/`
- 当前 tracked 数量：0
- 工作树中整目录存在
- 应按完整镜像目录纳管

3. `mobile/android-webview-shell/app/src/main/assets/publish/ui/`
- 当前 tracked 数量：2
- 仅已跟踪：
  - `ui/settings/view-helpers.js`
  - `ui/worldline/timeline-panel-view-helpers.js`
- 其余模块化 UI helper / README / 子目录已在工作树存在
- 应按共享 `publish/ui/` 镜像的完整模块化结构补齐纳管

## 需要补齐未跟踪项的分组

4. `mobile/android-webview-shell/app/src/main/assets/publish/assets/`
- 当前 tracked 数量：75
- 现状不是“全目录未纳管”，而是“已有大部分，缺少部分新增镜像项”
- 当前未跟踪项主要包括：
  - 根文件：`all`、`figure_desc.txt`、`tmp.txt`、`tmp2.txt`、`tmp3`
  - `body-figures/` 下若干已被索引引用的生成目录
- 建议按未跟踪缺口补齐，而不是整目录重提

## 已修改但不能单独提交的文件

- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/ui/settings/view-helpers.js`

说明：
- 这两个文件本身是有效改动
- 但若脱离上述目录补齐动作单独提交，会让 Android 镜像历史继续处于不完整状态

## 提交前门禁

1. 继续通过：
- `node mobile/shell/android-webview-asset-sync-verify.js`
- `node mobile/shell/android-webview-asset-sync-plan-verify.js`

2. 保持以下原则：
- `boot/`、`domain/`、`ui/` 作为目录级镜像集合处理
- `assets/` 作为“补齐未跟踪镜像项”处理
- 不将 `publish/platform/.artifacts/unified-platform-readiness.json` 这类时间戳噪音纳入
