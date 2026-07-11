# Platform Core Contract (2026-07-11)

## 目标

为当前项目建立统一的 `platform.core` 接口清单，作为后续抽取 `keys / storage / assets / files / host` 平台能力时的共同依据。

这份 contract 的核心目标是：

- 让共享核心只依赖稳定的平台抽象入口
- 让 Windows exe / Android apk / 当前 dev 环境可以分别提供宿主实现
- 避免平台能力继续散落在业务模块、UI helper 或根级历史文件里

## 当前已落地的 core 入口

截至 2026-07-11，以下入口已经有真实代码落地：

- `window.GameModules.platform.core.keys`
- `window.GameModules.platform.core.storage.backend`
- `window.GameModules.platform.core.storage.capabilities`
- `window.GameModules.platform.core.storage.characterStateSource`
- `window.GameModules.platform.core.storage.realWorldLogSource`
- `window.GameModules.platform.core.storage.worldLoreSource`

这些入口说明：`platform.core` 已经不再是纯规划概念，而是可以被真实上层模块消费的统一边界。

## 总体规则

1. 共享核心只能优先依赖 `platform.core.*`，不优先依赖历史全局别名。
2. 新平台能力先建立 `platform.core` 入口，再决定具体宿主实现。
3. 历史路径可以保留兼容壳，但新上层调用应优先走 `platform.core`。
4. `platform.core` 只暴露能力契约，不承载玩法逻辑。
5. 平台实现允许调用浏览器、桌面、移动宿主 API，但上层业务模块不直接做这些调用。

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

统一管理 API key / provider key 的来源读取。

### 当前已存在

- `readDeepseekKey()`
- `readPixaiKey()`

### 推荐扩展方向

- 保持 provider 粒度读取函数
- 必要时补 `read(keyId)` 这种更通用的入口，但不要影响当前显式接口可读性

### 约束

- 不在业务层直接 fetch `*_key.txt`
- 不在 UI 层判断 key 文件路径

## storage contract

### 目标

统一管理存档、角色状态、现实日志、世界线缓存等持久化相关能力。

### 当前已存在

- `storage.backend.open/get/put/remove/inspectSlot/readRaw/writeRaw/persist`
- `storage.capabilities.isReady`
- `storage.characterStateSource.get/getByName/resolve/list/save`
- `storage.realWorldLogSource.append/get/list/saveAll/count`
- `storage.worldLoreSource.list`

### 推荐扩展方向

- `storage.memorySource`
- `storage.wechatSource`
- `storage.settingsSource`
- `storage.slotMetaSource`

### 约束

- 上层尽量不直接依赖 `sqliteSave`
- 先建立 source/backend，再逐步迁调用方

## assets contract

### 目标

统一管理静态资源与可生成资源的访问方式，屏蔽 dev 路径、桌面路径、移动路径差异。

### 当前状态

- `bodyFigureSource` 仍然是历史入口，且显式依赖 `__dev` 路径。
- 尚未收口为 `platform.core.assets`。

### 推荐目标形态

- `platform.core.assets.bodyFigure.assetBasePath(relative)`
- `platform.core.assets.bodyFigure.loadIndex()`
- `platform.core.assets.bodyFigure.saveMeta(payload)`
- `platform.core.assets.bodyFigure.saveImage(payload)`
- 未来也可扩展到头像、贴图、世界素材等来源

### 约束

- 不在业务层拼 `__dev/*` 资源路径
- 不在模块内部散写 fetch 到本地资源接口

## files contract

### 目标

统一处理宿主文件读写、文件选择、文本/二进制读取与导出。

### 当前状态

- 还没有正式 `platform.core.files` 实现。
- 这是后续 exe / apk 差异最大的能力之一，应优先用 contract 约束。

### 推荐目标形态

- `platform.core.files.readText(path)`
- `platform.core.files.writeText(path, value)`
- `platform.core.files.readJson(path)`
- `platform.core.files.writeJson(path, value)`
- `platform.core.files.pickFile(options)`
- `platform.core.files.saveFile(options)`

### 约束

- 不在 domain/ui 中直接处理宿主文件选择器
- 不让业务模块自己判断浏览器 / exe / apk 的读写差异

## host contract

### 目标

统一宿主能力、环境检测、生命周期和桥接状态。

### 当前状态

- 还没有正式 `platform.core.host` 实现。
- 当前宿主差异判断仍偏分散。

### 推荐目标形态

- `platform.core.host.kind()`
- `platform.core.host.isDesktop()`
- `platform.core.host.isMobile()`
- `platform.core.host.isDev()`
- `platform.core.host.capabilities()`
- `platform.core.host.ready()`

### 约束

- 不让各业务模块自己散写环境分支
- 宿主能力由 host 和具体 platform 实现统一提供

## 兼容迁移模式

当前推荐固定使用以下迁移方式：

1. 先建立 `platform.core.<domain>` 新入口。
2. 保留历史路径作为兼容别名或薄转发壳。
3. 选择少量真实上层调用切到 core 入口。
4. 跑语法检查和局部验证。
5. 文档记录本轮收口范围与仍保留的旧路径。

这样可以避免一轮里大面积回改，也便于在脏工作区中持续推进。

## 与多端拆壳的关系

`platform.core` 是未来桌面壳和移动壳接入共享核心的直接连接点。

关系可以概括为：

- `domain/app/ui` 只依赖 `platform.core`
- `desktop shell` 提供 desktop 版本的实现
- `mobile shell` 提供 mobile 版本的实现
- `dev shell` 保留当前浏览器 + 本地 dev 接口实现

## 下一阶段推荐顺序

结合当前项目状态，建议顺序为：

1. `assets`
2. `files`
3. `host`
4. 补齐更多 `storage source`

理由：

- `keys` 与 `storage` 已有样板，适合复制模式
- `bodyFigureSource` 是非常典型的 dev 直连资源能力，适合成为 `assets` 第一刀
- `files/host` 是后续 exe / apk 必须面对的高价值入口，应尽早先定 contract 再动代码