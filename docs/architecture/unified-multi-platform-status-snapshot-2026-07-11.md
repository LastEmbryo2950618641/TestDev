# Unified Multi-Platform Status Snapshot (2026-07-11)

本文档用于固化当前三端统一架构推进状态，作为后续 AI 会话与人工协作的共同起点。重点不是重新描述需求，而是记录：

- 当前三端已经真实落地到什么程度
- 哪些能力已经通过统一验证视角对齐
- 哪些结论是当前可依赖的证据
- 下一步应该优先补哪里

## 一、当前阶段总判断

截至当前状态，项目已经从“多端边界规划阶段”推进到“多端最小宿主能力骨架已经落地、统一 readiness 与统一 verification 已可验证”的阶段。

当前最重要的事实：

1. browser / desktop / mobile 三端已经进入同一套 capability registry + preflight + unified readiness 视角
2. desktop 已拿到一次 `enabled = true` 的真实 Electron live artifact
3. mobile 已拿到一份更接近真实 WebView 宿主的 `live-like artifact`
4. browser 已补齐 files / assets / keys 最小能力契约，并纳入统一 readiness
5. shared gameplay 流程没有因为三端推进而被重新分叉

## 二、当前三端统一结论

统一 readiness 当前应以以下脚本输出为主证据：

```bash
node publish/platform/unified-platform-readiness-report.js
```

当前结论：

1. `desktopReadyForPackagingPrep = true`
2. `mobileReadyForPackagingPrep = true`
3. `browserReadyForDirectUse = true`
4. `recommendedFocus = shared-validation`

这表示：

- desktop 以“宿主打包准备度”视角已进入可继续收口阶段
- mobile 以“宿主打包准备度”视角也已形成稳定主干
- browser 以“直接运行”视角已可继续稳定化
- 当前最值得继续补的，不是重新拆 shared gameplay，而是压实各宿主壳的真实接线证据

## 三、当前关键证据

### 1. Desktop

主证据：

- `desktop/shell/.artifacts/attempt-launch-result.json`

当前关键状态：

- `enabled = true`
- `windowCreated = true`
- `preloadExposed = true`
- `preloadPlanReady = true`
- `storageAttached = true`
- `rendererLoaded = true`

这说明 desktop 已不只是结构存在，而是已经拿到一次真实 Electron live artifact。

### 2. Mobile

主证据：

- `node mobile/shell/mobile-live-like-artifact-verify.js`
- `node mobile/shell/mobile-shell-mapping-report-verify.js`
- `node mobile/shell/android-webview-shell-config-verify.js`

当前关键状态：

- `hostAttached = true`
- `storageAttached = true`
- `bridgeNamespaceReady = true`
- `rendererEntryReady = true`
- `webviewLoadReady = true`
- `lifecycleMapReady = true`
- `hostPathReady = true`

附加结论：

- 当前推荐宿主路线是 `android-webview-shell`
- 当前已具备一份可验证的 `android-webview-shell` 最小配置草图
- 该草图已经明确：`app/activity`、`renderer`、`bridge namespace`、`storage root strategy`、`lifecycle mapping`、`host tasks`

### 3. Browser

主证据：

- `node publish/platform/browser-core-verify.js`
- `node publish/platform/unified-platform-readiness-report.js`

当前关键结论：

- browser 已补齐最小 capability 契约
- browser 已被纳入统一 readiness
- browser 当前以 `readyForDirectUse = true` 参与统一判断

## 四、统一验证总入口

当前统一验证主入口：

```bash
node publish/platform/unified-platform-verification-suite.js
```

当前状态：

- `ok = true`
- `failed = []`
- `desktop = true`
- `mobile = true`
- `browser = true`
- 当前总计 `12` 项验证

这说明：

- 统一验证视图已经覆盖 browser / desktop / mobile 三端关键主干
- 新增 Android WebView 壳配置草图后，验证入口仍保持整体通过
- 当前可以继续在低耦合前提下推进更真实的宿主壳实现

## 五、当前架构约束仍然成立

后续继续推进时，仍应坚持：

1. shared gameplay 不复制
2. 平台细节收口在 `shell / bridge / contract / registry / artifact` 层
3. browser / desktop / mobile 尽量复用同一套 capability / preflight / readiness 结构
4. 不暴力重写高风险入口：
   - `publish/index.html`
   - `publish/boot/script-manifest.js`
5. 新增 Android / Electron / Browser 细节时，不反向污染 `publish/` 业务层

## 六、下一步最推荐焦点

如果继续推进，建议优先顺序为：

1. 把 `android-webview-shell-config-draft.js` 再向真实 Android 工程参数靠近
2. 补最小 Android 容器工程骨架，但仍不复制 shared gameplay
3. 逐步把真实 `androidBridge` 注入与 WebView 生命周期绑定落地
4. 将更多 host-specific 证据纳入统一验证总入口
5. 再补一轮三端宿主文档快照，而不是重新扩散实现路径

## 七、当前状态一句话总结

当前项目已经从“多端架构规划”推进到“desktop / mobile / browser 三端最小能力主干统一可验证，desktop 已有真实 live artifact，mobile 已有 live-like artifact 与 Android WebView 壳配置草图，且统一验证总入口持续通过”的阶段；接下来的工作重点，不再是重新拆架构，而是继续压实各端真实宿主细节。

## 八、Android WebView 工程骨架输入已建立

当前除了 ndroid-webview-shell-config-draft.js 之外，还已新增：

- mobile/shell/android-webview-shell-project-draft.js`r`n- mobile/shell/android-webview-shell-project-draft-verify.js`r`n- mobile/shell/mobile-shell-implementation-snapshot.js`r`n- mobile/shell/mobile-shell-implementation-snapshot-verify.js`r`n
这意味着移动端当前不仅有壳层接线草图，还已经有面向真实 Android 工程的目录布局、assets 摆放、Activity/bridge/storage 类命名、build inputs 与 host integration tasks 的结构化输入。

该层仍然只落在 mobile/shell，没有把 Android 私有细节扩散回 publish/ 共享玩法层。
