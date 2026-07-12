# Compat Callsite Audit (2026-07-12)

## 目的

这份清单用于记录当前 compat facade 的真实调用面证据，服务于后续旧入口清理决策。

它不负责决定“现在就删哪个 compat”，而是回答：

- 当前哪些 compat 入口仍有活跃源码依赖
- 哪些依赖来自页面模板、动作入口或宿主产物
- 哪些模块距离 compat 清理仍然明显不足

本清单与 `compat-cleanup-gate-checklist-2026-07-12.md` 配合使用：

- gate checklist 定义“删除 compat 需要满足什么条件”
- 本文档记录“当前实际证据是什么”

## 审计范围

本轮审计覆盖：

- `publish/ui/company/view-helpers.js`
- `publish/ui/event/view-helpers.js`
- `publish/ui/worldline/view-helpers.js`

说明：

- 以当前工作树中的源码与宿主产物为证据
- 构建产物不会自动成为权威源码，但它能证明 compat 路径仍在宿主分发链中出现

## company compat 调用证据

### 活跃源码依赖

已确认以下源码直接依赖 company compat 入口：

- `publish/company-actions.js`
  - 通过 `window.GameModules.ui.company.viewHelpers[name].call(...)` 做动态分发
- `publish/company-attendance-actions.js`
  - 直接调用 `currentWorkAttendance()` compat 路径

这说明：

- company compat 不只是历史遗留别名
- 它当前仍是源码动作层的真实调用入口

### 宿主/产物依赖证据

已观察到以下宿主产物中仍包含 company compat 路径：

- `desktop/shell/dist/win-unpacked/resources/app/publish/company-actions.js`
- `desktop/shell/dist/win-unpacked/resources/app/publish/company-attendance-actions.js`
- `mobile/android-webview-shell/app/build/intermediates/assets/debug/mergeDebugAssets/publish/ui/company/view-helpers.js`

结论：

- company 当前绝不适合删除 compat facade
- 即使源码未来迁移完成，也仍需考虑宿主装配链和分发镜像同步

## event compat 调用证据

### 活跃源码依赖

已确认以下源码直接依赖 event compat 入口：

- `publish/event-actions.js`
  - 通过 `window.GameModules.ui.event.viewHelpers[name].call(...)` 做动态分发
- `publish/index.html`
  - 直接调用：
    - `eventPanelView()`
    - `currentEventList()`
    - `selectedEventDetailView()`
    - `selectedEventEmptyText()`

这说明：

- event compat 当前仍被页面模板和动作层共同依赖
- 还没有进入“只剩文档引用”的阶段

### 宿主/产物依赖证据

已观察到以下宿主产物中仍包含 event compat 路径：

- `desktop/shell/dist-minimal/win-unpacked/resources/app/publish/index.html`

结论：

- event 当前也不适合删除 compat facade
- 若后续要清理，至少要先完成页面模板调用链审计和宿主同步策略确认

## worldline compat 调用证据

### 活跃源码依赖

已确认以下源码直接依赖 worldline compat 入口：

- `publish/index.html`
  - 直接调用：
    - `timelineItems(lore)`
    - `timelineMeta(item)`
    - `loreTimelinePanelView(lore)`
    - `realWorldTimelinePanelView()`

worldline 当前未像 company / event 一样明显经由单个 actions 文件统一分发，但页面模板本身就已经构成了活跃调用面。

### 宿主/产物依赖证据

已观察到以下宿主产物中仍包含 worldline compat 路径：

- `mobile/android-webview-shell/app/build/intermediates/assets/debug/mergeDebugAssets/publish/ui/worldline/view-helpers.js`
- `mobile/android-webview-shell/app/build/intermediates/assets/debug/mergeDebugAssets/publish/index.html`

结论：

- worldline 虽然结构成熟度高，但 compat 仍然有页面调用面和宿主产物证据
- 它应被视为“成熟样板模块”，不是“第一批可删 compat 模块”

## 当前统一结论

基于本轮调用证据，当前三个模块都不满足 compat 删除前提：

- company：动作层和宿主产物都仍显著依赖 compat
- event：页面模板和动作层都仍显著依赖 compat
- worldline：页面模板和宿主产物都仍显著依赖 compat

因此：

- 当前没有任何一个模块可以直接进入 compat 删除阶段
- 下一步更适合做“调用链迁移准备”，而不是执行 compat 删除

## 建议的下一阶段动作

### 1. 继续积累源码级调用链证据

优先为以下模块补更明确的调用面清单：

- company
- event
- worldline

目标是区分：

- 动作层调用
- 页面模板调用
- 宿主镜像/产物调用
- 文档引用

### 2. 先做迁移准备，再做 compat 清理

真正进入 compat 清理前，建议先完成：

- 页面模板是否能改用新 helper 聚合面的审计
- 动作层是否能去动态分发的计划
- 宿主构建产物的同步策略确认

### 3. 不把宿主产物当作第一手源码，但也不能忽略

宿主产物中的 compat 路径不等于源码还必须原样保留，但它明确提示：

- 当前分发链仍会消费这些入口
- 清理 compat 时必须把宿主同步考虑进验证范围
