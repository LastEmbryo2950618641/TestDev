# Mobile Shell

本目录承载 Android 移动宿主壳的最小工程骨架、桥接契约、验证入口与对接草图。

## 目录目标

- 只放 `mobile` 宿主层代码、配置、验证与文档。
- 不复制 shared gameplay 逻辑。
- 不修改玩法语义，只负责把 shared runtime 接到移动宿主。
- 不把 Android / WebView / Capacitor 的私有实现细节泄漏回 `publish/` 业务层。

## 当前定位

当前 `mobile/shell` 已从纯 stub 阶段推进到“可验证的宿主配置草图 + live-like artifact”阶段。

现阶段已经具备：

- `assembly-entry`：mobile 宿主最小装配入口
- `bridge/*`：host / files / storage / assets / keys 的移动端桥接分区
- `shared-*-contract-entry`：移动桥接能力到 shared contract 的映射入口
- `platform-capability-registry-entry`：移动端统一 capability registry 聚合入口
- `platform-preflight-report-entry`：移动端 readiness/preflight 汇总入口
- `platform-packaging-gap-report-entry`：移动端打包差距视角入口
- `mobile-live-like-artifact.js`：更接近真实 WebView 宿主的运行证据
- `mobile-shell-mapping-report.js`：当前 Android WebView / Capacitor 路线映射报告
- `android-webview-shell-config-draft.js`：Android WebView 壳最小真实配置草图

## 当前推荐路线

当前推荐优先走 `android-webview-shell`，原因不是它“永远最好”，而是：

1. 它和当前 `mobile-live-like-artifact` 的证据最贴近
2. 当前 storage contract 已对齐 `androidBridge`
3. 当前 lifecycle 语义已能映射到 `webview-ready / app.onPause / app.onResume / app.onDestroy`
4. 这条路线更适合先验证 APK 最小宿主闭环

`capacitor-shell` 仍然保留为后续维护导向的备选路线，但现阶段不是首推。

## 关键文件

- `bootstrap.js`：移动 lifecycle / webview container / assembly 草图
- `runtime-binding.js`：manifest 到运行时动作的绑定草图
- `runtime-adapter.js`：未来移动宿主动作适配草图
- `host-runner.js`：移动宿主执行顺序与 mock execution 草图
- `runtime-entry.js`：mobile future runtime handoff 入口
- `mobile-live-like-artifact.js`：mobile live-like 证据入口
- `mobile-shell-mapping-report.js`：宿主路线映射报告
- `android-webview-shell-config-draft.js`：Android WebView 壳配置草图
- `bridge/`：按能力分区的移动端桥接层
- `*verify.js`：每个层级对应的最小可回归验证入口

## Android WebView 壳配置草图职责

`android-webview-shell-config-draft.js` 只负责输出“当前最接近真实 APK 壳的最小配置视图”，包括：

- `app.packageName`
- `app.activity`
- `renderer.entry`
- `renderer.loadStrategy`
- `bridge.namespace`
- `bridge.storageNamespace`
- `storage.rootStrategy`
- `lifecycle mapping`
- `hostTasks`

它不负责：

- 真实生成 Android Studio 工程
- 真实创建 Activity / Fragment 源码
- 改写 shared gameplay
- 把 WebView / Android API 直接暴露给 `publish/`

## 后续协作者约束

后续继续做 Android / APK 路线时，必须遵守：

1. 新增 Android 细节时，优先落在 `mobile/shell` 内
2. shared gameplay 只通过 contract / registry / bridge 使用平台能力
3. 不允许为移动端复制一份独立玩法逻辑
4. 不允许把 Android 私有 API 名称直接写进 `publish/` 业务层
5. 优先新增 `report / artifact / contract / verify / draft`，不要直接把逻辑塞进入口页
6. 高风险入口仍尽量不动：
   - `publish/index.html`
   - `publish/boot/script-manifest.js`

## 建议开发顺序

1. 先完善 `android-webview-shell-config-draft.js` 的宿主映射信息
2. 再补真正的 Android 容器工程骨架
3. 然后接真实 `androidBridge` 注入
4. 最后再做壳层打包与模拟器/真机验证

## 常用验证命令

```bash
node mobile/shell/mobile-storage-backend-verify.js
node mobile/shell/mobile-storage-bridge-verify.js
node mobile/shell/mobile-live-like-artifact-verify.js
node mobile/shell/mobile-shell-mapping-report-verify.js
node mobile/shell/android-webview-shell-config-verify.js
node publish/platform/unified-platform-verification-suite.js
```

## 一句话原则

移动端继续推进时，优先压实宿主壳与桥接层，不要重新拆 shared gameplay，也不要把平台细节扩散回业务层。
