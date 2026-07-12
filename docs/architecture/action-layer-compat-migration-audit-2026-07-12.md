# Action Layer Compat Migration Audit (2026-07-12)

## 目的

这份审计文档专门记录动作层（actions）对 compat facade 的依赖方式。

前面的模板消费迁移审计，解决的是“页面模板是否仍直接认识底层结构”。

本文档补的是另一半证据：

- 哪些 actions 仍通过 `viewHelpers[name]` 动态分发
- 哪些模块已经开始把动作层职责迁到 domain service / query service / format helper
- 哪些模块未来更适合作为 compat 迁移试点

它不直接执行 compat 删除。

它的作用是为下一阶段提供可信判断：

- 页面层已经收敛后，动作层还卡在哪里
- 旧入口为什么暂时还不能删
- 不同模块下一步应先做哪类迁移准备

## 审计范围

本轮覆盖以下文件：

- `publish/company-actions.js`
- `publish/company-attendance-actions.js`
- `publish/event-actions.js`
- `publish/worldline-actions.js`

说明：

- 以当前工作树源码为准
- 本文档只看动作层依赖，不重复展开模板层消费证据
- 模板层现状请参考 `template-consumer-migration-audit-2026-07-12.md`

## company 动作层现状

### 当前 compat 依赖形态

company 当前仍明显依赖 view compat 作为动作层转发入口：

- `publish/company-actions.js`
  - 通过 `callCompanyViewHelper(name, context, ...args)` 调用
  - 实际落点是 `window.GameModules.ui.company.viewHelpers[name].call(...)`
  - 当前仍保留一组 `companyViewHelperForwarders`

- `publish/company-attendance-actions.js`
  - 仍直接定义：
    - `currentWorkAttendance() { return window.GameModules.ui.company.viewHelpers.currentWorkAttendance.call(this); }`
  - 其余考勤行为再围绕该 compat 结果继续执行

### 当前特点

- 页面模板层已经在 header / attendance / profile / org / pay / records 多处显著收敛
- 但动作层并没有出现与 worldline 类似的职责外迁
- `company-actions.js` 仍把一部分展示 helper 当作通用转发面使用
- `company-attendance-actions.js` 说明 company 甚至在子动作文件里也还直接依赖 compat 路径

### 当前判断

company 当前不是“没有进展”，而是“页面层进展明显早于动作层”。

这意味着：

- company 的展示 contract 已开始成熟
- 但动作层尚未出现真正的 compat 收缩迹象
- 未来若要继续推进，应优先设计动作层迁移计划，而不是直接动 compat 删除

### 下一阶段建议

- 先明确 `companyViewHelperForwarders` 中哪些仍属于合理 facade，哪些只是历史过渡
- 评估 `company-attendance-actions.js` 是否应获得独立的 attendance service / query helper
- 在不改玩法的前提下，逐步减少动作层对 `viewHelpers[name]` 动态转发的依赖面

## event 动作层现状

### 当前 compat 依赖形态

event 当前仍明显依赖 view compat 动态分发：

- `publish/event-actions.js`
  - 通过 `callEventViewHelper(name, context, ...args)` 调用
  - 实际落点是 `window.GameModules.ui.event.viewHelpers[name].call(...)`
  - 仍保留 `eventViewHelperForwarders`

### 当前特点

- 页面模板层已经收敛到：
  - `eventPanelView()`
  - `eventListView()`
  - `selectedEventDetailView()`
- 但动作层仍没有脱离 compat facade
- 规则中心依然更集中在 `eventSystem`
- 当前动作文件更像“行为编排 + compat 转发壳”的混合体

### 当前判断

event 的情况比 company 好一些：

- 展示 contract 已形成较稳定面板层
- 模板调用已明显收敛
- 但动作层仍未开始真正减轻 `viewHelpers[name]` 依赖

因此：

- event 适合作为动作层 compat 迁移准备的中间梯队
- 但还不适合作为第一个直接删 compat 的模块

### 下一阶段建议

- 盘清 `eventViewHelperForwarders` 中哪些只是模板服务，哪些被动作层真实依赖
- 评估事件面板相关只读查询是否可从 compat facade 进一步收拢到更稳定的查询面
- 暂不直接动 `eventSystem` 核心规则，先做依赖面审计与转发壳收缩准备

## worldline 动作层现状

### 当前 compat 依赖形态

worldline 仍保留一部分 view compat 转发：

- `publish/worldline-actions.js`
  - 通过 `callWorldlineViewHelper(name, context, ...args)` 调用
  - 实际落点是 `window.GameModules.ui.worldline.viewHelpers[name].call(...)`
  - `worldlineViewHelperForwarders` 仍存在

但它同时已经出现了明显的职责分流：

- state service：
  - `callWorldlineStateService(...)`
- query service：
  - `callWorldlineQueryService(...)`
- format helper：
  - `callWorldlineFormatHelper(...)`

而且动作文件中已经有多项方法直接落到这些更明确的边界上，例如：

- `realWorldline()` -> state service
- `loreWorldline(lore)` -> state service
- `worldlinePlots(lore)` -> query service
- `connectionWorldlineEvent(...)` -> format helper
- `updateWorldlineFromTurn(...)` -> state service
- `appendWorldlineEvent(...)` -> state service
- `worldlineFactions(lore)` -> query service

### 当前特点

- worldline 是当前唯一一个“动作层已经开始从 compat facade 向明确 domain 分层迁移”的模块
- 它仍保留 view compat 转发，但阻塞点已经不再只是“结构混乱”
- 当前更像是“少量界面入口仍留在 compat，核心状态/查询/格式职责已开始落位”

### 当前判断

worldline 仍是未来 compat 迁移试点的第一候选：

- 模板层最成熟
- 动作层也最先出现职责外迁
- 当前问题更适合用“继续缩减残余 compat 暴露面”来推进

这也是它优先级高于 event / company 的核心原因。

### 下一阶段建议

- 梳理 `worldlineViewHelperForwarders` 里哪些入口已经只是 UI facade
- 区分哪些仍必须保留为界面状态写入点，哪些可进一步迁走
- 继续沿 state / query / format 三分法推进，而不是回到大一统 actions 文件

## 当前统一结论

从动作层角度看，三个模块并不处于同一阶段：

- worldline：已开始从 compat facade 向明确 service/query/format 边界迁移
- event：模板层已收敛，但动作层仍主要依赖 compat 转发壳
- company：模板层已明显收敛，但动作层 compat 依赖更重，且子动作文件仍直接触达 compat

因此当前更合理的动作层迁移准备顺序仍然是：

1. worldline
2. event
3. company

但这个顺序的含义应理解为：

- worldline 最适合先试着收缩动作层 compat 面
- event 适合先做动作层依赖面盘点
- company 适合先设计迁移计划，不适合抢跑删壳

## 不应现在做的事

在当前证据下，仍不建议：

- 直接删除 `viewHelpers[name]` 动态分发层
- 在同一轮里同时改动作层、模板层、宿主镜像和编码清洗
- 把页面层已收敛误判成“动作层也已经准备好了”

## 建议的下一阶段动作

### 优先动作 A：worldline 动作层残余 compat 入口清单

建议下一步先盘：

- `worldlineViewHelperForwarders` 中每个入口的用途
- 哪些仍是页面只读 facade
- 哪些其实已经有更明确的 state/query/format 落点

### 优先动作 B：event 动作层 forwarding 面清单

在 worldline 之后，可继续盘：

- `eventViewHelperForwarders` 中各入口是否仍有真实动作层必要性
- 哪些 forwarding 只是历史壳，可在后续迁移中收缩

### 暂缓动作 C：company 动作层删壳

company 当前更适合：

- 先做动作层拆分计划
- 再考虑 compat forwarding 是否收缩

而不是直接启动删除。
