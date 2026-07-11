# Save UI Helper Boundary（2026-07-10）

本文档记录存档模块在已有 `ui/save` 样板基础上的当前判断。

## 当前已确认

已存在真实实现：

- `publish/ui/save/slot-view.js`

当前已由旧入口转发的 helper：

- `findEmptySlot`
- `saveMeta`
- `formatSaveTime`

## 当前不建议继续深拆的原因

`publish/save-actions.js` 当前不仅包含存档槽位视图相关逻辑，还混入了：

- RPG 状态准备
- 角色状态修复/清洗
- 字段展示派生
- memory / archive 相关逻辑
- 多系统联动的状态读取

这意味着它后半段已经不是单纯的“save 模块 UI helper 区”，而是一个高耦合聚合入口。

## 当前结论

存档模块已经验证了“已有 `ui/save` 样板存在”这一前提，但本轮不继续硬拆，原因是：

- 再往下拆会迅速进入高耦合展示链与状态链
- 这不符合当前“低风险迁移优先”的模板原则
- 与其为了继续拆而扩大 blast radius，不如明确记下停手边界

## 后续建议

如果未来要继续推进 `save`，更建议先：

1. 识别是否能把 `save-actions.js` 中与 RPG 字段展示相关的部分单独切分出明确边界。
2. 若没有清晰边界，则优先转向其它更清晰模块，而不是在 `save-actions.js` 上继续硬拆。
