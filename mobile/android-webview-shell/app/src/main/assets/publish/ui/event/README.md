# Event UI Helpers

该目录用于承载事件模块中的只读展示 helper。

当前已覆盖：

- 事件类型 tabs 展示派生
- 当前 tab 下的事件列表派生
- 当前选中事件派生
- 事件 meta 文本拼装
- 事件状态标签派生
- 随机事件概率展示
- 事件详情区空态文案
- 事件详情面板展示对象
- 事件总面板展示对象
- 事件模块通用标签与按钮文案

当前模块分层：

- `view-helpers.js`：兼容聚合入口
- `panel-view-helpers.js`：事件详情/总面板展示对象
- `label-view-helpers.js`：事件模块通用 label、按钮与空态文案

当前不放：

- 事件写回
- 随机抽取与触发记录
- 提示词上下文主链
- 平台能力
- 持久化流程
- 高副作用流程装配

当前阶段判断：

- `event` 当前更适合停留在 `ui/event + eventSystem(规则中心) + event-actions(编排壳)` 结构
- 后续若没有新的天然规则聚合点，不建议为了目录对称性强行新建 `domain/event`
- 后续若继续推进，优先保持“展示先落 ui，规则中心继续留在 eventSystem，动作继续留在 event-actions”的顺序

当前停手边界：

- 不在该目录中加入事件抽取与触发流程
- 不在该目录中加入提示词上下文拼装
- 不在该目录中加入状态写回或持久化逻辑
- 不把 `eventSystem` 已承担的规则职责再次复制进新的 helper 层

当前样板类型：

- 已有规则中心下的渐进 UI 收口样板

当前参考文档：

- `docs/architecture/event-ui-helper-boundary-2026-07-10.md`
- `docs/plans/2026-07-11-event-display-refactor-cross-module-validation-plan.md`
- `docs/architecture/three-sample-playbook-2026-07-11.md`
