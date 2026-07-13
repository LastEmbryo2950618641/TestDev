# 2026-07-11 Desktop Mobile Transition Report

## 目标
对当前多端架构推进做一次阶段性收束，明确：
- 已完成的准备边界
- 仍未完成的真实接入内容
- 下一步唯一高价值动作

## 已完成的核心准备

### 1. 共享层与壳层边界已建立
- 共享玩法主链仍保留在 `publish/`
- 平台宿主逻辑集中在：
  - `desktop/shell/`
  - `mobile/shell/`
- 后续真实宿主接入不应优先扩散到 `publish/*`

### 2. Desktop 壳层已形成完整递进链
- contract / payload / wrapper / skeleton / real-call-ready shim
- runtime entry / runtime invoke skeleton / ultra-thin real call skeleton
- 关键文件：
  - `desktop/shell/preload.js`
  - `desktop/shell/preload-runtime-entry.js`
  - `desktop/shell/runtime-adapter.js`
  - `desktop/shell/host-runner.js`
  - `desktop/shell/executor-shim.js`
  - `desktop/shell/executor-runtime-entry.js`

### 3. Mobile 壳层已形成对齐层级
- bootstrap
- runtime-binding
- runtime-adapter
- host-runner
- 已具备与 desktop 接近的 contract 粒度，但还未进入 thin runtime-entry 阶段

### 4. 双端 parity 边界已明确
- 共性结构与允许差异点已有文档
- 后续跨端共享 contract 应优先落在 shell 层共性抽象，而不是平台细节层

## 当前仍未完成的内容

### 1. 真实 Electron 接入尚未开始
当前仍然没有：
- 真实 `contextBridge.exposeInMainWorld(...)` 调用
- 真实 `app.whenReady()`
- 真实 `BrowserWindow` 创建
- 真实 `loadFile()` / `loadURL()` 调用

### 2. 真实 APK/移动宿主接入尚未开始
当前仍然没有：
- 真实 Capacitor API 接入
- 真实 Android WebView API 接入
- 移动 runtime entry / thin integration boundary

### 3. packaging/distribution 尚未进入实现阶段
当前仍然没有：
- Electron packaging 配置
- installer / portable 分发路径
- Android packaging/signing 路径

## 当前阶段判断
- desktop 结构准备：接近完成
- mobile 结构准备：中高完成度
- 真实宿主接入：仍未开始
- 继续在 desktop 同层补更多 draft 的收益已很低

## 下一步唯一高价值动作
如果目标优先级是“更快逼近可用 exe 路线”，下一步最有价值的是：
1. 从 `desktop/shell/preload-runtime-entry.js` 开始，落第一个真正的 Electron 极薄调用骨架。
2. 调用应当仍保持最小范围，不影响当前浏览器主链。
3. 接入后再决定是否继续到 `executor-runtime-entry.js`。

如果目标优先级是“先保持双端对称推进”，才应转而为 mobile 增加 runtime entry / thin integration boundary。

## 当前推荐
- 优先桌面真实接入第一步
- 不再继续横向扩同层 draft
- 不要优先改 `publish/*`
