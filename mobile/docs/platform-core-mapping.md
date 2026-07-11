# Mobile Platform Core Mapping

## 目标
为未来 Android `apk` 宿主壳明确 `platform.core.*` 在移动端的推荐实现落点，避免移动工程启动时把平台差异重新散写回共享模块。

## 宿主建议
当前建议优先走 Capacitor 方向；若只是最短路径验证运行，可先做 Android WebView 最小原型，但长期仍建议回到更完整的宿主桥接方案。

## 映射清单
### `platform.core.host`
移动端建议职责：
- 返回 `kind() === 'mobile'`
- `isDesktop() === false`
- `isMobile() === true`
- `isDev()` 依据移动调试模式判断
- `capabilities()` 暴露：
  - 文件访问能力是否可用
  - 本地存储能力
  - WebView / bridge 可用性
  - 权限状态摘要
- `ready()` 在 WebView bridge 就绪后 resolve

推荐落点：
- `mobile/shell/bridge/host.*`

### `platform.core.files`
移动端建议职责：
- 封装移动文件选取与导出
- 屏蔽浏览器 file picker 与移动宿主差异
- 统一导入导出 contract

推荐落点：
- `mobile/shell/bridge/files.*`

### `platform.core.storage`
移动端建议职责：
- 沿用共享 `storage.backend/source` 合约
- 视宿主能力决定是否继续用 Web 存储或接原生持久化
- 为 slot/raw/settings 提供移动版本 source

推荐落点：
- `mobile/shell/bridge/storage.*`

### `platform.core.assets`
移动端建议职责：
- 屏蔽 APK 内静态资源路径差异
- 对 body-figure 等资源提供一致访问入口
- 避免业务模块拼接移动资源 URL

推荐落点：
- `mobile/shell/bridge/assets.*`

### `platform.core.keys`
移动端建议职责：
- 若移动端允许本地 provider key，则统一通过宿主安全读取
- 若移动端不适合放本地 key，应在宿主层明确禁用或改用远端方案

推荐落点：
- `mobile/shell/bridge/keys.*`

## 不应做的事
- 不把剧情逻辑搬进移动桥接层
- 不让共享业务模块直接调用 Android / WebView API
- 不复制 `publish/` 运行时模块到移动壳中维护

## 第一阶段最小落地顺序
1. `host`
2. `storage`
3. `files`
4. `assets`
5. `keys`
