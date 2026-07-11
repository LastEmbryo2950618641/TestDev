# 文档目录说明

`docs/` 目录用于沉淀项目开发过程中的结构化文档，目标是让后续人类协作者或 AI 会话都能快速理解：

- 游戏当前在做什么
- 需求、计划、验证分别写在哪里
- 架构边界和目录约束是什么
- 哪些改造是低风险可复制的

## 目录用途

- `requirements/`
  - 记录需求背景、目标、约束、范围、验收口径
  - 新需求优先从这里落第一份文档
- `plans/`
  - 记录实现计划、分阶段拆分、验证结果、风险控制
  - 低风险结构化改造优先先写计划，再落验证
- `architecture/`
  - 记录目录结构、模块边界、迁移模式、长期协作规则
  - 凡是会影响后续 AI 开发习惯的约束，都应优先沉淀到这里
- `game-rules/`
  - 记录玩法规则、阶段规则、提示词约束、数值口径
  - 这类文档应服务于“逻辑玩法不变”的目标，而不是随代码漂移

## 推荐阅读顺序

第一次进入项目时，建议优先阅读：

1. `README.md`
2. `docs/architecture/encoding-collaboration-rules.md`
3. `docs/architecture/ai-development-workflow.md`
4. `docs/architecture/project-structure.md`
5. 与当前模块直接相关的 boundary / playbook / plan 文档

## 推荐命名方式

- 需求文档：`YYYY-MM-DD-主题-requirement.md`
- 计划文档：`YYYY-MM-DD-主题-plan.md`
- 验证文档：`YYYY-MM-DD-主题-validation.md`
- 架构 / 规则文档：`主题.md` 或 `主题-YYYY-MM-DD.md`

## 当前最重要的模板

- `docs/requirements/_template.md`
- `docs/plans/_template.md`
- `docs/plans/_validation-template.md`

## 当前最值得参考的真实样例

- 展示层渐进收口样例：`docs/architecture/wechat-display-refactor-playbook-2026-07-11.md`
- 三类样例总览：`docs/architecture/three-sample-playbook-2026-07-11.md`
- 模块成熟度对比：`docs/architecture/module-maturity-overview-2026-07-11.md`
- 模块 README 模板与真实样例：`docs/architecture/module-readme-templates-2026-07-11.md`
- 模块迁移优先级清单：`docs/architecture/module-migration-priority-ladder-2026-07-11.md`
- 展示层对象化样板：`docs/architecture/display-object-patterns-playbook-2026-07-11.md`
- 历史污染稳定化清单：`docs/architecture/legacy-encoding-syntax-stabilization-backlog-2026-07-11.md`
- 验证样例：
  - `docs/plans/2026-07-10-ui-faction-overview-view-helpers-phase1-validation.md`
  - `docs/plans/2026-07-10-ui-real-world-display-helpers-phase2-validation.md`

## 协作约束

- 不要把需求、计划、验证混写在同一份文档里
- 不要直接在旧大文件旁边随意新建临时说明文档
- 新的目录规则、编码规则、边界规则，优先补进 `architecture/`
- 新的低风险改造，优先留下对应计划和验证文档，形成可复用样板

## 本目录服务的核心目标

这套文档体系服务于以下长期目标：

- 保证低耦合
- 提高代码复用性
- 保持逻辑玩法不变
- 降低关联性影响风险
- 为 Windows exe 与 Android apk 的多端复用做准备
- 逐步完成代码架构与目录规范化

## 新增架构文档（2026-07-11）

- docs/architecture/settings-stability-boundary-2026-07-11.md
  - 说明 settings 模块当前的 P0 语法稳定化边界、分批修复策略与验证要求

- docs/architecture/company-ui-helper-boundary-2026-07-11.md
  - 说明 company 模块当前已落地的 header / attendance / pay preview view object 边界与后续推进规则

- 多端总览入口：`docs/architecture/multi-platform-implementation-overview.md`
  - 统一查看 shared / desktop / mobile 的职责边界、当前证据和后续实施顺序
