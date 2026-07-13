# Mobile Assembly Entry Upgrade Note

本说明用于记录 `mobile/shell/assembly-example.js` 向正式 `assembly-entry.js` 的过渡约定。

## 当前状态

移动端此前已经存在：

- `attachMobilePlatformCore(target)`

但文件名仍为 `assembly-example.js`，更像草图，不利于和 browser / desktop 形成统一的正式入口约束。

## 本轮新增

- `mobile/shell/assembly-entry.js`
- `mobile/shell/assembly-entry-verify.js`

## 当前职责

`assembly-entry.js` 只负责装配：

- `platform.core.host`
- `platform.core.files`
- `platform.core.storage.mobileBridge`
- `platform.core.assets.bodyFigure`
- `platform.core.keys`

它不直接承载玩法逻辑，也不接管旧浏览器入口。

## 与旧 example 的关系

- 保留 `assembly-example.js` 作为过渡参考
- 后续新文档、自检、宿主接线应优先使用 `assembly-entry.js`

## 后续建议

1. 后续 mobile 壳接线优先基于 `assembly-entry.js`
2. 如需清理 example，应在确认没有其他会话依赖后再做
3. 三端正式入口统一为：
   - `publish/platform/browser-core.js`
   - `desktop/shell/assembly-entry.js`
   - `mobile/shell/assembly-entry.js`
