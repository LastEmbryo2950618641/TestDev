# Event Residual Forwarding Inventory (2026-07-12)

## 目的

这份清单用于细化 `event` 模块残余 forwarding / compat 入口的当前状态。

动作层 compat 审计已经说明：

- event 的模板层收敛已明显推进
- 但动作层仍主要通过 `viewHelpers[name]` 做转发

本文档继续回答：

- `eventViewHelperForwarders` 里每个入口更像什么
- 哪些仍属于页面只读 facade
- 哪些只是 label / 文案别名
- 哪些 forwarding 虽然仍存在，但已被新的 panel view contract 间接包住

## 审计范围

本轮聚焦：

- `publish/event-actions.js`
- `publish/ui/event/view-helpers.js`
- `publish/index.html`

## 残余入口分组

### A. 面板级只读 contract 入口

这组入口虽然仍在 compat 名义下暴露，但已经构成当前页面主消费面：

- `eventPanelView`
  - 当前页面用途：事件卡片顶层 header / tabs 共享 view
  - 当前判断：
    - 已是稳定的面板级 contract
    - 不适合作为第一批“直接删除”的目标
    - 更适合后续评估是否从 compat facade 迁到更明确的 panel surface

- `eventListView`
  - 当前页面用途：事件列表区
  - 当前判断：
    - 已形成明确的列表 contract
    - 模板主路径已依赖它，而不是 `currentEventList()`
    - 当前更像“已被新 contract 吞掉的主入口”

- `selectedEventDetailView`
  - 当前页面用途：事件详情区
  - 当前判断：
    - 已形成稳定 detail contract
    - 负责空态、标签、状态字段与触发次数展示
    - 仍不应在未设计替代对外面前贸然删掉

### B. 历史只读 facade / 查询别名

这组入口仍为动作层或 helper 链路服务，但页面主模板已不再直接把它们当展示入口：

- `currentEventList`
  - 当前用途：列表原始数据源
  - 当前判断：
    - 页面主路径已改为消费 `eventListView()`
    - 当前更像列表 panel helper 的内部依赖

- `selectedEvent`
  - 当前用途：当前选中事件对象
  - 当前判断：
    - 主要服务于 detail view 组装
    - 更像内部查询 helper，而不是长期页面入口

- `eventMeta`
  - 当前用途：事件 meta 拼装
  - 当前判断：
    - 主页面已不直接调用
    - 当前更像 detail/list panel helper 的内部依赖

- `eventStatusLabel`
  - 当前用途：状态计算
  - 当前判断：
    - 主页面通过 detail view 间接消费
    - 更像内部展示计算逻辑

- `eventTypeTabs`
  - 当前用途：tabs 数据源
  - 当前判断：
    - 当前已被 `eventPanelView()` 间接包住
    - 是典型“仍留在 compat，但主模板已不直接碰”的入口

### C. label / 文案别名入口

这组入口主要是 label helper 的 compat 暴露面：

- `eventListEmptyText`
- `eventStatusFieldLabel`
- `eventTriggeredCountFieldLabel`
- `eventHeaderDescription`
- `eventProbabilityFieldLabel`
- `eventBackButtonText`
- `selectedEventEmptyText`

当前判断：

- 这组入口本身并不承担状态写入
- 它们也不再是页面主模板直接逐个消费的主要路径
- 多数已经被：
  - `eventPanelView()`
  - `selectedEventDetailView()`
  - `eventListView()`
  间接吸收

因此它们比面板级 contract 更接近“未来可收缩的历史别名”。

### D. 仍明显不应混同为“可直接删 compat”的部分

虽然 event 没有像 worldline 那样明显的 UI 写入 helper forwarder，但以下事实仍说明它不适合立刻删 compat：

- `publish/event-actions.js` 中仍通过 `callEventViewHelper(...)` 做统一转发
- `eventsByType(...)` 与 `eventName(...)` 仍由 actions 显式经 compat 调用
- `eventSystem` 仍是规则中心，当前 forwarding 壳仍承担“动作层到展示查询层”的连接职责

这意味着：

- event 的问题不是“页面模板还没收敛”
- 而是“动作层 forwarding 壳还没有开始真正收缩”

## 当前最适合优先收缩的目标

若后续进入 event 的第一批 compat 收缩准备，更适合优先观察：

1. `eventListEmptyText`
2. `eventStatusFieldLabel`
3. `eventTriggeredCountFieldLabel`
4. `eventHeaderDescription`
5. `eventProbabilityFieldLabel`
6. `eventBackButtonText`
7. `selectedEventEmptyText`

原因：

- 它们更像 label / 文案别名
- 已被更完整的 panel/detail/list contract 间接吸收
- 相比直接碰 `eventPanelView()` / `eventListView()` / `selectedEventDetailView()`，风险通常更低

第二梯队可继续观察：

- `currentEventList`
- `selectedEvent`
- `eventMeta`
- `eventStatusLabel`
- `eventTypeTabs`

这些入口更像内部只读查询或 view 组装的中间层。

## 当前不应优先动的入口

以下入口不建议作为第一批收缩目标：

- `eventPanelView`
- `eventListView`
- `selectedEventDetailView`

原因：

- 它们已经成为当前页面主模板的稳定 contract
- 如果过早收掉，只会把模板重新推回更细粒度 helper 或散装调用
- 这会削弱当前已经形成的展示层边界

## 当前统一结论

event 的残余 forwarding 面现在更像三层结构：

- 页面主消费的 panel contract
- 已被面板 contract 间接包住的只读查询
- 更接近历史别名的 label / 文案入口

这意味着下一阶段若真的开始 event compat 迁移准备，正确顺序更适合是：

1. 先识别并收缩 label / 文案别名
2. 再审视中间查询层是否仍需要继续保留 facade
3. 最后才考虑 panel 级 contract 的对外迁移方式

而不是直接从 `eventPanelView()` 这类主 contract 下手。
