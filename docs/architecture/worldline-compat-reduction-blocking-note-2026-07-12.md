# Worldline Compat Reduction Candidate Blocking Note (2026-07-12)

## 目的

这份说明用于记录 `timelineMeta` 作为 worldline 首个 compat 收缩候选时，当前发现的真实阻塞证据。

此前的候选说明已经表明：

- 在主源码视角下，`timelineMeta` 是第一批最安全的只读 facade 候选之一

但在进入实现前最终核查时，发现还有不能忽略的多端宿主依赖。

## 当前新增证据

本轮核查覆盖了：

- `publish/`
- `desktop/`
- `mobile/`

针对 `timelineMeta` 的直接引用，发现以下事实：

### 主源码侧

当前主源码中：

- `publish/index.html`
  - 已不再直接消费 `timelineMeta(item)`
- `publish/ui/worldline/view-helpers.js`
  - 仍暴露 compat 入口
- `publish/ui/worldline/timeline-panel-view-helpers.js`
  - `timelineRow(item)` 内部仍调用 `this.timelineMeta(item)`

这部分证据与此前候选判断一致：

- 主源码页面层已基本脱离对 `timelineMeta` 的直接依赖
- 它更像内部 helper 细节

### 桌面宿主镜像侧

但在桌面宿主产物中，仍发现直接页面依赖：

- `desktop/shell/dist-minimal/win-unpacked/resources/app/publish/index.html`
  - 仍直接使用 `$store.game.timelineMeta(item)`
- `desktop/shell/dist/win-unpacked/resources/app/publish/index.html`
  - 仍直接使用 `$store.game.timelineMeta(item)`

同时还能看到旧版 worldline helper / actions 产物中保留相关实现：

- `desktop/shell/dist/win-unpacked/resources/app/publish/worldline-actions.js`
- `desktop/shell/dist/win-unpacked/resources/app/publish/ui/worldline/view-helpers.js`

### 移动宿主镜像侧

在 Android WebView 壳相关目录中，也仍发现直接页面依赖：

- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
  - 仍直接使用 `$store.game.timelineMeta(item)`
- `mobile/android-webview-shell/app/build/intermediates/assets/debug/mergeDebugAssets/publish/index.html`
  - 仍直接使用 `$store.game.timelineMeta(item)`

同时相关宿主资产里的 worldline helper 也仍保留该入口：

- `mobile/android-webview-shell/app/src/main/assets/publish/ui/worldline/view-helpers.js`
- `mobile/android-webview-shell/app/build/intermediates/assets/debug/mergeDebugAssets/publish/ui/worldline/view-helpers.js`

## 当前阻塞结论

这意味着：

- `timelineMeta` 在主源码层面看起来接近可收缩
- 但在桌面 / 移动宿主镜像链路中，仍存在页面模板对它的直接依赖

因此当前不能把它视为“已经具备立即实现收缩条件”的候选。

更准确的说法应是：

- `timelineMeta` 仍然是主源码视角下最优先的只读 facade 候选
- 但它尚未通过宿主镜像一致性核查
- 当前阻塞不是主源码结构问题，而是多端装配链尚未同步到同一消费模式

## 对总目标的意义

这条阻塞证据非常重要，因为它说明：

- 不能只根据 `publish/` 主源码判断 compat 是否可以开始收缩
- 多端复用目标会把宿主镜像里的旧消费路径重新变成关键风险
- 若忽略这层证据，后续任何“看似安全”的 compat 收缩都可能只在主源码安全，在宿主侧回归

## 当前正确动作

在这一阻塞存在时，更合理的下一步不是直接改 `timelineMeta`，而是二选一：

1. 先规划宿主镜像同步策略
   - 明确这些宿主目录何时、如何从主源码重新装配
   - 确认旧镜像是否只是过期产物，还是当前真实分发输入

2. 先选择一个不受宿主页面直连影响的候选入口
   - 重新比较其他 facade 是否在宿主镜像中同样被直接模板消费
   - 只有在多端链路都不再直接依赖时，才进入最小实现试点

## 当前结论

`timelineMeta` 目前仍是一个“主源码视角下很强的候选”，但它现在被以下事实阻塞：

- 桌面宿主镜像 `index.html` 仍直接调用它
- 移动宿主镜像 `index.html` 仍直接调用它

因此本轮结论不是“开始实现”，而是：

- 暂缓把 `timelineMeta` 作为第一刀实际收缩目标
- 先补宿主链路同步判断，或改选一个宿主侧也已脱离直接依赖的候选
