# 2026-07-11 platform keys core entry validation

## Goal

将当前 key 读取链路从历史全局别名 `platformKeySource`，收口为更明确的 `platform.core.keys` 统一入口，同时保留旧兼容别名，作为多端平台抽象的第一批真实代码入口。

## Scope

- 调整 `publish/platform/keys/source.js` 的导出结构。
- 保留 `publish/platform-key-source.js` 作为旧入口兼容壳。
- 让 `publish/local-settings.js` 优先消费新的 `platform.core.keys`。
- 不改变 DeepSeek / PixAI key 的读取行为。

## Changed Files

- `publish/platform/keys/source.js`
- `publish/platform-key-source.js`
- `publish/local-settings.js`

## Validation

1. `publish/platform/keys/source.js`
- 原先的 `window.GameModules.platform.keySource` 已收口为 `window.GameModules.platform.keys.source`。
- 同时新增稳定入口：`window.GameModules.platform.core.keys`。
- 为兼容旧代码，仍保留 `window.GameModules.platform.keySource` 指向同一实现。

2. `publish/platform-key-source.js`
- 继续作为旧脚本入口存在。
- 现在只负责把历史全局别名 `platformKeySource` 指回 `platform.core.keys` 或 `platform.keys.source`。

3. `publish/local-settings.js`
- `fetchDeepseekKeyFromDevFile()` 优先读取 `window.GameModules.platform?.core?.keys`。
- `fetchPixaiKeyFromDevFile()` 优先读取 `window.GameModules.platform?.core?.keys`。
- 若旧入口仍存在，则自动回退到 `window.GameModules.platformKeySource`。

## Checks

- `node --check publish/platform/keys/source.js`
- `node --check publish/platform-key-source.js`
- `node --check publish/local-settings.js`
- 使用 Node 逐行读取变更文件，确认：
- 新的 `platform.core.keys` 已建立
- 旧别名仍保留
- `local-settings.js` 已优先接新入口

## Result

这是“平台统一入口”路线里的第一步真实落地代码：我们没有改玩法，也没有改 key 来源逻辑，只是把一个已经存在的能力收口到了更明确的多端抽象边界。后续继续抽存档、资源访问、宿主能力时，可以沿用同样的“core 入口 + 旧别名兼容壳”模式。