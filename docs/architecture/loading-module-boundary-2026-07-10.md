# Loading Module Boundary（2026-07-10）

本文档记录启动加载模块当前的结构状态与本轮判断。

## 当前已确认

`loading` 模块已经具备明确的多层样板基础：

- `publish/ui/loading/progress-view.js`
- `publish/app/loading/startup-warmup.js`
- `publish/app/loading/desktop-module-flow.js`
- `publish/app/loading/deferred-init-flow.js`
- `publish/loading-actions.js` 作为兼容与聚合入口

## 当前结构判断

与 `save` 不同，`loading` 不是“缺少样板”；与 `taobao` 不同，它也不是“仍有大量清晰低风险 helper 待拆”。

当前更准确的判断是：

- `loading` 的 UI / app 分层已经明显存在
- `loading-actions.js` 里剩余逻辑更贴近启动主链
- 继续拆分的风险，不在于代码量，而在于容易影响启动流程和黑屏问题

## 当前不建议继续深拆的原因

本轮不继续深入拆 `loading-actions.js`，原因包括：

- 启动主链属于高敏感区域
- 一旦拆分失误，影响会直接体现为启动异常或黑屏
- 当前已存在 `ui/loading` 与 `app/loading` 样板，收益已经不是“建立结构”，而是“继续优化细节”
- 在没有明确新边界前，继续硬拆不符合低风险优先原则

## 当前结论

`loading` 模块验证出的不是“继续迁移”，而是另一类重要结论：

- 某些模块已经达到“结构基础足够清晰”的阶段
- 后续更适合谨慎维护，而不是继续为了统一层数而重构

## 后续建议

如果未来要继续推进 `loading`，建议前提是：

1. 先出现具体需求，例如启动黑屏、进度条异常、预热时序问题。
2. 再围绕具体问题识别最小边界，而不是主动拆分。
3. 默认把 `loading` 视为高敏感模块，优先保持稳定。
