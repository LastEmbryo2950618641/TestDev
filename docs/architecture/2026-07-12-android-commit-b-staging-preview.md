# Android Commit B Staging Preview (2026-07-12)

## 目标

将 Android WebView 壳中的共享 `publish/` 运行时镜像补齐到可入库状态，避免继续保留“镜像已存在但 Git 历史未完整纳管”的半完成结构。

## 当前分组缺口

1. `boot/`
- 工作树文件数：6
- Git tracked：0
- 现状：整目录存在但完全未入库
- 处理建议：整目录纳管

2. `domain/`
- 工作树文件数：17
- Git tracked：0
- 现状：整目录存在但完全未入库
- 处理建议：整目录纳管

3. `ui/`
- 工作树文件数：40
- Git tracked：2
- 未跟踪项：16 组/项
- 现状：共享 `publish/ui/` 的模块化结构大部分尚未入库
- 处理建议：按共享 `publish/ui/` 完整镜像纳管，不零散补单个 helper

4. `assets/`
- 工作树文件数：90
- Git tracked：75
- 未跟踪项：10
- 现状：大部分已入库，剩余为缺口补齐
- 处理建议：仅补齐未跟踪镜像项

## 当前显式修改

- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/ui/settings/view-helpers.js`

说明：
- 这两个文件属于 Commit B 的一部分
- 但不能脱离上述目录/缺口补齐动作单独提交

## 预演后的 staging 原则

1. 可纳入 Commit B 的路径组：
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/boot/`
- `mobile/android-webview-shell/app/src/main/assets/publish/domain/`
- `mobile/android-webview-shell/app/src/main/assets/publish/ui/`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/all`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/figure_desc.txt`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/tmp.txt`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/tmp2.txt`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/tmp3`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/body-figures/player-self-1783391372121/`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/body-figures/rel-ai-242269-1783673555009/`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/body-figures/rel-ai-247463-1783358656228/`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/body-figures/rel-ai-247528-1783275261314/`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/body-figures/rel-ai-247528-1783276182507/`
- `docs/architecture/2026-07-12-android-shared-runtime-asset-governance.md`
- `docs/architecture/2026-07-12-android-commit-b-completion-set.md`
- `docs/architecture/2026-07-12-execution-readiness-note.md`
- `docs/architecture/2026-07-12-commit-set-draft.md`

2. 当前不应纳入：
- `publish/platform/.artifacts/unified-platform-readiness.json`
- 与 Android 镜像纳管无关的大量历史草稿文档

## 提交前继续保留的门禁

- `node mobile/shell/android-webview-asset-sync-verify.js`
- `node mobile/shell/android-webview-asset-sync-plan-verify.js`
