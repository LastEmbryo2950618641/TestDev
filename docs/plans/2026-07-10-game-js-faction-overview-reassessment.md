# 2026-07-10 game.js faction overview reassessment

## 背景

本阶段重新检查了 `publish/game.js` 与 `publish/ui/faction/overview-view-helpers.js`，目的是确认此前 faction overview 方向是否适合继续抽离。

## 当前结论

- `publish/game.js` 顶层结构当前仍然完整，可继续进行小步重构。
- `criticalActionFallback` 相关抽离保持稳定，说明当前兼容壳模式可继续沿用。
- `publish/ui/faction/overview-view-helpers.js` 目前只承载了一个较小的纯展示子集。
- `publish/game.js` 中 faction overview 仍保留大量原始逻辑，尚未进入安全的“真实实现迁移完成”状态。
- `game.js` 当前这段 faction 逻辑包含较多中文显示异常内容；在未先完成编码/语义校验前，不适合继续直接做大块搬移。

## 风险判断

如果现在继续强行抽离 faction overview：

- 很容易把尚未校验的显示文本、分类分支、摘要逻辑一起带走。
- 容易把“半迁移状态”进一步扩大成“多处实现并存”。
- 会提高玩法回归风险，也会提高后续 exe / apk 共用层梳理时的辨识成本。

## 当前建议

本轮先不要继续大规模抽离 faction overview 主体逻辑。

优先顺序建议如下：

1. 保持 `criticalAction` 这类已经验证稳定的 helper 抽离路线。
2. faction 方向只允许继续抽“纯展示、无中文语义歧义、无状态写入”的小函数。
3. 如果要继续 faction 拆分，必须先补一个更细的字段/分支映射说明，再迁移调用方。

## 对后续会话的约束

- 不要因为 `publish/ui/faction/overview-view-helpers.js` 已存在，就假设 faction overview 已完成迁移。
- 不要直接删除 `game.js` 中原有 faction overview 逻辑。
- 若继续处理 faction，优先挑选单个纯函数级别的 helper，并在迁移前后记录验证点。
