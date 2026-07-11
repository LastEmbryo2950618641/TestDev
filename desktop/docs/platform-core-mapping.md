# Desktop Platform Core Mapping

## 目标
为未来 Windows `exe` 宿主壳明确 `platform.core.*` 在桌面端的推荐实现落点，避免桌面工程启动时把平台差异重新散写回共享模块。

## 宿主建议
当前建议优先以 Electron 作为第一阶段桌面宿主草图；若后续共享边界稳定，再评估 Tauri 收敛体积与分发方案。

## 映射清单
### `platform.core.host`
桌面端建议职责：
- 返回 `kind() === 'desktop'`
- `isDesktop() === true`
- `isMobile() === false`
- `isDev()` 依据桌面壳运行模式判断
- `capabilities()` 暴露：
  - 文件访问
  - 本地存储
  - 桌面窗口能力
  - 可选原生通知
- `ready()` 在桥接层就绪后 resolve

推荐落点：
- `desktop/shell/bridge/host.*`
- 由桌面 preload / bridge 层挂到共享运行时

### `platform.core.files`
桌面端建议职责：
- `readText(path)`
- `writeText(path, value)`
- `readJson(path)`
- `writeJson(path, value)`
- `pickFile(options)`
- `saveFile(options)`

桌面优先实现原因：
- Windows `exe` 最适合最早补齐宿主文件能力
- 可直接对接角色卡、导入导出、资源读写需求

推荐落点：
- `desktop/shell/bridge/files.*`

### `platform.core.storage`
桌面端建议职责：
- 沿用共享 `storage.backend/source` 合约
- 将浏览器 `localStorage` fallback 替换为桌面持久化实现
- 对 slot/raw/settings 读写提供桌面版本 source

推荐落点：
- `desktop/shell/bridge/storage.*`

### `platform.core.assets`
桌面端建议职责：
- 统一 dev / 打包后资源路径
- 屏蔽桌面壳内资源根路径差异
- 继续为 body-figure 等资源提供相同 contract

推荐落点：
- `desktop/shell/bridge/assets.*`

### `platform.core.keys`
桌面端建议职责：
- 允许桌面宿主从安全位置读取 provider key
- 不让业务模块自己决定 key 文件位置

推荐落点：
- `desktop/shell/bridge/keys.*`

## 不应做的事
- 不把剧情逻辑搬进桌面桥接层
- 不让共享业务模块直接调用 Electron / Node API
- 不复制 `publish/` 运行时模块到桌面壳中维护

## 第一阶段最小落地顺序
1. `host`
2. `files`
3. `storage`
4. `assets`
5. `keys`
