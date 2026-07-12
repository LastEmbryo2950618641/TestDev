# Host Mirror Sync Boundary Checklist (2026-07-12)

## 目的

这份清单把宿主相关目录进一步细化成可执行边界，回答三个问题：

- 哪些目录应视为可重建派生产物
- 哪些目录虽然是镜像树，但当前仍需要版本库跟踪
- 哪些更新必须通过同步脚本或装配流程，而不是手动把玩法逻辑直接改进宿主目录

它是 `host-mirror-sync-strategy-note-2026-07-12.md` 的执行化补充。

## 总原则

1. 共享玩法/runtime/UI 的真源仍然是根目录 `publish/`
2. 宿主目录中的 `publish` 镜像，不应被视为并行玩法真源
3. 在没有明确宿主特有理由前，不要直接在宿主镜像里手改玩法逻辑
4. 进入 compat 收缩前，宿主同步验证本身是一个真实 gate

## A. 可重建派生产物目录

这类目录应优先理解为：

- 打包输出
- 构建中间产物
- 可通过重建重新生成

通常不应作为玩法/runtime 逻辑的直接编辑入口。

### desktop

- `desktop/shell/dist/`
- `desktop/shell/dist-minimal/`

证据：

- `desktop/shell/desktop-packaging-config.js`
- `desktop/shell/desktop-minimal-packaging-config.js`

当前建议：

- 将其中的 `publish/` 视为打包结果镜像
- 不把这些目录当作并行源码修改位置
- 若这里与根目录 `publish/` 不一致，应优先回到主源码和打包链判断原因

### mobile

- `mobile/android-webview-shell/app/build/`
- `mobile/android-webview-shell/app/build/intermediates/assets/debug/mergeDebugAssets/`

证据：

- Android 构建目录结构本身
- `mobile/android-webview-shell/app/build/intermediates/assets/debug/mergeDebugAssets/publish/` 的路径语义已表明其为构建中间产物

当前建议：

- 视为构建派生产物
- 不应直接在这里修玩法逻辑或 compat 入口

## B. 需跟踪的宿主镜像树

这类目录虽然不是玩法真源，但当前仍是宿主装配输入的一部分，版本库中保留它们有现实意义。

### mobile Android 资产镜像树

- `mobile/android-webview-shell/app/src/main/assets/publish/`

证据：

- `mobile/android-webview-shell/README.md`
  - shared runtime assets should stay under root `publish/`
  - package into `app/src/main/assets/publish/`
- `mobile/shell/android-webview-asset-sync-verify.js`
  - 验证目标路径包含 `app/src/main/assets/publish/index.html`
- `docs/architecture/android-mirrored-asset-tracking-policy-draft-2026-07-12.md`
  - 已明确将其定义为 mirrored packaging tree

当前建议：

- 把它视为“需跟踪的宿主镜像树”
- 但不是玩法真源
- 仅在以下条件满足时考虑提交其差异：
  1. 根目录 `publish/` 已有对应共享 runtime 变更
  2. 该镜像树正在被有意刷新以对齐共享真源
  3. 相关同步/验证证据能说明这次镜像刷新是预期行为

## C. 必须优先通过同步脚本/装配流程更新的目录

### mobile Android 共享 runtime 镜像

目标目录：

- `mobile/android-webview-shell/app/src/main/assets/publish/`

推荐路径：

- 先改根目录 `publish/`
- 再运行：
  - `node mobile/shell/android-webview-asset-sync.js`
- 再验证：
  - `node mobile/shell/android-webview-asset-sync-verify.js`

原因：

- Android 侧已有显式 sync + verify 机制
- 手改镜像树只会制造 source-of-truth 漂移

### desktop 打包镜像

目标目录：

- `desktop/shell/dist/.../publish/`
- `desktop/shell/dist-minimal/.../publish/`

推荐路径：

- 先改根目录 `publish/`
- 再通过 desktop packaging / assembly 流程重新生成打包结果

原因：

- desktop 当前是 packaging-time inclusion 模式
- 打包结果里的 `publish/` 应被视为装配输出，而非主编辑位置

## D. 可以直接编辑的主真源目录

以下目录仍是当前最安全的共享 runtime 修改入口：

- `publish/index.html`
- `publish/boot/`
- `publish/domain/`
- `publish/ui/`
- `publish/platform/`
- `publish/assets/`

当前建议：

- gameplay/runtime/UI/helper/contract 的结构性修改优先落这里
- 宿主侧只承接平台桥接、打包、容器与同步

## E. 当前最需要避免的错误动作

1. 在 `desktop/shell/dist/` 或 `dist-minimal/` 的 `publish/` 里直接修玩法逻辑
2. 在 `mobile/android-webview-shell/app/build/.../publish/` 里直接修 compat 或模板逻辑
3. 只改 `mobile/android-webview-shell/app/src/main/assets/publish/`，却不回写根目录 `publish/`
4. 因为宿主镜像存在旧路径，就误判它们是长期并行真源

## 与 compat 收缩的直接关系

这份边界清单意味着：

- 如果一个 compat 候选只在宿主镜像中仍有旧依赖，先不要在宿主镜像里直接手修
- 应先判断宿主镜像是否能通过同步/重装配自然对齐主源码
- 只有在同步路径明确后，compat 收缩试点才算真正通过宿主 gate

## 当前推荐顺序

若后续进入第一批 compat 收缩试点，建议按这个顺序执行：

1. 先修改根目录 `publish/` 真源
2. 再跑对应宿主同步/装配流程
3. 再验证 desktop/mobile 镜像是否已跟随更新
4. 最后才判断该候选是否真的适合作为跨端安全试点

## 当前结论

在当前项目里：

- 根目录 `publish/` = 共享真源
- `desktop/shell/dist*` = 可重建派生产物
- `mobile/android-webview-shell/app/build/...` = 可重建构建中间产物
- `mobile/android-webview-shell/app/src/main/assets/publish/` = 需跟踪的宿主镜像树，但不是玩法真源

这层边界若不先钉住，后续任何 compat 收缩都容易在多端一致性上出错。
