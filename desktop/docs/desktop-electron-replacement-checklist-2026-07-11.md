# Desktop Electron Replacement Checklist

## 目标
为后续从 draft 进入真实 Electron 宿主实现提供可执行替换顺序，确保低耦合、低扩散、低回归风险。

## Phase 1: Runtime Binding First
- [ ] 让 `desktop/shell/runtime-binding.js` 输出真实 Electron 启动顺序
- [ ] 把 `appReady` 映射到真实 `app.whenReady()`
- [ ] 把 `createWindow` 映射到真实 `BrowserWindow` 创建
- [ ] 把 `loadRenderer` 映射到真实 `loadFile()` 或 `loadURL()`
- [ ] 保留 execution plan 作为调试与验证输出

## Phase 2: Preload Exposure
- [ ] 在 `desktop/shell/preload.js` 中接入 `contextBridge.exposeInMainWorld()`
- [ ] 保留 `platformBridge` namespace 不变
- [ ] 保留 `host/files/storage/assets/keys/handshake` 分区不变
- [ ] 将 capability aggregation 继续保留在 preload shell 层

## Phase 3: IPC / Bridge Realization
- [ ] `desktop/shell/bridge/files.js` 对接真实文件系统能力
- [ ] `desktop/shell/bridge/storage.js` 对接真实本地存储能力
- [ ] `desktop/shell/bridge/assets.js` 对接真实资源索引/写入能力
- [ ] `desktop/shell/bridge/keys.js` 对接真实 key 读取策略
- [ ] `desktop/shell/bridge/host.js` 对接真实宿主状态检测

## Phase 4: Safety Checks
- [ ] 不把 Electron API 直接扩散进 `publish/*`
- [ ] 不让 gameplay chain 依赖 Electron globals
- [ ] 保持浏览器 dev 路径仍可独立运行
- [ ] 对关键 bridge 能力补最小 smoke validation

## Phase 5: Packaging Later
- [ ] 补 `desktop/packaging/` 说明或脚本
- [ ] 评估 installer / portable 分发形式
- [ ] 保持 packaging 配置与 shell runtime 分层

## 注意
优先替换层级：
1. `runtime-binding.js`
2. `preload.js`
3. `bridge/*.js`
4. packaging

不推荐一开始直接改：
- `publish/index.html`
- `publish/game.js`
- 大量共享业务模块
