# 2026-07-11 cross-module view contract rollout

## Goal

将前几轮在 real-world / event / faction / calendar 中已经验证过的展示层迁移模式，上升为统一的跨模块 contract，供后续目录规范化、多端拆壳与 AI 协作时直接复用。

## New Document

- `docs/architecture/cross-module-view-contract-2026-07-11.md`

## Why This Turn Matters

- 之前已经有多个成功样板，但规则仍然分散在具体实现和会话上下文里。
- 如果不显式收敛成 contract，后续会话很容易重新在模板里直连 store，导致规范回退。
- 多端复用需要稳定的数据边界，contract 比“记忆中的做法”更可靠。

## Contract Coverage

文档明确了：

- panel/detail/section/row 的命名与推荐字段
- view helper、compat action、模板层各自的职责边界
- 渐进迁移的标准流向
- 文件布局建议
- 多端复用意义
- 已有样板映射
- 后续迁移步骤模板
- 明确禁止事项

## Outcome

这份 contract 让后续继续拆 `index.html`、整理 `publish/ui/`、规划 web core / desktop shell / mobile shell 时，有了更明确的统一依据，而不是每次重新临场判断。