# Electron Preload Minimal Settings/Raw API Sketch (2026-07-11)

本文档用于把 desktop storage bridge 的下一步宿主接口形状固定下来：在不直接写正式 preload 实现的前提下，先明确 Electron preload 最小应暴露哪些 settings/raw API，供 `desktop/shell/bridge/storage.js` 后续接入。

## 一、当前定位

本文档服务于以下链路：

- shared runtime
- `window.GameModules.localSettings / characterStateStore / realWorldLogStore`
- `desktop/shell/bridge/storage.js`
- Electron preload 受控 API
- Electron 宿主后端（文件/配置/其他容器）

目标不是一次设计完整 Electron API 面，而是先为 desktop storage bridge 的第一轮最小闭环提供宿主接口草图。

## 二、最小暴露接口建议

建议 preload 第一轮只暴露两类接口：

### 1. settings API

建议最小接口：

- `readSettings(key)`
- `writeSettings(key, patch)`

建议语义：

- `readSettings(key)`
  - 不存在时返回 `{}`
- `writeSettings(key, patch)`
  - 执行浅合并写回
  - 返回最新结果或明确成功标志

适用对象：

- `window.GameModules.localSettings`
- shared UI 主题、启动设置等本地设置入口

### 2. raw API

建议最小接口：

- `readRaw(slot)`
- `writeRaw(slot, raw)`
- `removeRaw(slot)`

建议语义：

- `readRaw(slot)`
  - 不存在时返回 `null`
- `writeRaw(slot, raw)`
  - 原样写入字符串/JSON 串
- `removeRaw(slot)`
  - 删除对应 slot，不存在也应视为成功

适用对象：

- shared `characterStateStore`
- shared `realWorldLogStore`
- 未来其他 raw slot 场景

## 三、建议 preload 暴露形状

建议第一轮保持简单、受控、稳定，例如：

```js
window.electron.storage = {
  readSettings(key),
  writeSettings(key, patch),
  readRaw(slot),
  writeRaw(slot, raw),
  removeRaw(slot),
}
```

说明：

- 暂不急于暴露过多层级
- 暂不在 shared 层暴露宿主内部路径或实现方式
- 先让 `desktopStorageBridge` 能有明确对接点

## 四、desktop storage bridge 对应接线方向

后续 `desktop/shell/bridge/storage.js` 若走 `electron` channel，建议最小接线关系为：

- `readSettings(key)` -> 调用 `target.electron.storage.readSettings(key)`
- `writeSettings(key, patch)` -> 调用 `target.electron.storage.writeSettings(key, patch)`
- `readRaw(slot)` -> 调用 `target.electron.storage.readRaw(slot)`
- `writeRaw(slot, raw)` -> 调用 `target.electron.storage.writeRaw(slot, raw)`
- `removeRaw(slot)` -> 调用 `target.electron.storage.removeRaw(slot)`

这样 shared runtime 仍只认识 bridge，不认识 preload 私有细节。

## 五、当前不建议 preload 第一轮暴露的内容

第一轮不建议暴露：

1. 宿主实际文件路径
2. settings/raw 存放容器类型
3. 批量列举 slot 的高阶接口
4. 与玩法逻辑耦合的业务专用 API
5. 与 keys/files/assets 混在一起的超大统一桥

原因：

- 第一轮只需要证明 storage 最小闭环能成立
- 暴露面过大，会让 shared runtime 反向依赖 preload 细节

## 六、错误语义建议

建议 preload 第一轮就尽量保持错误语义可区分：

- `readSettings` / `readRaw`：若 key/slot 不存在，应返回空语义值，而不是直接抛异常
- `writeSettings` / `writeRaw` / `removeRaw`：仅在真正写入失败或宿主调用失败时抛错

这样更利于：

- shared store 保持稳定回退语义
- verify 草案里区分“空值”和“真实失败”

## 七、后端实现建议边界

preload 层应只负责：

- 提供受控桥接方法
- 参数基础校验
- 调用主进程/宿主后端
- 返回统一结果语义

preload 层不应承担：

- shared gameplay 规则
- store 业务语义
- 角色状态/现实日志结构理解

真正的落地容器细节应继续留在：

- Electron 主进程或宿主后端实现

## 八、推荐的第一轮实现顺序

1. 先定义 preload 最小 storage API 面
2. 再让 `desktop/shell/bridge/storage.js` 对接 `electron.storage.*`
3. 再新增正式 `desktop-storage-bridge-verify` 脚本
4. 最后再细化后端究竟是文件、配置还是其他容器

## 九、后续验证口径连接

这份 preload 草图应与以下文档共同使用：

- `docs/architecture/desktop-storage-bridge-minimal-landing-sketch-2026-07-11.md`
- `docs/architecture/desktop-storage-bridge-verify-draft-2026-07-11.md`
- `docs/architecture/windows-host-placement-table-2026-07-11.md`

它们分别对应：

- 最小落地路径
- 最小验证目标
- 宿主落点与实现边界

## 十、当前阶段证据

当前基础证据：

```bash
node desktop/shell/assembly-entry-verify.js
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

这些证据当前足以证明：

- desktop 主线仍以 Electron 为首选真实 channel
- preload 最小 storage API 草图与现有 desktop bridge 方向一致
- 当前推进仍保持 shared runtime 不分叉
