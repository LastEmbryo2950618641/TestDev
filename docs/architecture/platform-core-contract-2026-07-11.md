# Platform Core Contract (2026-07-11)

## 目标

为当前项目建立统一的 `platform.core` 契约清单，作为后续继续抽象 `keys / storage / assets / files / host` 平台能力时的共同依据。

这份 contract 的核心目标是：
- 让共享 runtime 优先依赖稳定的平台核心入口，而不是继续散落地读宿主细节
- 让 Web、Windows exe、Android apk 可以分别提供宿主实现，但上层玩法逻辑保持同一套调用面
- 避免平台能力继续扩散到业务模块、UI helper 或历史大文件里

## 当前已经落地的 core 入口

截至 2026-07-11，以下入口已经有真实代码落地：
- `window.GameModules.platform.core.keys`
- `window.GameModules.platform.core.storage.backend`
- `window.GameModules.platform.core.storage.capabilities`
- `window.GameModules.platform.core.storage.characterStateSource`
- `window.GameModules.platform.core.storage.realWorldLogSource`
- `window.GameModules.platform.core.storage.worldLoreSource`
- `window.GameModules.platform.core.storage.localSettingsSource`
- `window.GameModules.platform.core.storage.sqliteSlotSource`

这些入口说明：`platform.core` 已经不是纯规划概念，而是被共享 runtime 逐步消费的真实边界。

## 总体规则

1. 共享核心优先依赖 `platform.core.*`，而不是继续优先依赖历史全局别名。
2. 新的平台能力先建立 `platform.core` 入口，再决定 browser / desktop / mobile 的宿主实现。
3. 历史路径可以保留兼容 facade，但新上层调用应优先走 `platform.core`。
4. `platform.core` 只承载能力契约，不承载玩法逻辑。
5. 宿主实现可以调用浏览器、桌面端、移动端私有 API，但业务模块不直接做这些调用。

## 推荐命名结构

推荐统一采用：
- `window.GameModules.platform.core.keys`
- `window.GameModules.platform.core.storage`
- `window.GameModules.platform.core.assets`
- `window.GameModules.platform.core.files`
- `window.GameModules.platform.core.host`

每个一级域下再按能力细分对象，而不是继续扩展大量平级全局别名。

## keys contract

### 目标
统一管理 API key / provider key 的读取来源。

### 当前已存在
- `readDeepseekKey()`
- `readPixaiKey()`

### 推荐扩展方向
- 保持 provider 粒度读取函数
- 必要时补 `read(keyId)` 这类更通用的入口，但不要破坏当前显式接口的可读性

### 约束
- 不在业务层直接读取 `*_key.txt`
- 不在 UI 层判断 key 文件路径

## storage contract

### 目标
统一管理存档、角色状态、现实日志、世界线缓存、本地设置等持久化能力。

### 当前已存在
- `storage.backend.open/get/put/remove/inspectSlot/readRaw/writeRaw/persist`
- `storage.capabilities.isReady`
- `storage.characterStateSource.get/getByName/resolve/list/save`
- `storage.realWorldLogSource.append/get/list/saveAll/count`
- `storage.worldLoreSource.list`
- `storage.localSettingsSource.read/write/remove`
- `storage.sqliteSlotSource.read/write`

### 推荐扩展方向
- `storage.memorySource`
- `storage.wechatSource`
- `storage.settingsSource`
- `storage.slotMetaSource`

### 约束
- 上层尽量不直接依赖 `sqliteSave`
- 先建立 source/backend，再逐步迁移调用方

## assets contract

### 目标
统一管理静态资源与可生成资源的访问方式，屏蔽 `dev`、桌面端、移动端之间的路径差异。

### 当前状态
- `bodyFigureSource` 仍然带有历史兼容色彩
- 资源访问尚未完全收口到 `platform.core.assets`

### 推荐目标形态
- `platform.core.assets.bodyFigure.assetBasePath(relative)`
- `platform.core.assets.bodyFigure.loadIndex()`
- `platform.core.assets.bodyFigure.saveMeta(payload)`
- `platform.core.assets.bodyFigure.saveImage(payload)`
- 未来也可以扩展到头像、贴图、世界素材等来源

### 约束
- 不在业务层拼接宿主资源路径
- 不在模块内部散写本地资源 fetch 逻辑

## files contract

### 目标
统一处理宿主文件读写、文件选择、文本与二进制读取、导入导出等能力。

### 当前状态
- 还没有完全正式化的 `platform.core.files` 通用实现
- 这是后续 exe / apk 差异最明显、也最需要提前收口的能力之一

### 推荐目标形态
- `platform.core.files.pickFile(options)`
- `platform.core.files.readText(pathOrHandle)`
- `platform.core.files.readBinary(pathOrHandle)`
- `platform.core.files.writeText(pathOrHandle, payload)`
- `platform.core.files.writeBinary(pathOrHandle, payload)`
- `platform.core.files.exportJson(payload, options)`

### 约束
- 不让业务层直接依赖 Electron / Android 私有文件 API
- 不让 shared runtime 感知宿主文件系统实现细节

## host contract

### 目标
统一描述宿主环境能力，例如：
- 当前运行宿主类型
- 可用桥接能力
- 宿主只读环境信息
- 宿主触发的外部动作入口

### 推荐目标形态
- `platform.core.host.kind`
- `platform.core.host.capabilities`
- `platform.core.host.invoke(action, payload)`
- `platform.core.host.readEnv()`

### 约束
- 不在业务模块里直接判断 Electron / Android WebView 的存在
- 宿主差异应被包在 host bridge 内，而不是扩散到上层玩法逻辑

## 当前推进顺序建议

1. 先把已经真实落地的 keys / storage 入口稳定下来。
2. 再逐步补 assets / files / host 这三类高差异能力。
3. 每补一类能力，都先定义 core contract，再决定 browser / desktop / mobile 的具体装配。
4. 历史调用方迁移时优先做 facade 收口，不要在同一轮同时大改玩法逻辑。

## 对多端复用的价值

这份 contract 对当前总目标的意义是：
- 让 `publish/` 持续作为共享 runtime 真源
- 让 `desktop/` 与 `mobile/` 只负责宿主适配与装配
- 让 Web / Desktop / Android 围绕同一套平台核心入口复用，而不是复制玩法代码
- 让后续清理旧代码时有更明确的迁移目标，而不是边改边猜
