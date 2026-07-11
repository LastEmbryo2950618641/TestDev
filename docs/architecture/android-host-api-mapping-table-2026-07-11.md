# Android Host API Mapping Table (2026-07-11)

本文档用于把当前 `mobile/shell` 已预留的五类 bridge stub，进一步细化为“未来 Android 宿主接线映射表”，帮助后续协作者直接判断：

- 当前接口是什么
- 将来应映射到哪类 Android 宿主能力
- 应该在 bridge 层解决什么，不应该让 shared runtime 知道什么

## 一、总体原则

当前 Android 路线仍坚持：

1. shared runtime 继续保留在 `publish/`
2. `mobile/shell` 只负责宿主 bridge
3. Android 差异优先在 `host / files / storage / assets / keys` 五类桥接中吸收
4. shared gameplay、store、UI 逻辑不直接感知 Android 私有 API

## 二、当前 bridge stub 与映射方向

### 1. host bridge

当前文件：

- `mobile/shell/bridge/host.js`

当前接口：

- `kind()`
- `isDesktop()`
- `isMobile()`
- `isDev()`
- `capabilities()`
- `ready()`

当前状态：

- 已能标识 `mobile`
- 已能提供基础 capability 结构
- 当前仍是 stub / 默认值实现

未来 Android 映射方向：

- WebView / Capacitor 宿主 ready 信号
- 前后台状态变化
- App 生命周期事件
- 宿主是否处于 debug / release
- 如后续需要，可增加壳层导航、恢复、唤起上下文

bridge 层应负责：

- 把 Android 生命周期与宿主状态翻译为 shared runtime 可消费的统一接口

不应泄漏给 shared 层：

- Activity / Fragment 细节
- Capacitor / WebView 私有全局对象名

### 2. files bridge

当前文件：

- `mobile/shell/bridge/files.js`

当前接口：

- `readText()`
- `writeText()`
- `readJson()`
- `writeJson()`
- `pickFile()`
- `saveFile()`

当前状态：

- 全部为 stub，尚未接真实宿主能力

未来 Android 映射方向：

- Android 沙盒内文本/JSON 文件读写
- 用户可见导入文件选择
- 导出或另存为行为
- 临时缓存目录与应用私有目录区分

bridge 层应负责：

- 统一 Android 文件选择与文件写入方式
- 统一错误与权限失败语义
- 屏蔽 URI / ContentResolver / 私有目录等宿主细节

不应泄漏给 shared 层：

- 原始 `content://` 路径处理细节
- Android 文件权限实现方式
- 特定框架的插件调用方式

### 3. storage bridge

当前文件：

- `mobile/shell/bridge/storage.js`

当前接口：

- `readRaw()`
- `writeRaw()`
- `removeRaw()`
- `readSettings()`
- `writeSettings()`

当前状态：

- `readSettings()` 暂返回空对象
- 其他接口仍是 stub

未来 Android 映射方向：

- 统一存档原始键值读写
- shared store 最终依赖的原始落地层
- 本地设置、角色状态、现实日志的持久化宿主映射
- 如未来需要，可区分普通存储与更安全的设置/密钥存储

bridge 层应负责：

- 把 Android 存储实现统一成 raw/settings 两类能力
- 为 `characterStateStore / realWorldLogStore / localSettings` 提供稳定后端
- 屏蔽宿主是 Preferences、SQLite、文件还是其他容器

不应泄漏给 shared 层：

- 具体使用 SharedPreferences、SQLite、插件 KV 或文件数据库的实现细节

### 4. assets bridge

当前文件：

- `mobile/shell/bridge/assets.js`

当前接口：

- `assetBasePath(relative)`
- `loadIndex()`
- `saveMeta()`
- `saveImage()`

当前状态：

- `assetBasePath(relative)` 先回传相对路径
- 其他接口仍为 stub

未来 Android 映射方向：

- 包内静态资源访问
- 运行时缓存资源访问
- 身体资源、图片索引、元数据写入
- 包内只读资源与运行时生成资源的边界

bridge 层应负责：

- 统一 shared 层对 body figure / 其他静态资源的读取方式
- 统一资源索引、元数据、缓存图片的落点
- 区分“包内只读”与“运行时可写”资源

不应泄漏给 shared 层：

- Android assets 目录细节
- 本地缓存绝对路径
- WebView 资源映射路径策略

### 5. keys bridge

当前文件：

- `mobile/shell/bridge/keys.js`

当前接口：

- `readDeepseekKey()`
- `readPixaiKey()`

当前状态：

- 当前均为 stub

未来 Android 映射方向：

- 从安全存储或受控配置中读取模型/外部服务 key
- 区分普通设置与安全敏感配置

bridge 层应负责：

- 将安全存储能力抽象成统一读取接口
- 屏蔽 Android 安全存储的具体实现

不应泄漏给 shared 层：

- 安全存储插件名称
- 密钥实际存放位置
- Android 安全存储初始化细节

## 三、推荐接线顺序

### 阶段 1：先补 host / storage

原因：

- 这两类最早决定移动宿主是否能形成“最小可运行环境”
- shared runtime 对 ready / storage 的依赖最基础

### 阶段 2：再补 files / assets

原因：

- 文件与资源通常会牵涉权限、路径、缓存与容器差异
- 在 host / storage 稳定后再接更不容易反复返工

### 阶段 3：最后补 keys

原因：

- 密钥存储与安全策略往往和最终壳选择、发布策略相关
- 适合在运行链基本稳定后再做正式收口

## 四、后续协作者检查点

在真正实现 Android 宿主接线前，应先确认：

1. 这次改动是否只发生在 `mobile/shell` 或平台桥接层
2. 是否没有把 Android 私有 API 直接暴露给 shared runtime
3. 是否没有为 Android 单独复制玩法逻辑
4. 是否与现有 `characterStateStore / realWorldLogStore / localSettings` 统一入口兼容

## 五、当前阶段证据

当前可反复使用的基础证据：

```bash
node mobile/shell/assembly-entry-verify.js
node publish/character-state-store-verify.js
node publish/real-world-log-store-verify.js
```

这些证据当前足以证明：

- mobile bridge 主干已存在
- shared store 主干已存在
- 当前 Android 宿主映射表与现有 bridge 结构是对应的
