# Desktop Builder Prep Change Boundary

本文档用于界定当前 `desktop` 方向在进入真实 `electron-builder` 安装前，哪些文件应视为同一批“builder 前置准备”改动范围。

目的：

- 不回退当前其他业务改动
- 不把本轮 desktop 打包准备与无关修改混在一起理解
- 为后续继续安装 `electron-builder` 提供最小安全边界

## 一、建议视为同一批的 desktop shell 文件

### 1. readiness / preflight / packaging config 主链

- `desktop/shell/multi-platform-readiness-report.js`
- `desktop/shell/desktop-packaging-preflight.js`
- `desktop/shell/desktop-packaging-preflight-verify.js`
- `desktop/shell/desktop-packaging-config.js`
- `desktop/shell/desktop-packaging-config-verify.js`
- `desktop/shell/desktop-packaging-toolchain-preflight.js`
- `desktop/shell/desktop-packaging-toolchain-preflight-verify.js`
- `desktop/shell/desktop-packaging-tool-recommendation.js`
- `desktop/shell/desktop-packaging-dry-run-plan.js`
- `desktop/shell/desktop-packaging-dry-run-plan-verify.js`
- `desktop/shell/electron-builder.config.js`
- `desktop/shell/electron-builder-dry-run-entry.js`
- `desktop/shell/electron-builder-dry-run-entry-verify.js`

### 2. CLI 入口层

- `desktop/shell/desktop-packaging-config.cli.js`
- `desktop/shell/desktop-packaging-config-verify.cli.js`
- `desktop/shell/desktop-packaging-toolchain-preflight.cli.js`
- `desktop/shell/desktop-packaging-toolchain-preflight-verify.cli.js`
- `desktop/shell/desktop-packaging-tool-recommendation.cli.js`
- `desktop/shell/desktop-packaging-dry-run-plan.cli.js`
- `desktop/shell/desktop-packaging-dry-run-plan-verify.cli.js`
- `desktop/shell/electron-builder-dry-run-entry.cli.js`
- `desktop/shell/electron-builder-dry-run-entry-verify.cli.js`

### 3. 与 runtime readiness 收口直接相关的文件

- `desktop/shell/shared-runtime-contract-entry.js`

### 4. npm 入口与桌面说明

- `desktop/shell/package.json`
- `desktop/shell/README.md`

## 二、建议视为同一批的文档文件

- `docs/architecture/multi-platform-implementation-overview.md`
- `docs/architecture/desktop-electron-builder-install-impact-audit-2026-07-11.md`
- `docs/architecture/desktop-packaging-runbook-2026-07-11.md`

## 三、当前不建议纳入本批 builder 前置准备边界的内容

### 1. 共享业务层大范围改动

例如：

- `publish/*.js`
- `publish/index.html`
- 与玩法、展示、阶段逻辑直接相关的大量历史改动

原因：

- 这些属于更大范围的长期 dirty 现场
- 不适合和 builder 安装引起的变化混在一起判断

### 2. `node_modules/` 与未来 `dist/`

原因：

- 它们属于派生结果
- 只应作为安装或 dry-run 的输出，不应作为“边界理解”主对象

## 四、按这个边界继续推进时的建议

1. 后续若继续执行 `npm install -D electron-builder`，优先只观察：
   - `desktop/shell/package.json`
   - `desktop/shell/package-lock.json`
   - `desktop/shell/node_modules/`
   - `desktop/shell/dist/`

2. 不要把 builder 安装带来的变化与 `publish/` 主链大改动混在一起解释

3. 继续 dry-run 前，先以本文件列出的边界作为“当前 desktop packaging 准备批次”的理解范围

## 五、当前结论

在不回退既有改动的前提下，当前已经可以把 desktop builder 前置准备收束为一个相对独立的小边界。

这意味着：

- 后续若继续安装 `electron-builder`，可以围绕这份边界清单理解变化
- 不必再把整个仓库的 dirty 状态都视为同一层风险
