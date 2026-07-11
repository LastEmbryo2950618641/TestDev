# 2026-07-11 Worktree Risk Audit

## 1. 目的

本文档用于记录当前工作树中已经观察到的高风险文件、谨慎推进区与安全推进区。

目标不是评价这些文件“好不好”，而是帮助后续会话在继续推进以下长期目标时，先避开明显高风险区：

- 低耦合
- 高复用
- 玩法逻辑不变
- 低关联影响风险
- 为 `window exe` / `android apk` 做渐进式复用准备
- 持续规范 `publish/` 目录结构

## 2. 当前观察方法

本轮判断主要基于：

- 当前 `git diff --stat`
- 现有架构边界文档
- 已有模块状态图与迁移模式文档
- 文件中已观察到的编码污染、历史修复痕迹与高副作用链提示

说明：

- 本文档是推进策略参考，不等同于代码质量评审。
- 某文件被列为高风险，不代表不能改；只代表后续改动必须先补计划和边界说明。

## 3. 安全推进区

这些区域更适合继续小步推进，只做只读 helper / 纯格式化 / 轻量规则收敛：

### `publish/ui/real-world/`

原因：

- 已形成主题 helper 文件落位
- 已验证“真实 helper 文件 + 聚合入口 + 动作入口保留”模式
- 展示层与运行时分层趋势清晰

建议只继续做：

- 地图信息面板只读摘要
- 室内标题/标签/列表包装
- 控制信息展示格式化

### `publish/ui/settings/`

原因：

- 已有稳定 helper 样板
- 当前收益主要来自只读展示层扩展
- 不需要进入请求或保存主链

建议只继续做：

- 设置摘要文本
- provider / model 只读派生展示
- AI 输出限制相关的只读文案

### `publish/ui/faction/`

原因：

- 已形成详情页/组织树 helper 收口方向
- 继续扩展只读展示 helper 风险较低

建议只继续做：

- 详情页派生文本
- 组织树只读节点包装
- 总览页只读说明文案

### `publish/domain/control/`

原因：

- 当前已形成较清晰的规则 helper 聚集区
- 多个控制相关轻规则已下沉
- 继续扩展复用价值较高

建议只继续做：

- 状态标签
- 约束判断
- 轻量派生摘要

## 4. 谨慎推进区

这些区域不是不能改，但后续推进前必须先补计划或边界说明，并优先做最小范围编辑。

### `publish/settings-actions.js`

观察：

- 当前文件 diff 面较大
- 文件中已可见编码污染痕迹
- 同时承载请求、保存、provider 管理与一部分展示派生

推进建议：

- 优先继续把真实 helper 落到 `publish/ui/settings/`
- 动作入口只做最小兼容转发
- 避免继续在上半段请求/保存链做结构化替换

### `publish/real-world-map-actions.js`

观察：

- 当前文件体积大、职责混合
- 同时涉及室内视图、runtime cache、交互与绘制
- 历史上已有兼容转发和局部修复痕迹

推进建议：

- 继续只抽只读展示 helper
- 不进入 cache、绘制、调度链
- 优先通过 `ui/real-world/*` 承接真实实现

### `publish/faction-actions.js`

观察：

- 当前已开始向兼容动作入口演进
- 但仍承载初始化、同步链、组织森林协作
- 易误入 `orgTerritory` / `company` / `membership` 连锁区

推进建议：

- 只继续从详情页和总览页抽只读 helper
- 不进入初始化主链与同步主链

### `publish/worldline-actions.js`

观察：

- 已有修复与 helper 下沉痕迹
- 当前仍承担写回编排和数据组合职责
- 进一步拆分容易误入事件写回链

推进建议：

- 只继续抽极小纯 helper
- 不进入 `updateWorldlineFromTurn()`、`appendWorldlineEvent()` 等写回链

## 5. 默认停手区

这些区域当前应默认视为停手或问题驱动处理区，而不是继续常规结构推进的主战场。

### `publish/save-actions.js`

原因：

- 高耦合后段仍在
- 直接连接持久化、恢复与存档主链
- 继续推进很容易扩散影响面

默认策略：

- 只在明确问题驱动下处理
- 否则优先补边界文档，不继续深拆

### `publish/loading-actions.js`

原因：

- 启动时序与稳定性优先级高于继续拆分
- 黑屏、预热、初始化顺序属于系统级风险

默认策略：

- 不以继续拆目录为目标
- 仅在黑屏、进度条异常、启动链问题驱动下处理

### `publish/company-actions.js`

原因：

- 已有编码污染风险提示
- 中文密集且历史上有修复痕迹
- 不适合作为当前阶段的常规推进点

默认策略：

- 非必要不进入深改
- 只有出现明确纯展示切口且编码安全时才考虑

## 6. 文档层谨慎区

以下文件当前 diff 面较大，后续不宜频繁反复编辑：

- `README.md`
- `docs/architecture/ai-development-workflow.md`
- `docs/architecture/directory-evolution.md`
- `docs/architecture/multi-platform-boundary.md`
- `docs/architecture/project-structure.md`

建议：

- 优先新增小型阶段文档、边界文档、计划文档
- 避免反复大改根 README 或大型总览文档
- 如果必须改这些文件，先确认不是在覆盖已有未整理的历史改动

## 7. 当前默认推进顺序

后续继续推进时，默认优先级建议保持：

1. `real-world` 的只读展示 helper
2. `settings` 的只读展示 helper
3. `faction` 的只读展示 helper
4. `control` 的轻规则 / 状态 helper

默认暂缓：

- `save`
- `loading`
- `company`
- 任何需要同时改玩法与结构边界的大文件重写

## 8. 对后续会话的使用方式

后续会话在继续改代码前，建议至少先看：

- `docs/plans/2026-07-11-worktree-risk-audit.md`
- `docs/plans/2026-07-11-phase2-module-normalization-roadmap.md`
- `docs/architecture/module-status-map-2026-07-10.md`
- 对应模块的边界文档

如果准备继续修改一个被列为“谨慎推进区”或“默认停手区”的文件，应先回答：

1. 为什么这次必须碰这个文件。
2. 为什么不能先把真实 helper 落到更安全的新文件。
3. 这一步是否会把工作推进到写回链、持久化链、启动链或宿主差异链。

## 补充观察（2026-07-11 settings 稳定化）

- settings 已从“谨慎推进区”升级为“P0 语法稳定化优先区”
- 依据：
`node --check publish/ui/settings/view-helpers.js` 与 
`node --check publish/settings-actions.js` 当前都失败
- 后续应优先遵循 docs/architecture/settings-stability-boundary-2026-07-11.md 的分批处理策略

