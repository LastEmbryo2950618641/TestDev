# Mobile Storage Bridge Minimal Landing Sketch (2026-07-11)

本文档用于把 `mobile/shell/bridge/storage.js` 从“纯 stub”继续推进到“最小落地方案草图”阶段。目标不是直接完成 Android 宿主实现，而是先明确：

- 第一条最小可落地的移动存储链应该长什么样
- shared store 如何通过 mobile bridge 进入 Android 宿主后端
- 后续实现应优先验证什么，而不是一开始把所有移动存储场景一起做满

## 一、当前起点

当前文件：

- `mobile/shell/bridge/storage.js`

当前已具备：

1. `readRaw()` / `writeRaw()` / `removeRaw()` 接口形状已预留
2. `readSettings()` / `writeSettings()` 接口形状已预留
3. `readSettings()` 当前暂返回 `{}`
4. 其他写入型接口仍为 `not implemented`

这说明当前 mobile storage bridge 的“形状”已经存在，但“第一条最小可落地路径”仍未正式固定。

## 二、最小落地目标

第一条建议优先打通的移动存储链：

1. `readSettings(key)`
2. `writeSettings(key, patch)`
3. `readRaw(slot)`
4. `writeRaw(slot, raw)`

其中建议优先顺序为：

### 阶段 A：settings 先落地

原因：

- `localSettings` 语义最简单
- 对 shared gameplay 影响最小
- 更适合作为 Android 宿主 bridge 第一条闭环
- 能先证明 shared runtime -> mobile bridge -> Android 宿主后端 这条链已成立

### 阶段 B：raw 再落地

原因：

- 角色状态与现实日志最终都依赖 raw 宿主后端
- raw 一旦落地，shared store 的真正价值才开始被证明
- raw 会牵涉 slot 命名、序列化、删除语义、宿主存储容器选择

## 三、推荐的最小实现形状

### 1. settings 后端建议形状

建议最小语义：

- `readSettings(key)`
  - 若宿主不存在对应 key，返回 `{}`
- `writeSettings(key, patch)`
  - 读取现值
  - 执行浅合并
  - 写回宿主后端
  - 返回最新结果或成功标志

建议 Android 宿主侧最小后端：

- WebView/壳层暴露的受控 settings 读写 API
- 或移动配置容器中的 settings 记录

shared 层不应知道：

- 设置实际落在哪个 Android 容器
- 是否通过 WebView bridge、Capacitor plugin 或其他宿主 API
- 宿主路径与存储细节

### 2. raw 后端建议形状

建议最小语义：

- `readRaw(slot)`
  - 不存在则返回 `null`
- `writeRaw(slot, raw)`
  - 原样写入字符串/JSON 串
- `removeRaw(slot)`
  - 删除对应 slot，不存在也视为成功

建议 slot 继续保持抽象，不让 shared 层绑定 Android 宿主路径语义。

建议 Android 宿主侧最小后端：

- 由移动壳暴露的原始键值存储 API
- 或应用私有存储中的 slot 记录层

## 四、推荐 Android 宿主落点策略

### settings

更适合落到：

- 移动端配置容器
- 应用私有设置存储

### raw

更适合落到：

- 应用私有数据目录中的原始记录层
- 为角色状态、现实日志、其他 slot 预留统一后端

当前不建议第一轮就混入：

- 复杂数据库 schema
- 跨多容器迁移逻辑
- 多壳共享实现层

## 五、第一轮实现后应满足的验证口径

### 1. bridge 级验证

建议后续新增一类最小验证：

- mobile storage bridge settings round-trip
- mobile storage bridge raw round-trip

至少能证明：

- settings 能读写闭环
- raw 能读写删除闭环
- shared 层不需要知道 Android 宿主路径、容器或插件细节

### 2. shared store 兼容验证

在最小落地后，以下验证应继续保持通过：

```bash
node publish/character-state-store-verify.js
node publish/real-world-log-store-verify.js
node mobile/shell/assembly-entry-verify.js
```

必要时再增加 mobile storage 专用 verify。

## 六、当前不建议第一轮做的事

1. 一上来同时兼容多种 Android 壳技术实现细节
2. 一开始就做生产级数据库设计
3. 在 bridge 未稳定前，把 Android 宿主细节暴露给 `publish/` 业务层
4. 为了存储实现去修改 shared gameplay 流程

## 七、后续最自然的下一步

在这份草图之后，最自然的推进是：

1. 先补 `mobile storage bridge verify` 草案
2. 再补 Android 宿主最小 settings/raw API 草图
3. 再决定 raw 最终落地采用哪类移动存储容器

## 八、当前阶段证据

当前基础证据：

```bash
node mobile/shell/assembly-entry-verify.js
node publish/character-state-store-verify.js
node publish/real-world-log-store-verify.js
```

这些证据当前足以证明：

- mobile bridge 主干已存在
- shared store 主干已存在
- 当前最小落地草图与既有 Android 路线一致
