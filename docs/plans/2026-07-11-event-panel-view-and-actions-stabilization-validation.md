# 2026-07-11 event-panel-view-and-actions-stabilization-validation

## 目标

在不改变事件系统行为逻辑的前提下：

- 修复 `publish/event-actions.js` 中阻断语法校验的历史编码污染
- 将事件 App 的 header / tabs / 列表空状态补齐为 `eventPanelView()` 消费模式

## 本轮范围

- 稳定化 `publish/event-actions.js`
- 新增 `eventPanelView()`
- 迁移事件 header / tabs / list empty state 模板
- 保留事件新增、删除、筛选、概率设置、提示词上下文生成逻辑不变

## 改动文件

- `publish/ui/event/view-helpers.js`
- `publish/event-actions.js`
- `publish/index.html`

## 稳定化处理

本轮修复了 `publish/event-actions.js` 中少量历史乱码/断裂字符串，主要包括：

- 概率设置提示文案
- 新增事件失败提示文案
- Stage1 事件提示词上下文文案
- 事件上下文 block 文案

目标是让 `event-actions.js` 重新通过 `node --check`，在此基础上继续做只读显示层迁移。

## 新增聚合对象

`eventPanelView()` 输出：

- `title`
- `description`
- `probabilityFieldLabel`
- `probabilityValue`
- `backButtonText`
- `tabs`
- `listEmptyText`

## 模板迁移

已迁移：

- 事件 header
- 事件 tabs
- 事件列表空状态

详情面板此前已迁移为：

- `selectedEventDetailView()`

因此 `event` 现在已有：

- `eventPanelView()`
- `selectedEventDetailView()`

## 验证

已执行：

```powershell
node --check publish/ui/event/view-helpers.js
node --check publish/event-actions.js
```

并使用 Node 逐行读取 `publish/index.html` 目标区间，确认：

- header 已消费 `view.title / view.description / view.probabilityFieldLabel / view.backButtonText`
- tabs 已消费 `view.tabs`
- 列表空状态已消费 `view.listEmptyText`

## 收益

`event` 模块现在从单一 detail 样板升级为更完整的 panel + detail 双层样板，可继续作为其他轻量模块的复制参考。
