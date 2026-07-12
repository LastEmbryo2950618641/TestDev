# TimelineMeta Host Sync Feasibility Note (2026-07-12)

## 目的

这份说明用于回答一个更接近实现的问题：

- `timelineMeta` 当前虽然被宿主镜像旧依赖阻塞，但宿主同步/重装配路径本身是否存在并且足够明确？

换句话说，它不是再判断 `timelineMeta` 候选本身好不好，而是判断：

- 如果未来真要动这第一刀，宿主 gate 有没有现实可走的验证路径

## 当前结论

基于当前脚本、README 和装配证据，可以得出一个相对积极但仍保守的结论：

- `timelineMeta` 当前仍未通过宿主镜像一致性 gate
- 但 desktop 与 mobile 两侧都已经存在明确的同步/重装配/验证路径
- 因此它的阻塞并非“无路可走”，而更像“还未执行一轮围绕该候选的宿主同步验证”

这意味着：

- `timelineMeta` 仍然可以继续保留为第一批兼容收缩候选
- 但在进入真实实现前，必须先把宿主侧同步验证跑成一次具体证据

## Mobile 侧可行性证据

当前 Android WebView 壳已具备较完整的共享 runtime 同步链：

### 1. 显式同步脚本存在

- `mobile/shell/android-webview-asset-sync.js`
  - 负责把根目录 `publish/` 同步到 `app/src/main/assets/publish/`

### 2. 显式同步校验存在

- `mobile/shell/android-webview-asset-sync-verify.js`
  - 会校验：
    - `copiedEntryReady`
    - `copiedBootReady`
    - `copiedAssetsReady`
    - `targetEntryExists`
    - `parityOk`

这说明 Android 侧并不是只能“手改镜像树”，而是已经具备：

- 主真源修改
- 镜像同步
- 同步后验证

的完整链路。

### 3. Android 宿主 README 与策略文档一致

- `mobile/android-webview-shell/README.md`
  - 已明确 shared runtime assets 来自根目录 `publish/`
- `mobile/README.md`
  - 已明确 `publish/` 是共享 Web 核心来源
- `docs/architecture/android-mirrored-asset-tracking-policy-draft-2026-07-12.md`
  - 已明确 Android mirrored tree 不是主 gameplay 真源

## Desktop 侧可行性证据

当前 desktop 壳已具备较清晰的 packaging/verification 链：

### 1. packaging-time inclusion 路径明确

- `desktop/shell/desktop-packaging-config.js`
- `desktop/shell/desktop-minimal-packaging-config.js`

两者都通过：

- `from: publishDir`
- `to: 'publish'`

说明 packaged app 的 `publish/` 是从根目录 `publish/` 装配得到。

### 2. preflight / artifact / overview 报告链存在

当前已存在多份围绕 desktop packaging 的状态报告：

- `desktop/shell/desktop-packaging-preflight.js`
- `desktop/shell/desktop-packaging-overview-report.js`
- `desktop/shell/desktop-packaging-execution-state-report.js`
- `desktop/shell/desktop-packaging-artifact-structure-report.js`

这些文件说明 desktop 侧也并不是“只能看 dist 目录手猜”，而是具备：

- packaging 前置检查
- packaging 执行状态记录
- artifact 结构校验

### 3. 现有问题不在“有没有路径”，而在“还没围绕候选跑一次”

当前真正缺少的不是 desktop 同步能力，而是：

- 还没有围绕 `timelineMeta` 候选专门跑一轮“主源码修改后 -> 重新装配 -> 检查宿主依赖是否自然消失”的试点验证

## 为什么现在仍不直接实现

虽然可行性路径存在，但当前仍不直接进入实现，原因有三点：

1. 现阶段还没有宿主同步后的实证结果
2. 一旦实现与同步同时进行，排障成本会比先跑验证更高
3. 当前目标是先让“第一刀试点的 gate 是否可被宿主流程满足”更可证明，而不是抢先实现

## 当前最合理的下一步

如果继续沿 `timelineMeta` 这条线推进，最合理的动作顺序应是：

1. 保持根目录 `publish/` 作为唯一玩法/runtime 真源
2. 为 `timelineMeta` 设计最小主源码收缩实现草案
3. 在实现前后分别跑：
   - Android asset sync + verify
   - Desktop packaging/preflight/artifact 验证链
4. 对比宿主镜像里的旧依赖是否自然消失

只有当这条链路真实跑通，`timelineMeta` 才算真正通过宿主 gate。

## 当前结论

`timelineMeta` 当前的状态更准确地说是：

- 候选判断：通过
- 宿主阻塞判断：存在
- 宿主同步可行性判断：存在明确路径
- 是否已通过宿主 gate：尚未通过

因此它现在不是应被放弃的候选，而是：

- 一个仍然可保留的第一批候选
- 只是在进入真实实现前，还需要先补一次“宿主同步可行性 -> 同步验证结果”这层证据
