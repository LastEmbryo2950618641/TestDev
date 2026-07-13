# Mobile Bootstrap And Runtime Drafts

## 目标
为移动壳层补齐与桌面一致的最小结构层级，让 Android / WebView / Capacitor 方向后续都能沿用同一套 contract 分层推进。

## 当前文件
- `mobile/shell/bootstrap.js`
- `mobile/shell/runtime-binding.js`
- `mobile/shell/runtime-adapter.js`

## 当前作用
- `bootstrap.js`
  - 定义 mobile lifecycle / webview container / load draft / bridge assembly
- `runtime-binding.js`
  - 把 manifest 映射成运行时动作与执行计划
- `runtime-adapter.js`
  - 把 binding 进一步翻译成 app / webview / renderer 宿主动作草图
  - 进一步表达更接近真实移动宿主的 host action contract

## 当前更接近真实移动宿主的部分
- app lifecycle hook 草图：
  - `webview-ready`
  - `app.onPause`
  - `app.onResume`
  - `app.onDestroy`
- webview event 草图：
  - `webview.onPageFinished`
  - `webview.onRenderProcessGone`
  - `webview.requestFocus`
- renderer load contract 草图：
  - `webview-load-url`
  - `waitForPageFinished`
  - platform bridge / storage channel shape

## 当前不做
- 不导入真实 Capacitor 或 Android WebView API
- 不创建真实 APK 宿主对象
- 不修改共享 `publish/*` 玩法逻辑

## 当前价值
- 让移动端不再只有 bridge stub，而是拥有与桌面相同的结构层次
- 为后续 `apk` 实现打下统一 contract 基础
- 让多端复用目标开始从“桌面优先”进入“桌面 + 移动对齐”阶段
