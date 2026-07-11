# Desktop Shell Stub

本目录用于承载 Windows 桌面宿主壳的最小工程起点。

## 当前定位
- 这里只放宿主层起步文件与说明。
- 不承载共享玩法模块。
- 不替换当前 `publish/index.html` 浏览器入口。

## 推荐候选
1. Electron
   - 上手快
   - 文件系统与窗口能力直观
   - 包体通常更大
2. Tauri
   - 包体更轻
   - 更适合后续正式桌面分发
   - 宿主桥接设计需要更克制

## 当前建议
- 如果目标是先打通桌面验证链路：优先 Electron 草图。
- 如果目标是后续正式分发和更小体积：后续可以评估 Tauri。

## 当前目录重点文件
- `main.js`：主进程 lifecycle / window / load 草图
- `preload.js`：预加载暴露契约与 bridge assembly 草图
- `bootstrap.js`：统一 manifest / checkpoint 聚合入口
- `runtime-binding.js`：manifest 到未来运行时动作的绑定草图
- `runtime-adapter.js`：未来宿主动作适配草图
- `host-runner.js`：宿主执行顺序与 mock execution 草图
- `executor-shim.js`：main-process thin wrapper / skeleton / real-call-ready shim
- `preload-runtime-entry.js`：preload future runtime handoff 入口
- `executor-runtime-entry.js`：main-process future runtime handoff 入口
- `runtime-like-integration-verify.js`：desktop 双侧 runtime-like 集成验证入口
- `electron-like-runtime-verify.js`：desktop 更接近 Electron 生命周期的 runtime-like 验证入口
- `electron-like-adapter-verify.js`：desktop 更接近 Electron adapter 形态的协作验证入口
- `bridge/`：平台能力分区草图

## 当前最终建议
- 不再继续同层补 draft。
- 继续做更真实一层的 runtime-like / adapter-like 集成验证。
- 当前最重要的 desktop 验证入口：
  - `preload-runtime-entry.js`
  - `executor-runtime-entry.js`
  - `runtime-like-integration-verify.js`
  - `electron-like-runtime-verify.js`
  - `electron-like-adapter-verify.js`

## 推荐替换顺序
1. `preload-runtime-entry.js`
2. `executor-runtime-entry.js`
3. `bridge/*.js`
4. packaging / distribution

## 不推荐优先改动
- `publish/index.html`
- `publish/game.js`
- 其他共享玩法主链模块

- electron-window-behavior-verify.js：desktop 更接近 Electron 窗口生命周期行为的 adapter-like 验证入口

- electron-like-bridge-mapper.js：desktop 宿主 ready/window/renderer 生命周期的薄映射层

- electron-like-bridge-mapper-verify.js：desktop 薄映射层复用与行为验证入口

- unified-host-contract.js：desktop main/preload/mapper 的单一宿主语义装配层

- unified-host-contract-verify.js：desktop 单一宿主语义层验证入口

- shared-runtime-contract-entry.js：desktop unified host contract 到共享 runtime contract 的映射入口

- shared-runtime-contract-parity-verify.js：desktop/mobile 最小共享 runtime contract 对齐验证入口

- shared-storage-contract-entry.js：desktop storage bridge 到共享 storage contract 的映射入口

- shared-storage-contract-parity-verify.js：desktop/mobile 最小共享 storage contract 对齐验证入口

- shared-host-capability-contract-entry.js：desktop host bridge 到共享 host capability contract 的映射入口

- shared-host-capability-contract-parity-verify.js：desktop/mobile 最小共享 host capability contract 对齐验证入口

- shared-files-capability-contract-entry.js：desktop files bridge 到共享 files contract 的映射入口

- shared-files-capability-contract-parity-verify.js：desktop/mobile 最小共享 files contract 对齐验证入口

- platform-capability-registry-entry.js：desktop 共享 runtime/storage/host/files contract 的统一聚合入口

- platform-capability-registry-parity-verify.js：desktop/mobile 平台能力总表对齐验证入口

- shared-assets-capability-contract-entry.js：desktop assets bridge 到共享 assets contract 的映射入口

- shared-assets-capability-contract-parity-verify.js：desktop/mobile 最小共享 assets contract 对齐验证入口

- platform-capability-registry-assets-parity-verify.js：assets 接入后的平台能力总表对齐验证入口

- shared-keys-capability-contract-entry.js：desktop keys bridge 到共享 keys contract 的映射入口

- shared-keys-capability-contract-parity-verify.js：desktop/mobile 最小共享 keys contract 对齐验证入口

- platform-capability-registry-keys-parity-verify.js：keys 接入后的平台能力总表对齐验证入口

- platform-preflight-report-entry.js：desktop 平台能力总表到 preflight readiness 报告的入口

- platform-preflight-report-parity-verify.js：desktop/mobile preflight readiness 报告对齐验证入口

- platform-packaging-gap-report-entry.js：desktop preflight 到 packaging gap report 的入口

- platform-packaging-gap-report-parity-verify.js：desktop/mobile packaging gap report 对齐验证入口

- platform-execution-checklist-entry.js：desktop packaging gap report 到执行清单的入口

- platform-execution-checklist-parity-verify.js：desktop/mobile 执行清单对齐验证入口

- package.json：desktop shell 的最小 Electron 宿主配置骨架

- electron-main.js：desktop 真实 Electron 主进程入口骨架

- electron-preload.js：desktop 真实 Electron preload 入口骨架

- electron-shell-verify.js：desktop 真实 Electron 宿主骨架自检入口

- electron-api-adapter.js：desktop 可选真实 Electron API 适配层

- createElectronGuardedBootstrapPlan：desktop 真实 Electron 引导与安全回退路径描述入口

- createElectronRuntimeBranch：desktop 显式启用的真实 Electron runtime branch 描述入口

- electron-smoke-run-checklist.js：desktop 第一次受控 Electron 试跑前的最小检查清单

- electron-smoke-run-plan.js：desktop 第一次受控 Electron 试跑的执行计划入口

- electron-smoke-run-plan-verify.js：desktop 受控试跑计划验证入口

- electron-smoke-run-launcher.js：desktop 受控 Electron 试跑 launcher 入口

- electron-smoke-run-result.js：desktop 第一次真实试跑结果记录骨架

- electron-smoke-run-launcher-verify.js：desktop 试跑 launcher 与结果骨架验证入口

- docs/architecture/2026-07-11-desktop-electron-first-smoke-run-prerequisites.md：desktop 第一次真实 Electron 试跑前置说明

- docs/architecture/2026-07-11-desktop-electron-first-smoke-run-result-template.md：desktop 第一次真实 Electron 试跑结果模板

- docs/architecture/2026-07-11-desktop-electron-first-real-smoke-run-execution-guide.md：desktop 第一次真实 Electron 试跑执行说明

- 
pm run verify:shell|verify:checklist|verify:plan|verify:launcher：desktop 第一次真实试跑前的壳内验证命令

- 
pm run verify:preflight：desktop 第一次真实试跑前的一键壳内预检命令

- docs/architecture/2026-07-11-desktop-electron-first-real-smoke-run-runbook.md：desktop 第一次真实 Electron 试跑 runbook

- docs/architecture/2026-07-11-desktop-electron-first-real-smoke-run-validation.md：desktop 第一次真实试跑结果记录文件骨架

- docs/architecture/2026-07-11-desktop-electron-first-live-smoke-run-attempt.md：desktop 安装 Electron 后第一次真实试跑尝试记录骨架

- 
pm run attempt:live：desktop 安装 Electron 后的第一次真实试跑入口占位命令

- electron-live-attempt-entry-verify.js：desktop ttempt:live 当前行为校验入口

- docs/architecture/2026-07-11-desktop-electron-live-attempt-entry-note.md：desktop ttempt:live 仍是计划占位入口的说明

- 
pm run attempt:live：desktop 现在会输出显式启用的 live-attempt plan

- electron-launch-preview.js：desktop 第一次真实 Electron live launch 前的调用预览入口

- electron-launch-preview-verify.js：desktop live launch 调用预览校验入口

- electron-controlled-launch-executor.js：desktop 真正 live launch 前的受控执行器骨架

- electron-controlled-launch-executor-verify.js：desktop 受控执行器骨架校验入口

- electron-optional-live-executor.js：desktop 第一次真实 Electron window launch 前的可选 live executor

- electron-optional-live-executor-verify.js：desktop 可选 live executor 校验入口

- electron-live-attempt-result-link.js：desktop 可选 live executor 到真实试跑结果文档的接线入口

- electron-live-attempt-result-link-verify.js：desktop 真实试跑结果接线校验入口
## Electron Smoke Run
- Stable desktop verification entry: `run-electron-attempt-launcher.ps1`
- This launcher starts `node_modules/electron/dist/electron.exe` with the shell directory passed explicitly as the Electron app root.
- Do not rely on `electron.exe .` for canonical verification in this project; use the explicit app-root launcher flow instead.
- After each launcher run, verify these files:
  - `.artifacts/electron-bootstrap-entry.log`
  - `.artifacts/electron-main-entry.log`
  - `.artifacts/attempt-launch-result.json`
- A passing minimal desktop host run requires `windowCreated`, `preloadExposed`, and `rendererLoaded` all to be `true` in `attempt-launch-result.json`.

## Multi-Platform Readiness

统一汇总 `desktop` 与 `mobile` 当前对 `publish/platform/` 共享契约的 readiness 状态。

执行方式：

```bash
npm run verify:multi-platform-readiness
```

该报告用于快速查看：

- `desktop` 当前是否已接近 packaging prep
- `mobile` 当前还缺哪些 bridge / adapter
- 下一阶段优先应继续推进哪一端

## Packaging Config

桌面壳当前已提供最小 packaging config 骨架与验证入口。

执行方式：

```bash
npm run verify:packaging-config
```

当前目标：

- 固定桌面主入口为 `electron-main-bootstrap.cjs`
- 将 `publish/` 作为共享运行时内容打入桌面包
- 先以 `win portable` 作为第一阶段最小产物目标

## Packaging Toolchain Preflight

在未正式安装 builder/forge 前，先用该入口检查桌面打包工具链接入条件是否已经具备。

执行方式：

```bash
npm run verify:packaging-toolchain
```

当前作用：

- 检查是否已安装 `electron-builder` 或 `electron-forge`
- 检查当前 packaging config 是否已满足工具链接入前提
- 给出下一步工具链接入动作

## Packaging Tool Recommendation And Dry-Run Plan

在正式安装 builder/forge 前，先固定选型建议与 dry-run 路径。

执行方式：

```bash
npm run verify:packaging-tool
npm run verify:packaging-dry-run-plan
```

当前作用：

- 固化当前更适合的桌面打包工具建议
- 判断是否已经具备 dry-run 前提
- 明确下一步是安装 tool 还是直接 dry-run

## Electron Builder Dry-Run Entry

当前已提供 electron-builder 的绑定配置与 dry-run 命令骨架。

执行方式：

```bash
npm run verify:builder-dry-run-entry
```

当前作用：

- 检查 `electron-builder.config.js` 是否存在
- 检查当前是否已安装 `electron-builder`
- 明确真实 dry-run 将执行的命令

## Install Impact Audit

在真实安装 `electron-builder` 前，优先阅读安装影响审计：

- `docs/architecture/desktop-electron-builder-install-impact-audit-2026-07-11.md`

该文档用于说明：

- 安装最可能影响哪些文件
- 第一次 dry-run 最可能暴露哪些问题
- 当前为什么更适合先审计再决定是否执行真实安装

## Packaging Runbook

统一桌面打包执行顺序请优先阅读：

- `docs/architecture/desktop-packaging-runbook-2026-07-11.md`

该 runbook 会把 readiness、config、toolchain、builder dry-run 入口串成一条完整路径。

## Builder Prep Boundary

若后续要继续真实安装 `electron-builder`，先阅读：

- `docs/architecture/desktop-builder-prep-change-boundary-2026-07-11.md`

这份边界清单用于说明：

- 当前哪些 desktop 文件属于同一批 builder 前置准备改动
- 哪些共享业务改动不应混入本批次解释

## Builder Package Json Delta

若后续继续真实安装 `electron-builder`，可先阅读：

- `docs/architecture/desktop-builder-package-json-delta-note-2026-07-11.md`

该文档用于说明安装前后 `package.json` 预期会发生的最小变化。

## Builder Pre-Install Checklist

真实安装 `electron-builder` 前，建议最后阅读：

- `docs/architecture/desktop-builder-pre-install-checklist-2026-07-11.md`

该清单用于安装前最终核对配置、命令与预期状态。

## Packaging Baseline Snapshot

真实安装 `electron-builder` 前的基线结果可查看：

- `docs/architecture/desktop-packaging-baseline-snapshot-2026-07-11.md`

后续安装前后差异，优先和这组 baseline 对照。

## Builder Dry-Run Result

当前第一次真实 builder dry-run 结果可查看：

- `docs/architecture/desktop-electron-builder-first-real-dry-run-result-2026-07-11.md`

该文档用于说明这次真实 dry-run 已跨过哪些阶段、当前停在哪、下一步该排查什么。

## Builder Version Probe

若继续做 builder / Electron 版本对照排查，先阅读：

- `docs/architecture/desktop-builder-electron-version-probe-note-2026-07-11.md`

该文档用于固定当前版本组合，并限制下一轮实验范围。
