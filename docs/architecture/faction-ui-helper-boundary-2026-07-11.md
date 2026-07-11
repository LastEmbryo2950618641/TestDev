# Faction UI Helper Boundary Addendum（2026-07-11）

## 本轮新增安全切口

在 `faction` 详情弹窗中，继续确认了一类适合抽离到 helper 的只读展示规则：

- 顶部标签集合（成熟度 / 类型 / 层级 / 状态 / resolution / 归属）
- “规则 / 资源 / 下级势力” 这类 relation chip 列表
- 这两类规则都属于纯展示拼装，不涉及初始化、同步、可见性评分、状态写回

## 本轮新增 helper

文件：`publish/ui/faction/overview-view-helpers.js`

新增：

- `tagList(faction = null)`
- `relationChipRows(faction = null)`
- `relationChipEmptyText()`

对应兼容入口：

- `publish/faction-actions.js`
  - `selectedFactionTagList()`
  - `selectedFactionRelationChipRows()`
  - `selectedFactionRelationChipEmptyText()`

对应 UI 消费：

- `publish/index.html`
  - faction 详情弹窗顶部 tags 改为消费 `selectedFactionTagList()`
  - faction 详情弹窗 relation chip 区改为消费 `selectedFactionRelationChipRows()`

## 为什么这刀仍然安全

原因：

- 只改变模板如何读取展示数据，不改变底层 faction 数据结构
- 仍然保留旧 `faction-actions.js` 作为兼容转发壳
- 没有进入 `selectedFaction()`、`visibleFactions()`、`normalizeFactionStructure()`、`syncCompanyFaction()` 等主链
- 没有新增写回、副作用、缓存状态或异步流程

## 当前验证说明

已验证：

- `publish/ui/faction/overview-view-helpers.js` 语法可通过 `node --check`
- 新 helper / 兼容入口 / UI 引用均已落点可检索

未做强校验：

- 当前工作树中的 `publish/faction-actions.js` 在本轮之前已存在编码/字符串损坏导致的语法问题，因此无法把 `node --check publish/faction-actions.js` 作为本轮新增改动的可靠验收手段
- 在未先完成该旧文件的编码修复前，不建议继续把语法失败归因到本轮 helper 拆分

## 后续建议

继续优先顺序：

1. faction 详情弹窗中其他只读 badge / summary / empty-state
2. faction 列表行的 subtitle / note / fallback 文案
3. org chart 中仍散落在模板内的只读标签拼装

暂不建议进入：

- faction 初始化链
- faction / company / territory 同步链
- 可见性与曝光评分链
- 任何需要批量修复旧编码文件的高风险动作

## 本轮补充：change log 展示收口

继续确认 `faction` 详情弹窗中的一类低风险展示切口：

- 调整 / 新增记录（change log）列表
- 列表 key 拼装
- 标题与原因的 fallback 文案

本轮新增 helper：

- `changeLogRows(faction = null)`
- `changeLogEmptyText()`

对应兼容入口：

- `selectedFactionChangeLogRows()`
- `selectedFactionChangeLogEmptyText()`

对应 UI 消费：

- `publish/index.html` 中 faction 详情弹窗底部“调整/新增记录”区域已改为消费 helper 输出

这再次证明：

- `faction` 详情弹窗适合继续按区域把只读列表展示逐步收口
- 即使旧 action 文件存在编码风险，也可以通过“helper 真实现 + action 兼容壳 + template 消费”模式持续推进

## 本轮补充：archive 展示收口

继续确认 `faction` 详情弹窗中另一类低风险展示切口：

- 档案数量标签
- 档案列表 rows
- 档案段落 rows
- 档案空态文案

本轮新增 helper：

- `archiveCountLabel(faction = null)`
- `archiveParagraphRows(doc = null)`
- `archiveListRows(faction = null)`
- `archiveEmptyText()`

对应兼容入口：

- `selectedFactionArchiveCountLabel()`
- `selectedFactionArchiveParagraphRows()`
- `selectedFactionArchiveListRows()`
- `selectedFactionArchiveEmptyText()`

对应 UI 消费：

- `publish/index.html` 中 faction 详情弹窗“资料库/档案区”已改为消费 helper 输出

这说明：

- faction 详情弹窗的列表型区域可以继续按同一模式收口
- 只读展示层的复用边界正在从 tags、relation、change log 继续扩展到 archive 区域

## 本轮补充：structure 展示收口

继续确认 `faction` 详情弹窗结构区的一类低风险展示切口：

- 结构节点中的 role 行展示文本
- role preview 与数量拼装
- 结构空态文案

本轮新增 helper：

- `structureRoleRows(node = {})`
- `structureEmptyText()`

对应兼容入口：

- `factionStructureRoleRows(node)`
- `factionStructureEmptyText()`

对应 UI 消费：

- `publish/index.html` 中 faction 详情弹窗“组织结构”区域已改为消费 helper 输出 role rows 与 empty-state

这说明：

- 即使结构数据仍由旧链路准备，结构区最后一层展示文本仍然可以低风险收口
- faction 详情弹窗已经形成 tags / relation / archive / change log / structure 的连续展示层样板

## 本轮补充：faction 列表行展示收口

继续确认 `faction` 模块列表层的一类低风险展示切口：

- 列表行标题 fallback
- type / level / 归属 subtitle 拼装
- 行尾动作文案

本轮新增 helper：

- `listRow(faction = {})`

对应兼容入口：

- `factionListRow(faction)`

对应 UI 消费：

- `publish/index.html` 中 faction 主列表区域已改为消费 `factionListRow(faction)`

这说明：

- faction 已经从“详情弹窗展示层样板”继续扩展为“列表 + 详情”的模块级展示样板
- 后续若迁移到桌面壳或移动壳，列表行与详情区域都能优先复用 helper 输出，而不是重新在模板里拼文案

## 本轮补充：org chart 模态框展示收口

继续确认 `faction` 模块模态层的一类低风险展示切口：

- org chart 标题
- org chart 副说明
- breadcrumb 文本
- 空态文案

本轮新增 helper：

- `orgChartTitle()`
- `orgChartDescription()`
- `orgChartBreadcrumb()`
- `orgChartEmptyText()`

对应兼容入口：

- `factionOrgChartTitle()`
- `factionOrgChartDescription()`
- `factionOrgChartBreadcrumbText()`
- `factionOrgChartEmptyText()`

对应 UI 消费：

- `publish/index.html` 中 faction org chart 模态框头部与空态已改为消费 helper 输出

这说明：

- faction 模块已经从列表、详情继续扩展到模态层展示样板
- 树数据准备链与模式切换逻辑可以保持原位，只把最后一层只读文案收口到 helper

## 跨模块复制验证补充（2026-07-11）

本轮不是在 `faction` 中追求大范围新拆分，而是有意识地把已经在 `wechat` 中验证过的“展示层优先收口”方法复制到 `faction`。

本次选择的最小切口是：

- 档案列表 row 中的动作文案 `actionLabel`

真实落点：

- `publish/ui/faction/overview-view-helpers.js` 的 `archiveListRows`
- `publish/index.html` 的势力档案列表区域

这一步的意义是：

- 证明 `wechat` 中“把模板写死文案收进 row 对象”的方法可以稳定复制到 `faction`
- 继续保持 `faction-actions.js` 的初始化 / 同步 / 组织结构主链不动
- 让 `faction` 也开始从“helper 返回基础字段”进一步走向“helper 返回更完整展示对象”

本轮明确没有碰：

- `initFactionSystem()`
- `syncCompanyFaction()`
- `normalizeFactionStructure()`
- 任何状态写回与组织关系同步逻辑

这说明：

- `faction` 适合作为下一阶段的跨模块复制样板
- `wechat` 的渐进展示层收口方法不只适用于聊天/列表/弹窗页面，也适用于组织与档案类面板

## 第二刀复制验证补充（2026-07-11）

在第一刀完成档案列表 `actionLabel` 收口后，本轮继续选择了第二个更典型的模板重区：

- `changeLog` 变更记录列表与空态

本轮模板替换前的特点：

- 直接在模板中拼接 `action / field / reason`
- 直接在模板里写空态文案
- 虽然 helper 与兼容壳已经存在，但模板还没有真正切过去

本轮替换后：

- `publish/index.html` 改为消费 `selectedFactionChangeLogRows()`
- 空态改为消费 `selectedFactionChangeLogEmptyText()`
- 列表标题与原因文案完全由 helper 提供

这一步的意义是：

- 证明 `wechat` 中“列表 + 空态一起切到 helper”的方法也能稳定复制到 `faction`
- `faction` 的复制验证已经不再只是单个标签文案，而是进入完整列表展示切面
- 继续保持初始化、同步、结构生成与状态写回主链不动

因此当前可以更有把握地判断：

- `faction` 不仅适合做跨模块复制验证
- 而且已经开始具备“第二个可持续扩张的模块级展示样板”特征


## 第三刀复制验证补充（2026-07-11）

本轮继续在 `faction` 中复制“展示层优先收口”方法，选择组织结构图弹窗头部作为最小切口。

本次新增 helper：

- `orgChartBackButtonText()`
- `orgChartCloseDetailButtonText()`

同时让模板继续回收已存在的：

- `orgChartTitle()`
- `orgChartDescription()`

真实落点：

- `publish/ui/faction/overview-view-helpers.js`
- `publish/faction-actions.js`
- `publish/index.html`

这一步说明：

- `faction` 的复制验证已经从列表区、档案区、记录区继续扩展到模态头部
- 即使数据树与模式切换逻辑保持原位，最后一层标题、说明与按钮文案仍然可以独立收口
- 这进一步强化了 `faction` 作为跨模块复制样板的稳定性

## 本轮补充：structure section view 收口（2026-07-11）

继续沿跨模块复制验证推进，本轮将 `real-world` 中已验证过的 detail view object 模式复制到 `faction` 详情区头部。

本轮新增 helper：

- `structureSectionView()`

对应兼容入口：

- `selectedFactionStructureSectionView()`

对应 UI 消费：

- `publish/index.html` 中 faction 详情“组织结构”区的标题
- 打开树状图按钮文案
- 顶部说明文案

这说明：

- `faction` 不仅适合 row object，也开始适合 detail section view object
- `real-world` 的“detail view object”模式可以稳定复制到组织类详情面板
