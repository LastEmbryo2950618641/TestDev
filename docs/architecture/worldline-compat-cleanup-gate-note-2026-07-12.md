# Worldline Compat Cleanup Gate Note (2026-07-12)

## 目的

这份说明用于回答一个更接近“何时能删旧代码”的问题：

- 在 `timelineMeta` 最小试点已经完成主真源、Android、desktop main、desktop minimal 四路验证之后
- `worldline` 残余 compat 入口里，哪些已经进入下一批收缩候选
- 哪些入口仍然承担模板直接消费或 UI 写入职责，当前不能清理
- 真正进入删除/清理阶段前，还必须补哪些 gate

它不是直接删除脚本。

## 当前前提

当前已具备的证据包括：

1. `timelineMeta` 已完成最小主真源收口
2. Android 宿主镜像已通过同步链验证
3. desktop main 与 minimal 已完成真实重装配验证
4. `timelineMeta` 相关收口改动已经提交并 push：`44371448`

因此，这份说明的重点不再是“能不能试”，而是“哪些旧 compat 代码已经接近清理门槛”。

## A. 当前仍不能清理的入口

以下入口在当前源码中仍被 `publish/index.html` 直接消费，或者直接承担 UI 写入职责，不应进入当前批次清理：

### 1. 展开/选择类写入入口

- `selectWorldlineDebugSection`
- `toggleWorldline`
- `selectRealWorldPlot`

原因：

1. 它们仍承担界面状态写入
2. 贸然删除只会把写入逻辑重新散回模板
3. 这违背当前“降低耦合”的目标

### 2. 直接模板读取入口

- `controlWorldLores`
- `isWorldlineOpen`
- `isWorldlineDebugSection`
- `realWorldLore`
- `realWorldTag`
- `realWorldSummarizedPlots`
- `realWorldSelectedPlot`
- `realWorldPlotEvents`

原因：

1. 这些入口仍直接或紧邻模板展示路径
2. 它们尚未全部被更高层 panel/view contract 包住
3. 若现在清理，风险会高于收益

## B. 当前更适合进入下一批收缩候选的入口

在 `timelineMeta` 试点完成后，当前更适合继续推进的只读入口是：

1. `timelineItems`
2. `worldlineEventsNewestFirst`
3. `realWorldRecordingEvents`

说明：

- `timelineMeta` 已完成一轮最小收口试点，不再适合作为“下一批候选”重复讨论
- 下一步应从与它相邻、但传播面略高的只读入口里继续挑选

### 1. `timelineItems`

当前落点：

- `publish/ui/worldline/timeline-view-helpers.js`
- `publish/ui/worldline/timeline-panel-view-helpers.js`
- `publish/worldline-actions.js`

当前判断：

1. 主模板已不再细粒度直接消费它
2. 它现在更接近 panel rows 的内部上游数据源
3. 但它比 `timelineMeta` 更核心，删除前必须先确认 panel contract 是否足够稳定

### 2. `worldlineEventsNewestFirst`

当前落点：

- `publish/ui/worldline/timeline-view-helpers.js`
- `publish/ui/worldline/plot-view-helpers.js`
- `publish/worldline-actions.js`

当前判断：

1. 它仍是多个 helper 共享的排序基础能力
2. 传播面比 `timelineMeta` 更广
3. 更适合做“helper 内部化/显式归属化”，而不是直接删除

### 3. `realWorldRecordingEvents`

当前落点：

- `publish/ui/worldline/plot-view-helpers.js`
- `publish/ui/worldline/timeline-panel-view-helpers.js`
- `publish/worldline-actions.js`

当前判断：

1. 已不再像旧阶段那样由模板细粒度直接消费
2. 现在更多是现实记录 panel contract 的输入源
3. 若后续 real world timeline panel contract 更稳定，它会成为很自然的下一批候选

## C. 下一批收缩前必须通过的 gate

即便这些入口已经像候选，也不能直接删。进入真实清理前，至少还要同时满足以下 gate：

### 1. 主真源消费收敛 gate

必须证明：

1. `publish/index.html` 不再直接细粒度消费该入口
2. 相关 UI 展示已由更高层 panel/view contract 承接
3. 删除 compat facade 后不会把逻辑重新散回模板

### 2. 动作层显式桥接 gate

必须证明：

1. `publish/worldline-actions.js` 中该入口若仍保留，只是显式兼容桥
2. 不再混在大批量无差别 forwarder 表里
3. 或者已经可以完全去掉 action facade 而不影响玩法路径

### 3. Android 同步 gate

必须重复执行：

- `node mobile/shell/android-webview-asset-sync.js`
- `node mobile/shell/android-webview-asset-sync-verify.js`

并确认：

1. `parityOk` 为 `true`
2. 镜像树中不需要手改 gameplay/runtime 逻辑
3. 若镜像差异过大，应先判断是否混入 unrelated 改动

### 4. Desktop main / minimal 重装配 gate

必须重复执行：

- main builder dir packaging
- minimal builder dir packaging

并确认：

1. `dist` 与 `dist-minimal` 都能完成真实刷新
2. 新结构能自然进入 packaged `publish/`
3. 产物里不再残留旧 compat 路径

### 5. 提交边界 gate

必须确认：

1. 同步镜像文件本身边界干净
2. 不把 unrelated 的 Android `index.html` 或其他历史脏差卷进提交
3. 不把 `node_modules/`、`.artifacts/`、build 中间产物当作源码提交

## D. 当前不建议做的事

1. 现在就批量删除 `worldlineViewHelperForwarders`
2. 因为 `timelineMeta` 试点成功，就假设其他只读入口都可直接清理
3. 把 Android 镜像树里任何大块 `index.html` 差异都当成“必须同步提交”
4. 把 desktop 打包产物本身当主真源编辑

## E. 当前最合理的后续顺序

建议按以下顺序推进：

1. 先以 `timelineItems` 为下一批第一候选重新做主真源消费审计
2. 再评估 `realWorldRecordingEvents` 是否已经能被 panel contract 完整包住
3. 最后再看 `worldlineEventsNewestFirst` 是否适合从共享 facade 转入更明确 helper 归属
4. 每推进一批，都重复 Android + desktop main + desktop minimal 的宿主 gate

## 当前结论

在 `44371448` 之后，`worldline` 已经出现第一条真实可复制的 compat 收缩路径。

但当前还不能说“旧代码已经可以批量清理”。

更准确的结论是：

- `timelineMeta` 已完成首个跨端验证试点
- `timelineItems`、`realWorldRecordingEvents`、`worldlineEventsNewestFirst` 已进入下一批只读候选
- 展开态、选择态、直接模板读取类入口仍需暂留
- 真正的旧代码清理，必须建立在逐批候选 + 重复宿主 gate 的证据链之上
