# Shell Assembly Map

## 目标
为未来 `desktop/` 与 `mobile/` 宿主壳提供统一装配边界，确保共享玩法逻辑继续留在 `publish/`，平台差异优先落到 `platform.core.*`。

## 共享核心
当前共享核心仍以 `publish/` 为主：
- 页面入口：`publish/index.html`
- 共享运行时：`publish/*.js`
- 已规范目录：
  - `publish/app/`
  - `publish/domain/`
  - `publish/platform/`
  - `publish/ui/`

这些内容应被视为 Web Core / Shared Runtime，而不是单纯的浏览器临时代码。

## 壳层边界
### `desktop/`
负责：
- 窗口生命周期
- 本地文件读写桥接
- 桌面存储实现
- 宿主环境识别
- 打包为 Windows `exe`

不负责：
- 新增剧情玩法逻辑
- 复制 `publish/` 业务模块
- 在壳内重写 UI 展示逻辑

### `mobile/`
负责：
- WebView 或壳应用入口
- 权限与文件桥接
- 移动存储实现
- 宿主环境识别
- 打包为 Android `apk`

不负责：
- 新增剧情玩法逻辑
- 复制 `publish/` 业务模块
- 在壳内重写 UI 展示逻辑

## 平台能力落点
未来若需要壳差异实现，应优先落到以下 shared contract：
- `platform.core.host`
- `platform.core.files`
- `platform.core.storage`
- `platform.core.assets`
- `platform.core.keys`

原则：
1. 共享业务模块只依赖 `platform.core.*`。
2. 宿主壳负责提供不同平台实现。
3. 保留历史兼容壳，但新增调用优先走 `platform.core.*`。

## 推荐演进顺序
1. 继续清理共享核心中的平台直连点。
2. 在 `desktop/` 提供最小宿主方案草图。
3. 在 `mobile/` 提供最小宿主方案草图。
4. 再决定具体采用 Electron / Tauri / Capacitor / Android WebView 壳等技术实现。

## 当前状态
- 目录骨架已建立。
- 现阶段仍以 `publish/` 浏览器开发链路为唯一真实运行入口。
- 壳目录当前只承载架构落点与约束，不切换现有玩法链路。
