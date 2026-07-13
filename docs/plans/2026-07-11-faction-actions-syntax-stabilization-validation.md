# 2026-07-11 Faction Actions Syntax Stabilization Validation

## 1. 验证目标

恢复 `publish/faction-actions.js` 的最小可校验状态，使其重新通过 `node --check`，从而恢复 `faction` 模块后续低风险展示层改造的基础验证能力。

本轮不是玩法改造，不是结构重排，而是历史语法污染稳定化。

## 2. 本轮验证切口

本轮只处理阻断语法检查的最小污染片段，具体表现为：

- 多处中文字符串因历史编码污染导致引号截断
- 默认文案、fallback 名称、reason 文本与常量比较字面量失去合法性
- 文件无法完成最基本的 `node --check`

## 3. 真实落点

- `publish/faction-actions.js`
- `docs/architecture/legacy-encoding-syntax-stabilization-backlog-2026-07-11.md`

## 4. 保持不变的内容

本轮刻意没有改变以下内容：

- `faction` 模块的初始化主链
- 组织结构生成逻辑的业务语义
- company / territory / membership 同步链
- 状态写回与存档相关行为
- 任何展示 helper 边界或模板消费结构

## 5. 结果

本轮完成后，已经成立的事实：

- `publish/faction-actions.js` 重新通过 `node --check`
- 本次修复集中在历史污染字符串，不涉及玩法行为重写
- `faction` 后续每一刀展示层改造重新具备最小语法验收条件

## 6. 证据

- 执行 `node --check publish/faction-actions.js` 已通过
- 报错推进过程中暴露的污染点已逐段替换为合法字符串字面量
- 没有引入新的 helper 迁移或状态链改造

## 7. 风险评估

已控制住的风险：

- 本轮没有混入功能开发
- 本轮没有因为修语法而顺手重排主链
- 修复方式以最小替换为主，避免扩大影响面

仍然保留的风险：

- 文件仍然体量较大，后续编辑仍需保持小步前进
- 其他旧文件仍存在编码污染，不能因为本文件恢复可校验就放松整体稳定化节奏

## 8. 未验证项

本轮没有证明以下内容：

- `faction` 的所有历史乱码都已清理完成
- 运行时行为已做完整功能验证
- 与其他模块交叉调用的所有边界都已完成稳定化

## 9. 后续建议

1. 将 `publish/faction-actions.js` 从“P0 阻断校验”降为“已恢复基础校验能力”状态
2. 下一步优先处理根 `README.md` 或 `docs/plans/_template.md` 的稳定化
3. 后续再回到 `faction` 做展示层改造时，恢复把 `node --check publish/faction-actions.js` 作为最小验收项

## 10. 适用场景补充

这份文档属于“历史污染稳定化验证”，不是功能验证，也不是展示层收口验证。

## 11. 推荐联动文档

- `docs/architecture/legacy-encoding-syntax-stabilization-backlog-2026-07-11.md`
- `docs/architecture/module-migration-priority-ladder-2026-07-11.md`
- `docs/architecture/encoding-collaboration-rules.md`
