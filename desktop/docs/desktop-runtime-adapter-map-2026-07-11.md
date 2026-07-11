# Desktop Runtime Adapter Map

## 目标
把桌面 shell 当前各个 draft 文件与未来真实 Electron API 接入点建立一一对应关系，避免后续实现时把平台细节重新扩散到共享业务层。

## 当前映射原则
- 共享玩法与业务逻辑继续留在 `publish/`
- 平台宿主装配与运行时绑定留在 `desktop/shell/`
- 真正 Electron API 接入优先替换 adapter/binding 层，而不是回写 main gameplay 文件

## Draft -> Future Electron API Mapping

### 1. `desktop/shell/main.js`
当前职责：
- 主入口元信息
- lifecycle 草图
- window load 草图

未来真实替换点：
- `app.whenReady()`
- `BrowserWindow` 基础配置
- `loadFile()` / `loadURL()` 选择
- `app.on('window-all-closed')`
- `app.on('activate')`

保留不变的部分：
- 窗口配置 shape
- lifecycle 分组语义
- preload path / renderer entry 的抽象描述

### 2. `desktop/shell/preload.js`
当前职责：
- preload 暴露契约
- bridge assembly
- handshake payload

未来真实替换点：
- `contextBridge.exposeInMainWorld()`
- `ipcRenderer.invoke()` / `ipcRenderer.send()`
- preload 中的 host capability 注入

保留不变的部分：
- `platformBridge` namespace
- `host/files/storage/assets/keys/handshake` 分区
- capability 汇总入口

### 3. `desktop/shell/bootstrap.js`
当前职责：
- 统一 manifest 装配
- checkpoint 汇总

未来真实替换点：
- 不直接替换成 Electron API
- 继续作为 shell-local 聚合入口保留

保留不变的部分：
- manifest 结构
- checkpoint 语义
- main / preload / assembly / handshake 的组合边界

### 4. `desktop/shell/runtime-binding.js`
当前职责：
- manifest -> runtime action 映射
- execution plan 输出

未来真实替换点：
- 真实 app/window 生命周期调度
- 运行时加载顺序控制
- readiness 检查与报错路径

保留不变的部分：
- actions 分组
- bindings 汇总形状
- execution plan 抽象字段

### 5. `desktop/shell/bridge/*.js`
当前职责：
- 宿主能力分区的 shape 与能力声明

未来真实替换点：
- 文件系统调用
- 本地存储调用
- secure key 读取
- 资源索引/写入能力
- 桌面宿主状态探测

保留不变的部分：
- bridge 模块拆分粒度
- `capabilities()` 返回结构
- 通道抽象：`electron` / `tauri` / `nativeBridge`

## 严格边界
后续真实 Electron 接入时，不应优先修改：
- `publish/index.html`
- `publish/game.js`
- `publish/storage.js`
- 其他玩法主链模块

除非出现共享 contract 缺口，否则优先在：
- `desktop/shell/runtime-binding.js`
- `desktop/shell/preload.js`
- `desktop/shell/bridge/*.js`
内完成适配。

## 推荐实现顺序
1. 先替换 `runtime-binding.js`，让 execution plan 能驱动真实 Electron 启动语义。
2. 再替换 `preload.js`，接 `contextBridge` / `ipcRenderer`。
3. 再替换 `bridge/*.js` 中真正需要落地的宿主能力。
4. 最后再补 packaging / distribution 流程。
