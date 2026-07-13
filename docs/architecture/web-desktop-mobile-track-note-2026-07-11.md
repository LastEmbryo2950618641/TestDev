# Web / Desktop / Mobile Multi-Platform Track Note

本文档用于将 `web index.html` 正式纳入当前多端目标，与 Windows `exe`、Android `apk` 并列说明。

## 一、三端正式目标

当前项目的正式多端目标为：

- Web：`publish/index.html`
- Windows：`desktop/shell` -> `electron-builder` -> `exe`
- Android：`mobile/shell` -> WebView / native shell -> `apk`

## 二、共享核心原则

三端都应尽量复用：

- `publish/` 内的共享业务核心
- `publish/platform/` 中的共享平台默认能力与契约
- `window.GameModules.*` 下的中层业务入口

## 三、当前三端边界

### Web

- 真实入口仍是 `publish/index.html`
- 当前已建立 browser attach 层：`publish/platform/browser-core.js`
- 由于 `index.html` 编码与大 diff 风险，当前采用“先新增安全装配层，再择机最小接线”的策略

### Windows exe

- 已建立 desktop attach 层：`desktop/shell/assembly-entry.js`
- 已建立打包底座与 `electronDist` 稳定绕过方案
- 当前已能产出 `win-unpacked/Gamefy.exe`

### Android apk

- 已建立 mobile attach 层：`mobile/shell/assembly-entry.js`
- 当前仍以结构准备与宿主装配为主，尚未完成真实 apk 打包链

## 四、当前最重要的结构方向

不是先把每一端都做成成品，而是先让三端逐步共享：

- 平台装配边界
- 中层业务入口
- 目录规则
- 验证入口

## 五、当前已落地的中层业务样板

- `window.GameModules.localSettings`
- `window.GameModules.realWorldLogStore`

这两类中层入口已经开始把业务层与底层平台 source 解耦。

## 六、后续优先级

1. 继续扩展 `realWorldLogStore` / 后续 `characterStateStore` 的消费覆盖
2. 在不碰高风险大入口文件的前提下，继续让 web 侧先依赖 browser attach + 中层 API
3. 待入口编码治理条件清晰后，再将 `publish/index.html` 正式最小接线
