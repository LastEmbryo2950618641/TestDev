# Multi-Platform Bridge Responsibility Checklist (2026-07-11)

本文档用于把当前 `browser / desktop / mobile` 三端装配入口的职责、已接能力、待补能力和共享层依赖规则固定下来，作为后续继续推进 `window exe / android apk / web index.html` 的执行清单。

## 一、总原则

当前项目采用三层结构：

1. 业务层：`publish/` 普通模块
2. 中层：`characterStateStore / realWorldLogStore / localSettings`
3. 平台桥接层：`publish/platform/*`、`desktop/shell/*`、`mobile/shell/*`

执行原则：

- 业务层不直接依赖宿主能力
- 业务层优先依赖 store / settings 与 `platform.core.*` 共享契约
- desktop / mobile 只负责桥接宿主能力，不复制玩法逻辑
- browser 继续作为共享 runtime 的默认开发/验证入口

## 二、当前三端入口清单

### 1. browser

当前入口：

- `publish/platform/browser-core.js`

当前已接能力：

- `platform.core.storage.localSettingsSource`
- browser 默认 `localStorage` 设置读写能力
- browser 装配自检入口

当前定位：

- 作为共享 runtime 的默认宿主
- 为 web/index.html 链路提供最小默认平台能力
- 不负责 desktop / mobile 特有桥接

当前待补：

- 更明确的 browser 默认 host/files/assets/keys 策略
- 与 `publish/index.html` 的更安全接线说明
- 进一步减少高风险入口文件承担的初始化职责

### 2. desktop

当前入口：

- `desktop/shell/assembly-entry.js`

当前已接能力：

- `platform.core.host`
- `platform.core.files`
- `platform.core.storage.desktopBridge`
- `platform.core.assets.bodyFigure`
- `platform.core.keys`

当前定位：

- 为 Windows exe 提供宿主桥接底座
- 继续让共享玩法逻辑保留在 `publish/`
- 作为后续 Electron 打包链的桥接层入口

当前待补：

- 将 desktop bridge 能力与实际打包入口、资源分发、存储落地关系进一步文档化
- 继续确认哪些 bridge 仅为 draft，哪些已经可参与正式接线
- 为最终 exe 装配准备更细的运行链说明

### 3. mobile

当前入口：

- `mobile/shell/assembly-entry.js`

当前已接能力：

- `platform.core.host`
- `platform.core.files`
- `platform.core.storage.mobileBridge`
- `platform.core.assets.bodyFigure`
- `platform.core.keys`

当前定位：

- 为 Android apk / WebView 壳提供桥接装配落点
- 承接未来 Capacitor / WebView / 其他移动壳的宿主能力接入
- 不单独承载 shared 玩法逻辑

当前待补：

- 移动壳最终形态选择后的桥接细化
- 文件/存储/资源桥接与 Android 实际宿主 API 的映射关系
- Android 打包链所需运行说明

## 三、共享层当前应依赖的契约

共享层应优先依赖：

- `window.GameModules.characterStateStore`
- `window.GameModules.realWorldLogStore`
- `window.GameModules.localSettings`
- `window.GameModules.platform.core.host`
- `window.GameModules.platform.core.files`
- `window.GameModules.platform.core.storage`
- `window.GameModules.platform.core.assets`
- `window.GameModules.platform.core.keys`

共享层不应继续新增依赖：

- `window.electron`
- `window.tauri`
- Android WebView 全局对象
- 宿主私有文件路径
- 平台专有全局桥接对象

## 四、当前阶段性判断

截至当前状态：

1. 业务层 `characterStateStore / realWorldLogStore` 收口已基本完成
2. 平台桥接层已开始形成稳定入口：
   - browser -> `attachBrowserPlatformCore`
   - desktop -> `attachDesktopPlatformCore`
   - mobile -> `attachMobilePlatformCore`
3. 当前更需要推进的是“桥接职责继续清晰化”，而不是继续误扫业务层

## 五、下一阶段执行清单

### A. browser / web

1. 保持 `publish/index.html` 为高风险入口，继续避免暴力改写
2. 为 browser 默认 bridge 能力补更明确的运行说明
3. 继续把业务初始化从大入口往共享层/桥接层搬出

### B. desktop / exe

1. 继续明确 desktop bridge 与打包链的关系
2. 继续收口 exe 所需运行清单：宿主能力、资源、存储、入口装配
3. 保证 exe 只复用 shared runtime，不复制玩法层

### C. mobile / apk

1. 先固定移动壳只负责 bridge，不负责玩法逻辑
2. 梳理 Android 需要的 host/files/storage/assets/keys 映射
3. 为后续壳层实现预留 shared runtime 统一接线点

## 六、与当前验证的关系

当前以下验证继续作为桥接主干的基础证据：

```bash
node publish/platform/browser-core-verify.js
node desktop/shell/assembly-entry-verify.js
node mobile/shell/assembly-entry-verify.js
node publish/character-state-store-verify.js
node publish/real-world-log-store-verify.js
```

这些验证当前能证明：

- 三端装配入口仍可挂接既定能力
- 共享 store 主干仍稳定
- 当前文档结论与现有代码状态一致
