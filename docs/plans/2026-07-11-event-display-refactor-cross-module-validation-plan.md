# Event Display Refactor Cross-Module Validation Plan（2026-07-11）

## 1. 目标

验证“展示层优先收口”方法能否在 `event` 模块中以最小成本继续复制，而不误触 `eventSystem` 与 `event-actions` 的主链职责。

## 2. 涉及模块

- `publish/ui/event/view-helpers.js`
- `publish/event-actions.js`
- `publish/index.html`
- `docs/architecture/event-ui-helper-boundary-2026-07-10.md`

## 3. 权威状态来源

本轮不改变 `eventState` 的权威来源，不改变 `eventSystem` 对事件规则的承接方式。

## 4. UI 与交互入口

本轮优先处理事件页右侧详情区域的空态展示，不碰事件触发、抽取、草稿写入与 prompt 上下文主链。

## 5. 数据与持久化影响

- 不新增状态字段
- 不修改持久化结构
- 不影响旧存档兼容

## 6. 提示词 / 规则影响

本轮不改 prompt 规则，不改 eventSystem 规则中心职责。

## 7. 风险点

- `event-actions.js` 同时承担编排与副作用桥接职责
- 若误把 `eventSystem` 中的职责再复制一层，会破坏当前冻结边界

## 8. 实施步骤

1. 在 `ui/event` 增加最小空态 helper
2. 在 `event-actions.js` 增加兼容壳
3. 在模板中替换对应空态文案消费
4. 做最小验证
5. 更新 event 边界文档

## 9. 验收步骤

- helper 方法可检索
- 兼容壳存在
- 模板已消费 helper
- `node --check` 通过
- 边界文档已同步

## 10. 后续事项

若通过，则说明 `event` 也可以作为“已有规则中心 + 渐进展示收口”类型的可复制模块继续推进。
