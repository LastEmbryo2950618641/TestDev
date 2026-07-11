# Desktop Packaging Baseline Snapshot

本文档记录在真实安装 `electron-builder` 前，`desktop/shell` 当前 packaging 验证链的基线结果位置。

## 一、基线文件位置

位于：

- `desktop/shell/.artifacts/baseline-packaging-config.json`
- `desktop/shell/.artifacts/baseline-packaging-toolchain.json`
- `desktop/shell/.artifacts/baseline-packaging-tool.json`
- `desktop/shell/.artifacts/baseline-packaging-dry-run-plan.json`
- `desktop/shell/.artifacts/baseline-builder-dry-run-entry.json`

## 二、当前基线含义

这些文件用于在后续真实安装 `electron-builder` 后，直接对照：

- 安装前 toolchain 是否为空
- 推荐工具是否保持 `electron-builder`
- `builderConfigPresent` 是否持续为 `true`
- `builderInstalled` 是否从 `false` 变为 `true`
- `readyForToolInstall` 是否保持为 `true`

## 三、当前关键基线结论

### 1. toolchain preflight

当前基线表明：

- `hasElectronBuilder = false`
- `hasElectronForge = false`
- `readyForToolInstall = true`

### 2. builder dry-run entry

当前基线表明：

- `recommendedTool = electron-builder`
- `builderConfigPresent = true`
- `builderInstalled = false`
- `readyForBuilderInstall = true`

## 四、后续用途

若继续执行真实 builder 安装与第一次 dry-run，应优先把安装后结果与这些基线文件比较，而不是与记忆或口头状态比较。
