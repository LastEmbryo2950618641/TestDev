# Android Host Minimal Settings/Raw API Sketch (2026-07-11)

本文档用于把 mobile storage bridge 的下一步宿主接口形状固定下来：在不直接写正式 Android 壳实现的前提下，先明确移动宿主最小应暴露哪些 settings/raw API，供 `mobile/shell/bridge/storage.js` 后续接入。

## 一、当前定位

本文档服务于以下链路：

- shared runtime
- `window.GameModules.localSettings / characterStateStore / realWorldLogStore`
- `mobile/shell/bridge/storage.js`
- Android 宿主受控 API
- Android 私有存储/配置后端

目标不是一次设计完整 Android 宿主 API 面，而是先为 mobile storage bridge 的第一轮最小闭环提供宿主接口草图。

## 二、最小暴露接口建议

建议 Android 宿主第一轮只暴露两类接口：

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

## 三、建议宿主暴露形状

建议第一轮保持简单、受控、稳定，例如：

```js
window.androidBridge.storage = {
  readSettings(key),
  writeSettings(key, patch),
  readRaw(slot),
  writeRaw(slot, raw),
  removeRaw(slot),
}
```

说明：

- 暂不急于暴露过多层级
- 暂不在 shared 层暴露宿主内部路径、容器与框架细节
- 先让 `mobileStorageBridge` 能有明确对接点

## 四、mobile storage bridge 对应接线方向

后续 `mobile/shell/bridge/storage.js` 建议最小接线关系为：

- `readSettings(key)` -> 调用 `target.androidBridge.storage.readSettings(key)`
- `writeSettings(key, patch)` -> 调用 `target.androidBridge.storage.writeSettings(key, patch)`
- `readRaw(slot)` -> 调用 `target.androidBridge.storage.readRaw(slot)`
- `writeRaw(slot, raw)` -> 调用 `target.androidBridge.storage.writeRaw(slot, raw)`
- `removeRaw(slot)` -> 调用 `target.androidBridge.storage.removeRaw(slot)`

如后续最终壳不是直接用 `window.androidBridge`，也应保持 shared runtime 只通过 `mobileStorageBridge` 接线，而不是直接读取宿主私有对象。

## 五、当前不建议宿主第一轮暴露的内容

第一轮不建议暴露：

1. Android 实际文件路径或容器路径
2. 存储底层究竟是 Preferences、SQLite、文件还是插件 KV
3. 批量列举 slot 的高阶接口
4. 与玩法逻辑耦合的业务专用 API
5. 与 keys/files/assets 混在一起的大一统超大桥

原因：

- 第一轮只需要证明 storage 最小闭环能成立
- 暴露面过大，会让 shared runtime 反向依赖 Android 宿主细节

## 六、错误语义建议

建议 Android 宿主第一轮就尽量保持错误语义可区分：

- `readSettings` / `readRaw`：若 key/slot 不存在，应返回空语义值，而不是直接抛异常
- `writeSettings` / `writeRaw` / `removeRaw`：仅在真正写入失败或宿主调用失败时抛错

这样更利于：

- shared store 保持稳定回退语义
- verify 草案区分“空值”和“真实失败”

## 七、宿主实现建议边界

宿主桥接层应只负责：

- 提供受控 storage bridge 方法
- 参数基础校验
- 调用真实 Android 存储后端
- 返回统一结果语义

宿主桥接层不应承担：

- shared gameplay 规则
- store 业务语义
- 角色状态/现实日志结构理解

真正的落地容器细节应继续留在：

- Android 壳或宿主实现层

## 八、推荐的第一轮实现顺序

1. 先定义 Android 宿主最小 storage API 面
2. 再让 `mobile/shell/bridge/storage.js` 对接宿主 storage API
3. 再新增正式 `mobile-storage-bridge-verify` 脚本
4. 最后再细化底层究竟采用哪类 Android 容器

## 九、后续验证口径连接

这份宿主草图应与以下文档共同使用：

- `docs/architecture/mobile-storage-bridge-minimal-landing-sketch-2026-07-11.md`
- `docs/architecture/mobile-storage-bridge-verify-draft-2026-07-11.md`
- `docs/architecture/android-host-api-mapping-table-2026-07-11.md`

它们分别对应：

- 最小落地路径
- 最小验证目标
- 宿主映射与实现边界

## 十、当前阶段证据

当前基础证据：

```bash
node mobile/shell/assembly-entry-verify.js
node publish/character-state-store-verify.js
node publish/real-world-log-store-verify.js
```

这些证据当前足以证明：

- mobile 主线仍保持 bridge 形状稳定
- shared store 主干仍稳定
- 当前 Android 宿主最小 settings/raw API 草图与既有 mobile 路线一致
