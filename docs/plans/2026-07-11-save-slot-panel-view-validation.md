# 2026-07-11 save slot panel view validation

## Goal

为 save app 中的存档位列表建立统一的 rows view，降低模板对 `saveMeta()` / `formatSaveTime()` / `selectedSlot` 等零散 store 字段的直接依赖，同时保持存档读写与覆盖行为不变。

## Scope

- 在 `publish/ui/save/slot-view.js` 增加 slot row/panel view helper。
- 在 `publish/save-actions.js` 暴露 `savePanelView()` compat 入口。
- 将 `publish/index.html` 中 save app 的存档列表改为统一消费 `savePanelView().rows`。
- 不改动保存、读取、覆盖的业务流程。

## Changed Files

- `publish/ui/save/slot-view.js`
- `publish/save-actions.js`
- `publish/index.html`

## Validation

1. `publish/ui/save/slot-view.js`
- 新增 `slotRow(slot)`，统一整理单个存档位展示字段。
- 新增 `slotRows()`，统一输出存档位列表 rows。
- 新增 `savePanelView()`，目前输出 `rows`。
- row 当前统一包含：
- `key`
- `slot`
- `active`
- `exists`
- `statusText`
- `timeText`
- `label`
- `homeSummary`

2. `publish/save-actions.js`
- 新增 compat 转发 `savePanelView()`。
- 保留既有 `saveMeta()`、`formatSaveTime()` 等旧接口，兼容渐进迁移。

3. `publish/index.html`
- save app 的存档列表区块已切换为：
- `x-for="row in $store.game.savePanelView().rows"`
- 模板不再直接依赖：
- `saveMeta(slot)`
- `formatSaveTime(...)`
- `selectedSlot === slot`
- 按钮行为仍保持：
- `$store.game.loadSlot(row.slot)`
- `$store.game.overwriteSlot(row.slot)`

## Checks

- `node --check publish/ui/save/slot-view.js`
- `node --check publish/save-actions.js`
- 使用 Node 逐行读取确认 save app 列表已切换为 `savePanelView().rows`。

## Result

这一步让 save 成为新的展示层迁移样板，并且它正好位于 UI 与 storage 边界的交汇处。虽然本轮只收口了 save app 的主列表，而没有同时改主页存档位管理区，但已经拿下了最直接、最核心的存档位展示块，符合渐进迁移与低风险原则。