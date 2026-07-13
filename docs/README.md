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

## 当前协作核心文档

- AI 开发工作流：`docs/architecture/ai-development-workflow.md`
- 目录落点执行规则：`docs/architecture/ai-directory-landing-rules.md`
- 编码与安全编辑协作规则：`docs/architecture/encoding-collaboration-rules.md`

## 推荐阅读顺序

第一次进入项目时，建议优先阅读：

1. `README.md`
2. `docs/architecture/architecture-overview-index-2026-07-12.md`
3. `docs/architecture/project-structure.md`
4. `docs/architecture/encoding-collaboration-rules.md`
5. 与当前模块直接相关的 boundary / playbook / plan 文档

补充说明：

- `architecture-overview-index-2026-07-12.md` 作为当前阶段的稳定导航入口，优先帮助后续协作者判断“先看哪里、先不要碰哪里”。
- 若某份历史文档出现编码显示异常或明显过时，不要直接把它当成唯一权威入口；先回到 `README.md`、`docs/README.md` 与总览索引交叉确认。

## 推荐命名方式

- 需求文档：`YYYY-MM-DD-主题-requirement.md`
- 计划文档：`YYYY-MM-DD-主题-plan.md`
- 验证文档：`YYYY-MM-DD-主题-validation.md`
- 架构 / 规则文档：`主题.md` 或 `主题-YYYY-MM-DD.md`

## 当前最重要的模板

- `docs/requirements/_template.md`
- `docs/plans/_template.md`
- `docs/plans/_validation-template.md`
- `docs/superpowers/plans/2026-07-13-ai-development-workflow-repair.md`

## 当前最值得参考的真实样例

- 展示层渐进收口样例：`docs/architecture/wechat-display-refactor-playbook-2026-07-11.md`
- 三类样例总览：`docs/architecture/three-sample-playbook-2026-07-11.md`
- 模块成熟度对比：`docs/architecture/module-maturity-overview-2026-07-11.md`
- 模块 README 模板与真实样例：`docs/architecture/module-readme-templates-2026-07-11.md`
- 模块迁移优先级清单：`docs/architecture/module-migration-priority-ladder-2026-07-11.md`
- 展示层对象化样板：`docs/architecture/display-object-patterns-playbook-2026-07-11.md`
- 历史污染稳定化清单：`docs/architecture/legacy-encoding-syntax-stabilization-backlog-2026-07-11.md`
- Company 展示层阶段复核：`docs/architecture/company-ui-helper-boundary-review-2026-07-12.md`
- Worldline 展示层阶段复核：`docs/architecture/worldline-ui-helper-boundary-review-2026-07-12.md`
- Compat 清理门槛清单：`docs/architecture/compat-cleanup-gate-checklist-2026-07-12.md`
- Compat 调用链审计：`docs/architecture/compat-callsite-audit-2026-07-12.md`
- Compat 调用迁移准备清单：`docs/architecture/compat-callsite-migration-prep-2026-07-12.md`
- 第一批 compat 收缩试点 gate 清单：`docs/architecture/first-compat-reduction-pilot-gate-checklist-2026-07-12.md`
- 动作层 compat 迁移审计：`docs/architecture/action-layer-compat-migration-audit-2026-07-12.md`
- 宿主镜像同步策略说明：`docs/architecture/host-mirror-sync-strategy-note-2026-07-12.md`
- 宿主镜像同步边界清单：`docs/architecture/host-mirror-sync-boundary-checklist-2026-07-12.md`
- Worldline 残余 compat 入口清单：`docs/architecture/worldline-residual-compat-entry-inventory-2026-07-12.md`
- Worldline 首个 compat 收缩候选说明：`docs/architecture/worldline-first-compat-reduction-candidate-2026-07-12.md`
- Worldline compat 收缩阻塞说明：`docs/architecture/worldline-compat-reduction-blocking-note-2026-07-12.md`
- timelineMeta 宿主同步可行性说明：`docs/architecture/timelinemeta-host-sync-feasibility-note-2026-07-12.md`
- Event 残余 forwarding 清单：`docs/architecture/event-residual-forwarding-inventory-2026-07-12.md`
- 模板消费迁移审计：`docs/architecture/template-consumer-migration-audit-2026-07-12.md`
- Worldline 模板迁移准备：`docs/architecture/worldline-template-migration-prep-2026-07-12.md`
- WeChat chat facade 收口样例：`docs/architecture/wechat-chat-entry-forwarder-consolidation-2026-07-13.md`
- WeChat mention facade 收口样例：`docs/architecture/wechat-mention-facade-consolidation-2026-07-13.md`
- WeChat change panel facade 收口样例：`docs/architecture/wechat-change-panel-facade-consolidation-2026-07-13.md`
- WeChat app 编排抽取样例：`docs/architecture/wechat-app-orchestration-extraction-2026-07-13.md`
- WeChat incoming 编排抽取样例：`docs/architecture/wechat-incoming-orchestration-extraction-2026-07-13.md`
- WeChat memory debug 编排抽取样例：`docs/architecture/wechat-memory-debug-orchestration-extraction-2026-07-13.md`
- WeChat cleanup 编排抽取样例：`docs/architecture/wechat-cleanup-orchestration-extraction-2026-07-13.md`
- WeChat avatar crop helper 抽取样例：`docs/architecture/wechat-avatar-crop-helper-extraction-2026-07-13.md`
- WeChat album 编排抽取样例：`docs/architecture/wechat-album-orchestration-extraction-2026-07-13.md`
- WeChat worldline 编排抽取样例：`docs/architecture/wechat-worldline-orchestration-extraction-2026-07-13.md`
- 验证样例：
  - `docs/plans/2026-07-10-ui-faction-overview-view-helpers-phase1-validation.md`
  - `docs/plans/2026-07-10-ui-real-world-display-helpers-phase2-validation.md`

## 文档分层规则（2026-07-12 补充）

### 1. 哪些文档应该长期保留在根目录

以下类型可以长期保留在 `docs/architecture/` 或 `docs/plans/` 根目录：

- 长期架构规则
- 目录边界说明
- 多端职责说明
- playbook / migration / boundary / contract / roadmap
- 仍会被后续实现反复引用的 requirement / plan
- 能代表稳定做法的少量 validation 样例
- 阶段最终 handoff / final summary / requirement audit

### 2. 哪些文档默认视为过程性文档

以下类型默认不是长期核心文档：

- `draft-validation`
- `skeleton-validation`
- `runtime-entry-verification`
- 一次性 smoke-run checklist / runbook / execution-guide
- 临时 triage / quick-navigation / candidate-list
- 重复度很高、只服务于某一轮试探的 validation

这类文档允许短期存在，但后续应被删除、合并，或下沉到专门归档位置，而不是长期堆在根目录。

### 3. plans 根目录的控制规则

- `docs/plans/` 根目录优先放“还会继续指导实现”的计划文档
- 若同主题已经形成正式 `plan`，后续多轮试探性 validation 不应无限堆在同层
- 同类 validation 超过 3 份时，应考虑：
  - 只保留最能代表落地结果的 1 到 2 份
  - 其余作为过程噪音清理
- 不要把“计划”与“验证流水账”都放在根目录同等对待

### 4. architecture 根目录的控制规则

- `docs/architecture/` 根目录只保留长期边界、长期规则、长期索引
- 一次性执行指南、即时状态快照、临时导航页不应长期停留在根目录
- 若某文档主要作用只是记录某天某次尝试过程，应优先视为可清理候选

### 5. 后续 AI 协作约束

- 不要为了显得严谨就为每一个小动作都新建一份 validation 文档
- 新增文档前先判断它是“长期规则”还是“短期记录”
- 如果只是一次性尝试结果，优先合并进已有 plan / audit / summary，而不是新增平行文档
- 文档治理目标不是“数量变多”，而是“后续接手更快、更稳”

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
