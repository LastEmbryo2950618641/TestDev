# Host Mirror Sync Strategy Note (2026-07-12)

## 目的

这份说明用于明确当前项目中：

- 根目录 `publish/` 与 desktop/mobile 宿主侧 `publish` 目录之间的关系
- 哪些目录应视为共享源码真源
- 哪些目录应视为装配镜像、同步目标或构建产物
- 在此基础上，后续 compat 收缩前必须先满足什么同步前提

这份说明直接服务于多端一致性目标。

## 当前结论

基于当前配置、README 与装配脚本证据，可以先得出一个相对稳定的结论：

- 根目录 `publish/` 是共享运行时/玩法前端的源码真源
- desktop 打包产物中的 `publish/` 是从根目录 `publish/` 装配复制进去的分发镜像
- mobile Android WebView 壳中的 `app/src/main/assets/publish/` 是共享 runtime 的同步目标/宿主镜像，不应被视为与根目录 `publish/` 并行维护的独立真源

## 关键证据

### 1. desktop 打包配置直接从根目录 `publish/` 取源

以下文件共同说明 desktop packaging 使用根目录 `publish/` 作为输入：

- `desktop/shell/desktop-packaging-paths.js`
  - `resolvePublishDir()` 返回项目根目录下的 `publish`

- `desktop/shell/desktop-packaging-config.js`
  - packaging `files` 中存在：
    - `from: publishDir`
    - `to: 'publish'`

- `desktop/shell/desktop-minimal-packaging-config.js`
  - minimal packaging 同样使用：
    - `from: publishDir`
    - `to: 'publish'`

这说明：

- `desktop/shell/dist/` 与 `desktop/shell/dist-minimal/` 下看到的 `publish/` 更像打包结果中的镜像
- 若主源码 `publish/` 与这些目录不一致，不能直接推断宿主真源是宿主目录本身

### 2. mobile README 明确把根目录 `publish/` 定义为共享 Web 核心来源

以下文档给出了清晰文字证据：

- `mobile/README.md`
  - `publish/` 仍然是共享 Web 核心来源
  - 移动壳只负责宿主能力装配，不复制玩法模块

- `desktop/README.md`
  - 同样表述 `publish/` 是共享 Web 核心来源
  - 桌面壳只负责宿主能力装配，不复制玩法模块

这说明：

- desktop 与 mobile 的宿主目录在设计上都不应成为玩法前端并行真源

### 3. mobile Android 壳已有显式 asset sync 语义

当前还存在更直接的移动侧装配证据：

- `mobile/android-webview-shell/README.md`
  - 明确写到 shared runtime assets 应位于根目录 `publish/`
  - 并被打包进 `app/src/main/assets/publish/`
  - 提供 `node mobile/shell/android-webview-asset-sync.js` 进行拷贝同步

- `mobile/shell/android-webview-asset-sync-verify.js`
  - 验证目标路径中包含：
    - `mobile/android-webview-shell/app/src/main/assets/publish/index.html`

- `docs/architecture/android-mirrored-asset-tracking-policy-draft-2026-07-12.md`
  - 明确指出 Android host 当前依赖镜像树
  - 但共享 gameplay/runtime 的 source of truth 仍是根目录 `publish/`

这说明：

- `app/src/main/assets/publish/` 应视为同步目标或镜像树
- 不能因为它存在真实文件，就默认它是主源码等价真源

## 对当前阻塞问题的解释

此前 `timelineMeta` 收缩候选被阻塞，是因为在以下宿主镜像中仍发现直接依赖：

- `desktop/shell/dist-minimal/.../publish/index.html`
- `desktop/shell/dist/.../publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
- `mobile/android-webview-shell/app/build/intermediates/.../publish/index.html`

在当前证据下，这些依赖更应理解为：

- 宿主镜像/装配目标尚未完成与主源码同步
- 或某些镜像树仍保留旧消费路径

而不应直接推断为：

- 宿主镜像目录本身是独立真源，必须和根目录 `publish/` 永久并行维护

## 当前风险

虽然真源关系已经较清楚，但当前仍存在一个重要风险：

- 代码库里存在多份宿主镜像/构建产物树
- 它们并不保证与根目录 `publish/` 自动保持一致

这意味着：

- 只改主源码 `publish/`，但不做宿主镜像同步验证，仍然可能造成桌面/移动侧行为落后
- 直接在宿主镜像里手改实现，也会制造“真源漂移”问题

## 当前正确约束

在此结论下，后续开发应遵守：

1. 玩法/共享运行时的源码修改，优先改根目录 `publish/`
2. desktop `dist/` / `dist-minimal/` 视为分发或装配结果，不作为并行主源码修改入口
3. mobile `app/src/main/assets/publish/` 视为宿主同步目标，不作为玩法逻辑的首选真源编辑位置
4. 在动 compat 收缩前，必须先判断相关宿主镜像是否需要重新同步/重装配来验证

## 对后续 compat 收缩的直接影响

这份结论意味着：

- 某个 compat 候选若在主源码已脱离直接依赖，但在宿主镜像仍保留旧依赖
- 当前更合理的动作不是直接否定主源码候选本身
- 而是把它视为“宿主同步门槛未过”的候选

换句话说：

- compat 收缩前新增了一道真实 gate：
  - 宿主镜像同步验证

## 下一阶段建议

### 优先动作 A：宿主镜像同步边界清单

建议下一步再补一份短清单，明确：

- 哪些宿主目录是可删/可重建的派生产物
- 哪些宿主目录是当前版本库中需要保留跟踪的镜像树
- 哪些目录更新必须依赖同步脚本，而不是手改

### 优先动作 B：为第一批 compat 收缩候选增加“宿主同步 gate”

以后每个 compat 候选进入实现前，至少再确认：

- 主源码是否已脱离直接依赖
- desktop 镜像是否可通过重新打包覆盖旧依赖
- mobile 镜像是否可通过 asset sync 覆盖旧依赖

## 当前结论

当前项目最稳妥的理解方式是：

- `publish/` = 共享 Web/玩法源码真源
- `desktop` / `mobile` 中的 `publish` 相关目录 = 宿主装配镜像、同步目标或构建产物

因此后续推进多端一致性时，不应在这些宿主镜像中直接并行维护玩法逻辑，而应：

- 以根目录 `publish/` 为修改入口
- 以宿主同步/装配验证作为落地 gate
