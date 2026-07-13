# Desktop Storage Bridge Minimal Landing Sketch (2026-07-11)

本文档用于把 `desktop/shell/bridge/storage.js` 从“纯 bridge draft”继续推进到“最小落地方案草图”阶段。目标不是直接完成生产实现，而是明确：

- 第一条最小可落地的桌面存储链应该长什么样
- shared store 如何通过 desktop bridge 进入宿主后端
- 后续实现应优先验证什么，而不是一上来把所有存储能力一次做满

## 一、当前起点

当前文件：

- `desktop/shell/bridge/storage.js`

当前已具备：

1. channel 检测：
   - `electron`
   - `tauri`
   - `nativeBridge`
2. `capabilities()` 能力探测
3. `sourceShape()` 统一描述：
   - `raw: readRaw / writeRaw / removeRaw`
   - `settings: readSettings / writeSettings`
4. 具体读写实现仍为 `not implemented`

这说明当前 storage bridge 的“形状”已经稳定，但“最小落地路径”仍未正式说明。

## 二、最小落地目标

第一条建议优先打通的桌面存储链：

1. `readSettings(key)`
2. `writeSettings(key, patch)`
3. `readRaw(slot)`
4. `writeRaw(slot, raw)`

其中建议优先顺序为：

### 阶段 A：settings 先落地

原因：

- `localSettings` 语义更简单
- 更容易验证 bridge 是否真正可用
- 对玩法逻辑影响最小
- 适合先证明 shared runtime -> desktop bridge -> 宿主后端 这一条链已成立

### 阶段 B：raw 再落地

原因：

- 角色状态与现实日志最终都依赖 raw 宿主后端
- raw 接口一旦落地，更适合继续承接 shared store
- raw 比 settings 更容易牵涉 slot 设计、序列化、删除语义和兼容策略

## 三、推荐的最小实现形状

### 1. channel 限定

第一轮最小落地建议：

- 只优先支持 `electron`
- `tauri` / `nativeBridge` 保持 draft 形状不变

原因：

- 当前 desktop packaging 验证主线已明确基于 Electron
- 先打通唯一真实桌面宿主链，比一次做多 channel 更稳

### 2. settings 后端建议形状

建议最小语义：

- `readSettings(key)`
  - 若宿主不存在对应 key，返回 `{}`
- `writeSettings(key, patch)`
  - 读取现值
  - 进行浅合并
  - 写回宿主后端
  - 返回合并结果或成功标志

建议宿主侧最小后端：

- Electron preload 暴露的受控设置读写 API
- 或桌面本地 JSON settings 文件

shared 层不应知道：

- 设置实际落在哪个文件
- 是否通过 preload IPC
- 宿主路径在哪里

### 3. raw 后端建议形状

建议最小语义：

- `readRaw(slot)`
  - 不存在则返回 `null`
- `writeRaw(slot, raw)`
  - 原样写入字符串/JSON 串
- `removeRaw(slot)`
  - 删除对应 slot
  - 不存在也视为成功

建议 slot 先保持抽象，不在 shared 层固定宿主路径语义。

建议宿主侧最小后端：

- Electron preload 暴露的原始存储 API
- 或桌面本地 data 目录中的按 slot 分隔文件

## 四、推荐宿主落点策略

### settings

更适合落到：

- 用户配置目录下的 settings 文件
- 或桌面受控配置容器

### raw

更适合落到：

- 用户数据目录下的原始存储文件/记录
- 为后续角色状态、现实日志、其他 slot 预留统一后端

当前不建议第一轮就混入：

- 复杂数据库 schema
- 多版本迁移逻辑
- 多 channel 公共实现层

## 五、第一轮实现后应满足的验证口径

### 1. bridge 级验证

建议后续新增一类最小验证：

- desktop storage bridge settings round-trip
- desktop storage bridge raw round-trip

至少能证明：

- settings 能读写闭环
- raw 能读写删除闭环
- shared 层不需要知道宿主路径与 API 细节

### 2. shared store 兼容验证

在最小落地后，以下验证应继续保持通过：

```bash
node publish/character-state-store-verify.js
node publish/real-world-log-store-verify.js
node desktop/shell/assembly-entry-verify.js
```

必要时再增加 desktop storage 专用 verify。

## 六、当前不建议第一轮做的事

1. 同时把 `electron / tauri / nativeBridge` 三个 channel 一起实现
2. 一上来就做生产级数据库设计
3. 在 bridge 未稳定前，把宿主存储细节暴露给 `publish/` 业务层
4. 为了存储实现去修改 shared gameplay 流程

## 七、后续最自然的下一步

在这份草图之后，最自然的推进是：

1. 先补 `desktop storage bridge verify` 草案
2. 再补 Electron preload 侧最小 settings/raw API 草图
3. 再决定 raw 的宿主落地具体采用文件还是其他容器

## 八、当前阶段证据

当前基础证据：

```bash
node desktop/shell/assembly-entry-verify.js
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

这些证据当前足以证明：

- desktop bridge 主干已存在
- Electron packaging 主线已是当前首选真实 channel
- 当前最小落地草图与既有桌面路线一致
