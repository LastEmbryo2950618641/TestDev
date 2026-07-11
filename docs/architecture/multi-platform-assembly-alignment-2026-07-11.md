# Multi-Platform Assembly Alignment Note

本文档用于固定 browser / desktop / mobile 三端平台装配层的统一方向，确保后续继续拆 shared runtime 时不把平台差异重新扩散回玩法层。

## 一、当前三端形状

### browser

入口：

- `publish/platform/browser-core.js`

当前能力：

- `attachBrowserPlatformCore(target)`
- `readBrowserUiSettings(target, key)`
- 默认提供 `platform.core.storage.localSettingsSource`

### desktop

入口：

- `desktop/shell/assembly-entry.js`

当前能力：

- `attachDesktopPlatformCore(target)`
- 装配 `host / files / storage / assets / keys`
- 当前仍以 draft bridge 为主，不直接承载玩法代码

### mobile

入口：

- `mobile/shell/assembly-example.js`

当前能力：

- `attachMobilePlatformCore(target)`
- 装配 `host / files / storage / assets / keys`

## 二、统一目标形状

后续统一为：

- browser: `attachBrowserPlatformCore(target)`
- desktop: `attachDesktopPlatformCore(target)`
- mobile: `attachMobilePlatformCore(target)`

三端都只负责装配：

- `platform.core.host`
- `platform.core.files`
- `platform.core.storage`
- `platform.core.assets`
- `platform.core.keys`

玩法层禁止直接依赖：

- `window.electron`
- `window.tauri`
- `Android WebView bridge`
- 本地绝对路径
- 平台专属文件 API

## 三、当前差异

1. browser 侧偏向默认实现
2. desktop / mobile 侧偏向宿主桥接
3. browser 已有独立自检脚本
4. desktop 已补独立装配入口与自检脚本
5. mobile 仍以 example 命名，后续适合升级为正式 `assembly-entry.js`

## 四、后续推荐顺序

1. 先保持三端装配入口命名与职责一致
2. 再逐步把平台存储、文件、资源、密钥访问统一收口到 shared contract
3. 最后再做旧入口接线，不先去碰高风险大文件

## 五、当前结论

本轮推进后，多端装配层已经不再只是分散草图，而是开始形成统一 attach 边界。这为后续 `exe / apk / browser` 共用业务核心提供了更稳定的结构基础。
