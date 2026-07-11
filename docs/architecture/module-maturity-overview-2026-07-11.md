# Module Maturity Overview（2026-07-11）

本文档用于在项目级别总结当前已经验证过的模块重构模式，帮助后续会话快速判断：

- 当前模块属于哪一类成熟度
- 应该优先抽什么
- 哪些链路绝对不要碰
- 什么时候应该继续代码改造，什么时候应该先补文档

## 1. 当前最成熟的展示层样板：`real-world`

### 当前成熟度

`real-world` 已经从“单个 helper 文件尝试”进入“模块级展示层样板”。

它已经具备：

- 分主题 helper 文件
- 聚合兼容入口
- 旧 actions 兼容壳
- 模板/UI 实际消费
- 多个只读读链复用同一展示规则
- 明确的停手边界文档

### 当前已形成的主题文件

- `publish/ui/real-world/map-info-view-helpers.js`
- `publish/ui/real-world/map-control-view-helpers.js`
- `publish/ui/real-world/map-interior-view-helpers.js`
- `publish/ui/real-world/map-view-helpers.js`

### 当前已验证的复用模式

#### `map-info`

已收口的展示规则包括：

- 标题 / 副标题
- description
- facts summary
- facts joined text
- facts 空态
- facts key
- facts item text

真实消费点已覆盖：

- `publish/index.html`
- `publish/real-world-prompt.js`
- `publish/inference/material-loader.js`
- `publish/real-world-map-fog.js`
- `publish/real-world-agent-location-fill.js`

这说明：

- facts 展示规则已经从“UI 局部 helper”演进为“多读链共享展示规则”
- 它适合作为未来 exe / apk / web 展示共用逻辑的参考样板

#### `map-control`

已收口的展示规则包括：

- display line 占位文案
- control history 空态
- control history key
- control history item text

真实消费点已覆盖：

- `publish/index.html` 中的地图 info 弹层
- `publish/real-world-map-actions.js` 的兼容入口
- `publish/ui/real-world/map-view-helpers.js` 的聚合转发

这说明：

- `map-control` 已经形成“helper -> 聚合 -> 兼容入口 -> UI 消费”的完整闭环
- 后续可继续沿这条模式推进更多只读列表包装

### `real-world` 的推荐推进模式

适合继续做：

- 只读 title / subtitle / summary / badge / empty-state
- 已存在重复 facts 文本拼装的读链替换
- 控制信息的只读展示包装
- 室内节点、房间、分区文案的同步 helper 化

不适合继续做：

- `showRealWorldMapInfo()` 异步 cache 链
- `realWorldMapInfoCache.*`
- 迷雾写回与 revealed 语义
- 路线补齐 / 人物地点推理 / 地点生成修正
- 任何运行时交互状态管理

### `real-world` 的结论

`real-world` 是当前项目里最值得作为“展示层标准答案”参考的模块之一。

它的价值不只是拆了多少 helper，而是：

- 已形成模块级模式
- 已有多消费点复用证据
- 已有清晰停手边界
- 与未来多端共用展示层直接相关

## 2. 当前正在形成模块级样板：`faction`

### 当前成熟度

`faction` 还没有达到 `real-world` 那样的多读链复用成熟度，但已经明显从“零散 helper”进入“组织树 + 详情面板展示规则收口”的阶段。

### 当前已收口的主要 helper

组织树与详情层当前已收口的展示规则包括：

- `roleText`
- `roleNodeSubtitle`
- `structureNodeName`
- `structureNodeEmptySummary`
- `structureNodeSummary`
- `childFactionName`
- `childFactionSummary`
- `childFactionBadge`
- `parentFallbackLabel`
- `stubDescription`
- `detailDescription`
- `stubNotice`
- `consistencyNotice`
- `reconciliationText`

### 当前样板特点

`faction` 当前最有价值的不是“拆得很多”，而是已经证明下面这条路径可行：

- 先从组织树/详情页里找只读文案
- 把降级名称、subtitle、summary、badge、空态等收口到 helper
- 保持 `faction-actions.js` 的初始化 / 同步 / 校验主链不动
- 用边界文档记录当前停手位置

### `faction` 当前明确不应进入的区域

- `initFactionSystem()`
- `syncCompanyFaction()`
- `normalizeFactionStructure()`
- `visibleFactions()` 背后的曝光评分链
- `orgTerritory / company / membership` 同步链
- 任何状态写回链

### `faction` 的推荐推进模式

适合继续做：

- 组织树节点 title / subtitle / badge / empty-state
- 详情弹窗顶部说明文案
- stub 说明、父级 fallback、占位标签
- 一切只读、轻格式化、可降级的展示规则

不适合继续做：

- 初始化主链重排
- 组织树结构生成逻辑重写
- 与 territory / company / membership 的同步逻辑改造
- 可见性 / 暴露评分逻辑下沉


### `faction` 的复制验证结果（2026-07-11 补充）

在本轮之前，`faction` 已经可以被视为“正在形成模块级样板”；但本轮之后，可以进一步确认：

- `wechat` 中已经验证过的“展示层优先收口”方法，已在 `faction` 中完成连续两刀复制验证
- 复制验证不只覆盖单个标签文案，也覆盖了完整列表与空态切面
- `faction-actions.js` 的初始化 / 同步 / 结构生成 / 状态写回主链仍保持不动

本轮已验证的两个最小复制切口包括：

1. 档案列表 row 的 `actionLabel` 收口
2. `changeLog` 列表与空态切换到 helper 消费

这意味着：

- `faction` 已经不只是“方向正确”，而是具备了被后续会话直接信任的复制证据
- 它比单次成功更接近“可持续扩张的第二模块样板”
- 后续如果第三个模块主要问题是“模板太脏、展示切面很多”，仍应优先参考 `faction` 这条路径

换句话说：

- `real-world` 继续作为跨读链展示规则复用标准答案
- `faction` 则进一步坐实为“模块内渐进展示层收口”的第一刀样板

### `faction` 的结论

`faction` 是当前“第二成熟”的展示层样板。

它的价值在于：

- 正在从单点 helper 进入模块级样板
- 和 `real-world` 相比更早期，但方向一致
- 很适合作为未来把模式复制到更多模块前的中间验证层

## 3. 当前项目级共识：什么是“安全切口”

在当前项目里，以下切口已经被反复证明是低风险且高收益的：

- 降级名称文案
- 标题 / subtitle / summary
- badge / 标签文案
- empty-state / 占位文案
- 列表项 key
- 列表项只读文本包装
- 已存在重复文本拼装规则的统一收口

这些切口的共同特征是：

- 不改变状态结构
- 不改变推演结果来源
- 不改变初始化流程
- 不改变写回链
- 多数情况下只改变模板、只读 helper、兼容入口之间的关系

## 4. 当前项目级共识：什么是“高风险链”

以下内容当前在多个模块中都应视为高风险区，除非有非常明确的边界和必要性，否则不应进入：

- 初始化主链
- 异步 cache / prewarm / paint / timeout 调度链
- 写回 / 持久化 / restore 链
- 生成结果修正链
- 曝光评分 / 可见性 / 控制状态推演链
- 多系统同步链

## 5. 当前推荐的跨模块复制策略

后续如果继续推进规范化，推荐顺序不是“按目录平均推进”，而是：

1. 先在已有成熟样板上继续巩固模式
2. 再把已经验证过的展示切口复制到第二成熟模块
3. 最后再考虑进入其他模块

当前排序建议：

1. `real-world`：成熟样板，适合作为标准答案
2. `faction`：正在形成模块级样板，适合继续扩张
3. 其他模块：应优先参考上述两条路径，而不是直接独立开新打法

## 6. 结论

当前项目已经不只是“逐个文件拆 helper”，而是开始形成两个层次的稳定模式：

- `real-world`：模块级成熟样板
- `faction`：模块级进行中样板

这两个模块共同证明了一件事：

- 只读展示层可以先行规范化
- 兼容入口可以长期保留，避免一次性大改
- 先收口展示规则，再逐步扩张消费点，是当前项目最稳的演进路径
- 这条路径天然更适合未来桌面端与移动端共用前端展示逻辑



## 3.5 当前已验证的第三类复制模块：`event`

### `event` 的第三模块验证结果（2026-07-11 补充）

`event` 的价值不在于它像 `faction` 一样适合持续清理脏模板，也不在于它像 `real-world` 一样已经形成多读链复用，而在于：

- 它已经存在一个事实上的规则中心 `eventSystem`
- 它的旧入口 `event-actions.js` 仍承担编排与副作用桥接职责
- 在这种结构下，展示层仍然可以继续做最小切口收口

本轮已验证的最小复制切口：

- 事件详情区空态文案 `selectedEventEmptyText`

这一步证明：

- 当模块内部已经有较强规则中心时，仍然可以继续沿“helper 真正实现 + 旧入口兼容壳 + 模板消费”推进
- 不需要为了目录对称性强行新建 `domain/event`
- `eventSystem` 可以继续保留规则中心角色，而展示层继续渐进收口

因此 `event` 在当前项目中的样板意义更接近：

- 第三类可复制模块：已有规则中心存在时的渐进 UI 收口样板
- 它补足了 `wechat / faction / real-world` 之外的一类情况

## 4. 双样板对照入口

如果后续会话需要在 action 与 eal-world 两种模式之间做选择，应优先阅读：

- [sample-module-comparison-2026-07-11.md](C:/Users/liuqi/Documents/TestDev/docs/architecture/sample-module-comparison-2026-07-11.md)

该文档用于回答：

- 当前问题更像模块内 UI 收口，还是跨读链展示规则复用
- 第三个模块下第一刀时更应该学谁
- 哪一种样板更适合支撑未来 exe / apk 复用边界



