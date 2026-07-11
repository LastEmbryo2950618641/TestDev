# Multi-Platform Implementation Overview

本文档用于汇总当前 `publish/` 共享核心、`desktop/` Windows 宿主壳、`mobile/` Android 宿主壳的正式分工、现有证据和下一阶段实施顺序。
目标不是重复已有细节文档，而是为后续 AI / 人工协作提供一个统一入口，避免：

- 把平台差异重新写回 `publish/` 业务模块
- 在 `desktop/` 或 `mobile/` 目录复制玩法逻辑
- 只看单篇草稿文档，却缺少整体上下文

## 一、当前正式边界

### 1. `publish/`

作为共享 Web 核心来源，继续承担：

- 玩法逻辑
- UI 渲染逻辑
- 共用静态资源访问
- `platform.core.*` 的共享契约与浏览器默认实现

不应承担：

- Electron 主进程细节
- Android WebView / Capacitor 宿主细节
- 平台专属的打包配置与原生权限适配

### 2. `desktop/`

作为 Windows `exe` 方向宿主壳，负责：

- Electron main / preload / shell 启动链
- `platform.core.host` 桌面实现
- `platform.core.files` 桌面实现
- `platform.core.storage` 桌面桥接实现
- 桌面打包前验证与后续 packaging config

不应承担：

- 新的玩法规则
- 共享 UI 逻辑复制
- 与移动端无关的共享模块改造

### 3. `mobile/`

作为 Android `apk` 方向宿主壳，负责：

- WebView / Capacitor 宿主装配
- `platform.core.host` 移动实现
- `platform.core.files` 移动实现
- `platform.core.storage` 移动桥接实现
- Android 打包配置、权限与资源策略

不应承担：

- 新的玩法规则
- 共享 UI 逻辑复制
- 为了移动端方便而把原生差异重新散入 `publish/`

## 二、当前已落地证据

### 1. 共享平台契约已落地

当前 `publish/platform/` 已存在：

- `shared-capability-registry.js`
- `platform-preflight-report.js`
- `platform-packaging-gap-report.js`
- `platform-execution-checklist.js`
- `host/`、`files/`、`storage/`、`keys/`、`body-figure/` 子目录下的共享契约或浏览器实现

这说明：

- 平台边界不再只是口头约束
- shared / host / files / storage / assets / keys 已有统一抽象入口
- 后续桌面与移动壳接入时，应优先消费这些契约，而不是直接越过它们改业务层

### 2. Desktop 宿主壳最小链路已验证

当前已有本地强证据表明 `desktop/shell` 最小 Electron 运行链路打通：

- `windowCreated = true`
- `preloadExposed = true`
- `rendererLoaded = true`

关键证据包括：

- `desktop/shell/.artifacts/electron-smoke-launch-result.json`
- `desktop/shell/run-electron-attempt-launcher.ps1`
- `desktop/shell/desktop-packaging-preflight.js`
- `desktop/shell/desktop-packaging-preflight-verify.js`

这意味着桌面端当前重点应从“能否启动”切换到：

- packaging prep
- host adapter 完整性
- 共享契约的真实消费

### 3. Mobile 宿主壳骨架已建立

当前 `mobile/` 已有：

- `mobile/README.md`
- `mobile/docs/platform-core-mapping.md`
- `mobile/shell/assembly-example.js`
- 多个 shared contract entry 文件

这说明 Android 方向已经有正式架构落点，但仍处于：

- 骨架阶段
- 契约对接准备阶段
- 尚未进入真实宿主实现与打包阶段

## 三、当前未完成缺口

### 1. shared 契约已存在，但未全部形成统一验证入口

当前问题不是“没有抽象”，而是：

- 契约验证分散
- shared / desktop / mobile 之间的 readiness 汇总入口还不够集中
- 容易导致后续会话只看到单点文件，却不知道当前整体状态

### 2. Desktop 尚未进入正式 packaging 输出阶段

当前已完成：

- Electron 二进制可用
- 显式 app root 启动稳定
- smoke artifact 成功
- packaging preflight 已存在

当前未完成：

- 正式引入 packaging config
- 明确 exe 输出产物与资源打包策略
- 明确桌面壳 bridge 的长期维护方式

### 3. Mobile 仍未进入真实宿主集成阶段

当前已完成：

- 目录、职责、映射文档
- shared contract entry 骨架

当前未完成：

- 选定最终宿主路线（Capacitor 或自定义 WebView 壳）
- 实做 storage / files / host / assets / keys adapter
- Android packaging 与权限模型落地

### 4. 共享业务模块仍存在历史大文件与耦合面

虽然边界文档和平台层已经在建立，但共享业务层仍有：

- 历史大文件
- 展示逻辑与平台逻辑混靠
- 局部模块缺少稳定 helper / view object

因此后续仍应遵守“展示层先收口、平台层单独抽象、宿主差异不回流”的推进顺序。

## 四、建议的下一阶段实施顺序

### 阶段 A：巩固 shared 平台总入口

优先目标：让现有 shared 契约真正成为正式权威入口。

建议动作：

1. 补 shared / desktop / mobile 的统一 readiness 汇总文档或脚本入口
2. 明确哪些业务模块已经走 `platform.core.*`
3. 明确哪些旧调用仍直接绑定浏览器实现，列出迁移清单

### 阶段 B：完成 desktop packaging prep

优先目标：从“可启动”推进到“可稳定打包准备”。

建议动作：

1. 明确 Electron packaging config 选型与落点
2. 补桌面资源路径策略
3. 确认 preload / host bridge / storage bridge 的长期接口
4. 形成桌面打包前 checklist + runbook

### 阶段 C：推进 mobile 宿主真实实现

优先目标：让 Android 方向从骨架进入可实施状态。

建议动作：

1. 固化宿主路线
2. 在 `mobile/shell` 下落真实 adapter
3. 对齐 shared contract
4. 明确本地资源、文件权限、存储策略

### 阶段 D：继续缩减共享业务耦合

优先目标：降低平台接入时对玩法层的影响面。

建议动作：

1. 优先收展示 helper / view object
2. 避免新增逻辑继续堆回 `publish/` 根目录旧大文件
3. 把平台差异改造成 adapter，而不是条件分支散入

## 五、当前协作原则

1. 平台差异优先写进 `desktop/` / `mobile/` / `publish/platform/`
2. 共享玩法逻辑继续保留在 `publish/`
3. 未经验证，不要覆盖高风险中文旧文件
4. 新增实施说明优先汇总到正式文档，而不是继续散落成一次性草稿
5. 下一轮真正实施前，先看本文件，再看对应子目录 README 与专项文档

## 六、统一 Readiness 汇总入口

当前已提供可执行汇总入口：

- `desktop/shell/multi-platform-readiness-report.js`
- `desktop/shell/.artifacts/multi-platform-readiness.json`
- `desktop/shell/package.json` 中的 `npm run verify:multi-platform-readiness`

该入口统一汇总：

- `desktop` 对 shared contract 的 readiness
- `mobile` 对 shared contract 的 readiness
- 当前推荐优先推进方向

## 七、Desktop Packaging Config 入口

当前 desktop 已提供最小 packaging config 骨架与验证入口：

- `desktop/shell/desktop-packaging-config.js`
- `desktop/shell/desktop-packaging-config-verify.js`
- `desktop/shell/package.json` 中的 `npm run verify:packaging-config`

当前 packaging 第一阶段目标：

- 以 `electron-main-bootstrap.cjs` 作为主入口
- 将 `publish/` 作为共享运行时打入桌面包
- 先以 `Windows portable` 作为最小桌面产物目标

## 八、Desktop Packaging Toolchain Preflight 入口

当前 desktop 已提供 toolchain 接入前置检查入口：

- `desktop/shell/desktop-packaging-toolchain-preflight.js`
- `desktop/shell/desktop-packaging-toolchain-preflight-verify.js`
- `desktop/shell/package.json` 中的 `npm run verify:packaging-toolchain`

该入口用于：

- 判断本地是否已存在 `electron-builder` 或 `electron-forge`
- 判断当前 packaging config 是否已满足工具链接入前提
- 明确下一步是“先安装 toolchain”还是“继续 dry-run / bind config”

## 九、Desktop Packaging Tool Recommendation / Dry-Run Plan

当前 desktop 已补充工具选型建议与 dry-run 计划入口：

- `desktop/shell/desktop-packaging-tool-recommendation.js`
- `desktop/shell/desktop-packaging-dry-run-plan.js`
- `desktop/shell/desktop-packaging-dry-run-plan-verify.js`
- `desktop/shell/package.json` 中的：
  - `npm run verify:packaging-tool`
  - `npm run verify:packaging-dry-run-plan`

该入口用于：

- 固化当前更适合的桌面打包工具建议
- 判断是否已经具备 dry-run 前提
- 明确下一步是安装 tool 还是直接 dry-run

## 十、Electron Builder Binding / Dry-Run Entry

当前 desktop 已提供 electron-builder 绑定配置与 dry-run 入口：

- `desktop/shell/electron-builder.config.js`
- `desktop/shell/electron-builder-dry-run-entry.js`
- `desktop/shell/electron-builder-dry-run-entry-verify.js`
- `desktop/shell/package.json` 中的 `npm run verify:builder-dry-run-entry`

该入口用于：

- 复用 `desktop-packaging-config.js` 作为 builder 配置来源
- 固化未来真实 dry-run 将执行的命令
- 在未安装 builder 前先确认接入路径正确

## 十一、旧代码清理收尾策略（2026-07-12 补充）

当前项目目标已经明确包含：在 shared runtime / desktop exe / android apk / web index.html 目标基本达成后，再进行旧代码清理与目录收尾。

执行原则：

1. 先稳定多端真实链路，再做旧代码正式清理
2. 旧代码清理必须区分：
   - 仍承担真实运行职责的共享主链
   - 兼容壳 / legacy 入口
   - 临时脚本 / 一次性修复脚本
   - 证据目录 / 产物目录
3. 不要在多端主链尚未稳定时，大面积删除 `publish/` 旧文件
4. 不要把 `desktop/shell/dist*`、`desktop/shell/.artifacts/`、`mobile/android-webview-shell/app/build/`、`mobile/android-webview-shell/.artifacts/` 当成普通垃圾目录直接清掉

当前清理分级入口：

- `docs/architecture/legacy-cleanup-triage-2026-07-12.md`

推荐执行顺序：

1. 第一批：只处理根目录 `tmp_*` 临时脚本
2. 第二批：复查 `.bak` / compatibility / legacy 入口是否仍被引用
3. 第三批：在多端验证进一步稳定后，再收尾退场旧实现与历史副本

停手边界：

- 任何可能影响 `publish/index.html`、desktop renderer、Android WebView 共享运行时入口的文件，都不得在未验证引用前删除
- 任何仍被 final handoff / artifact / execution report 消费的证据文件或目录，都暂不删除
