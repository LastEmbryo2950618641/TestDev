# 2026-07-11 platform assets bodyfigure core entry validation

## Goal

将当前 `bodyFigureSource` 资源入口收口到 `platform.core.assets.bodyFigure`，作为 `assets` 能力域的第一批真实落地代码，同时保留旧兼容别名，不改动身体参考图相关行为。

## Scope

- 调整 `publish/platform/body-figure/source.js` 导出结构。
- 保留 `publish/platform-body-figure-source.js` 作为旧兼容壳。
- 让 `publish/body-figure.js` 与 `publish/wechat-album-actions.js` 优先读取新的 core 入口。
- 不改变 dev 资源接口路径和图片/元数据保存行为。

## Changed Files

- `publish/platform/body-figure/source.js`
- `publish/platform-body-figure-source.js`
- `publish/body-figure.js`
- `publish/wechat-album-actions.js`

## Validation

1. `publish/platform/body-figure/source.js`
- 历史导出 `window.GameModules.platform.bodyFigureSource` 已提升为 `window.GameModules.platform.assets.bodyFigure`。
- 同时建立了 `window.GameModules.platform.core.assets.bodyFigure`。
- 为兼容旧路径，仍保留 `window.GameModules.platform.bodyFigureSource` 指向同一实现。

2. `publish/platform-body-figure-source.js`
- 继续作为历史全局别名壳存在。
- 现在优先把 `platformBodyFigureSource` 指向 `platform.core.assets.bodyFigure`。

3. Upstream callers
- `publish/body-figure.js` 已优先改为通过 `window.GameModules.platform.core.assets.bodyFigure` 访问资源入口。
- `publish/wechat-album-actions.js` 中生成形象图本地保存流程，也已优先改为走 `platform.core.assets.bodyFigure`。

## Checks

- `node --check publish/platform/body-figure/source.js`
- `node --check publish/platform-body-figure-source.js`
- `node --check publish/body-figure.js`
- `node --check publish/wechat-album-actions.js`
- 使用 Node 逐行读取确认：
- `platform.core.assets.bodyFigure` 已建立
- 上层已有真实调用切到 core 入口
- 旧别名仍保留

## Result

这一步让 `assets` 能力域不再停留在 contract 层，而是拥有了第一批真实 core 入口。它复用了此前 keys/storage 已验证成功的迁移模式：先建统一核心入口，再切少量真实上层调用，同时保留旧别名兼容。