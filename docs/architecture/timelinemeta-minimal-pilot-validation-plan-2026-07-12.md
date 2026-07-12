# TimelineMeta Minimal Pilot Validation Plan (2026-07-12)

## 目的

这份 runbook 只服务于一件事：

- 在不直接实施 `timelineMeta` compat 收缩的前提下
- 先把“它能否作为第一批跨端安全试点”验证成一套可执行步骤

它不是删改脚本，也不是实现说明。

## 适用前提

执行这份 runbook 前，应先满足以下前提：

1. 根目录 `publish/` 仍被视为唯一共享 gameplay/runtime 真源
2. 不在 `desktop/shell/dist*/.../publish/` 中直接手改玩法逻辑
3. 不在 `mobile/android-webview-shell/app/build/.../publish/` 中直接手改 compat 或模板逻辑
4. Android 宿主镜像 `mobile/android-webview-shell/app/src/main/assets/publish/` 只通过同步链更新
5. 当前候选仍限定为 `timelineMeta`

## 试点范围

本次最小试点只围绕以下变化假设展开：

- `publish/index.html` 主模板继续保持不直接消费 `timelineMeta(item)`
- `publish/ui/worldline/timeline-panel-view-helpers.js` 内部未来可改为直接调用本地 helper
- `publish/ui/worldline/view-helpers.js` 中对 `timelineMeta` 的 compat 暴露，未来可能成为第一刀收缩目标

本 runbook 当前不要求真正删掉这些入口。

## 为什么选择它

基于当前证据，`timelineMeta` 是最适合作为最小试点候选的原因是：

1. 页面主模板已不再直接依赖它
2. 它当前更像 timeline row 内部元数据拼装细节
3. 相比 `timelineItems`、`worldlineEventsNewestFirst`、`realWorldRecordingEvents`，传播面更窄
4. 它的风险更多来自宿主镜像残余旧依赖，而不是主源码主路径本身

## 验证目标

这次试点验证要回答的问题只有四个：

1. 主源码里对 `timelineMeta` 的直接消费面是否已经足够收敛
2. Android 镜像是否能通过同步链自然对齐主真源
3. Desktop 宿主产物是否能通过重装配链自然对齐主真源
4. 一旦后续实施第一刀，是否有清晰的失败定位与回退路径

## Step 1. 建立改动前基线

先记录当前主源码与宿主镜像的依赖基线。

建议执行：

```powershell
rg -n "timelineMeta" publish mobile/android-webview-shell/app/src/main/assets/publish desktop/shell/dist desktop/shell/dist-minimal
```

预期基线：

1. `publish/index.html` 不应再出现主模板细粒度消费
2. `publish/ui/worldline/timeline-panel-view-helpers.js` 仍可能通过 facade 或 helper 间接使用
3. Android 镜像与 desktop 打包产物里可能仍保留旧引用

若基线与上面不符，应先补审计，不进入试点实现。

## Step 2. 设计最小实现草案

这里不是正式改动，只是定义最小改动边界。

最小实现草案应尽量满足：

1. 仅触碰根目录 `publish/` 下的 `worldline` 相关 helper 文件
2. 不把逻辑重新散回 `publish/index.html`
3. 不引入新的宿主特化分支
4. 不同时处理多个 compat 入口

推荐的唯一改动方向：

- 让 `publish/ui/worldline/timeline-panel-view-helpers.js` 在内部直接依赖本地 helper 链，而不是经 `view-helpers.js` 对外暴露的 `timelineMeta`

此时仍可临时保留 compat facade，先验证宿主链是否能随主真源自然更新。

## Step 3. 主源码局部实现后立即复查

若后续进入真实最小实现，改动后先只检查主源码。

建议执行：

```powershell
rg -n "timelineMeta" publish
```

成功标准：

1. `publish/index.html` 无新增直接调用
2. `timelineMeta` 的消费面没有反向扩散
3. `timeline-panel-view-helpers.js` 的依赖方向更明确，而不是新增一层转发
4. 其余 `worldline` 只读 facade 未被顺手连带改动

若这里已经出现扩散，应在进入宿主同步前先回滚主源码实现。

## Step 4. Android 同步与校验

主源码验证通过后，再处理 Android 宿主镜像。

建议执行顺序：

```powershell
node mobile/shell/android-webview-asset-sync.js
node mobile/shell/android-webview-asset-sync-verify.js
```

重点检查：

1. `copiedEntryReady` 为 `true`
2. `copiedBootReady` 为 `true`
3. `copiedAssetsReady` 为 `true`
4. `targetEntryExists` 为 `true`
5. `parityOk` 为 `true`

然后再次确认宿主镜像里的引用：

```powershell
rg -n "timelineMeta" mobile/android-webview-shell/app/src/main/assets/publish
```

成功标准：

1. 镜像里的结果与根目录 `publish/` 状态一致
2. 没有出现“主源码已收敛，但镜像仍停在旧引用”的漂移
3. 不需要在 Android 镜像树中手修任何 gameplay/runtime 逻辑

若 `parityOk` 失败，应优先检查同步计划与镜像脏文件，而不是手改镜像树。

## Step 5. Desktop 预检与重装配验证

Desktop 侧不应手改 `dist`，而应通过装配链确认它能重新吸收主真源。

建议先跑预检：

```powershell
node desktop/shell/desktop-packaging-preflight.js
node desktop/shell/desktop-packaging-artifact-structure-report.js
```

预期：

1. preflight 中 `rendererEntryPresent` 为 `true`
2. preflight 中 `bootstrapPresent`、`preloadPresent`、`launcherPresent` 为 `true`
3. artifact report 中 `publishPresent` 为 `true`
4. 产物结构报告应继续把 packaged `publish/` 识别为装配输出

如果当前环境允许重装配，再执行实际 packaging 或既有装配命令。

重装配后再检查：

```powershell
rg -n "timelineMeta" desktop/shell/dist desktop/shell/dist-minimal
```

成功标准：

1. 打包产物中的结果与根目录 `publish/` 一致
2. 若旧引用仍存在，能够明确判断它是旧产物未刷新，还是主源码改动边界不足
3. 不在 packaged `publish/` 目录里手改 compat 逻辑

## Step 6. 通过 gate 的判定条件

只有同时满足以下条件，`timelineMeta` 才能被认定为通过“可进入第一刀实现”的试点 gate：

1. 主源码消费面收敛结果与此前审计一致
2. Android sync + verify 通过，且镜像与真源对齐
3. Desktop 预检通过，且重装配后的宿主产物与真源对齐
4. 没有发现额外模板主路径或动作层强依赖
5. 不需要在宿主镜像目录中进行补丁式手改

只要有任一条件不成立，就应继续把它视为“候选仍成立，但未通过宿主 gate”。

## 失败时优先排查哪里

若试点失败，按以下顺序定位：

1. `publish/` 主源码是否真的只做了最小范围改动
2. `publish/ui/worldline/timeline-panel-view-helpers.js` 是否引入了新的反向依赖
3. `mobile/shell/android-webview-asset-sync.js` 是否完整覆盖了当前共享 runtime 目录
4. `mobile/shell/android-webview-asset-sync-verify.js` 报出的差异是否来自镜像陈旧文件
5. `desktop/shell/desktop-packaging-preflight.js` 是否表明本地装配链本身未准备好
6. `desktop/shell/dist*` 是否只是旧打包产物未刷新，而不是新结构不兼容

## 回退策略

若后续真实试点过程中出现异常，回退顺序建议为：

1. 只回退根目录 `publish/` 内这次最小试点改动
2. Android 镜像通过同步脚本重新从真源刷新
3. Desktop 通过重新装配恢复 packaged `publish/`
4. 不在 `dist` 或 `app/build` 中做局部回退补丁

## 输出证据建议

每次真实试点执行后，建议至少保留以下证据：

1. `rg -n "timelineMeta" publish ...` 的前后对比
2. Android sync 执行结果
3. Android verify 结果
4. Desktop preflight 结果
5. Desktop artifact structure report 结果
6. 若实际重装配了 desktop，再补一份重装配后引用对比

## 当前结论

这份 runbook 的意义是：

- 先把 `timelineMeta` 从“看起来适合动”推进到“有明确试点验证步骤可走”
- 先验证宿主同步 gate，再决定是否实施第一刀 compat 收缩

也就是说，下一步最稳的推进方式不是直接删 `timelineMeta`，而是先按这份清单把试点验证证据跑完整。
