# Mobile Runtime Entry Draft

## 目标
为移动端补一个独立的 runtime entry 草图，作为 future APK / WebView / Capacitor 真实调用的集中入口占位。

## 当前文件
- `mobile/shell/runtime-entry.js`
- `mobile/shell/runtime-entry-verify.js`
- `mobile/shell/runtime-like-integration-verify.js`
- `mobile/shell/webview-like-runtime-verify.js`
- `mobile/shell/adapter-like-runtime-verify.js`

## 当前作用
- 汇总 mobile 侧现有：
  - host action contract
  - runner pipeline
  - runner steps
  - assembly
- 提供一个单独的 runtime invoke draft
- 提供可选真实调用入口
- 提供最小本地验证入口
- 提供 runtime-like 协同验证入口
- 提供更像 WebView/Capacitor 的 runtime-like 验证入口
- 提供更像真实宿主分层的 adapter-like 验证入口

## 当前结构
- `createMobileRuntimeEntry(target)`
  - 聚合 mobile contract / pipeline / steps / assembly
- `createMobileRuntimeInvokeDraft(target)`
  - 提供 future real invoke 的关键占位
- `createMobileOptionalRuntimeCall(runtimeLike, target)`
  - 当存在 `attachWebView` 与 `loadRenderer` 能力时，构造真实调用链
  - 当不存在时，返回描述性结果而不执行调用
- `verifyMobileRuntimeEntry()`
  - 覆盖有 / 无 runtime-like 的最小验证路径
- `verifyMobileRuntimeLikeIntegration()`
  - 覆盖 runtime entry 与 host runner 的协同验证路径
- `verifyMobileWebViewLikeRuntime()`
  - 覆盖更像 WebView/Capacitor 的宿主验证路径
- `verifyMobileAdapterLikeRuntime()`
  - 覆盖更像真实宿主分层的 adapter-like 验证路径

## 当前不做
- 不导入真实 Capacitor API
- 不导入真实 Android WebView API
- 不影响当前浏览器运行链

## 当前价值
- 让 mobile 从“结构准备”进入“可验证接入入口”阶段
- 为后续 `apk` 方向接入提供更集中替换点
- 继续保持 shell-local、低耦合
