# Stage1 资料路由上下文瘦身设计

## 目标

Stage1 只负责资料路由，不承担正文、场景锚定、结算或 final 更新职责。

Stage1 的输出仍为中文 K:V 查询规划，用于回答：

- 当前资料是否足够；
- 是否需要请求已有资料；
- 需要请求哪些资料；
- 哪些对象是强制出场、高优先候选、戏剧候选、禁止出场；
- 随机场外事件候选是否存在，以及无明确条件时是否禁止闯入。

Stage1 prompt 不得再包含 final JSON、正文写作、场景锚定执行、结算更新、ID 写回、Skill 执行说明或 update/init 合同。

## 当前问题

当前 `buildConfiguredPrompt()` 在 Stage1 中注入了完整基础上下文和 `skills` 文本。实际 prompt 中可能混入：

- final JSON / `elapsedSeconds` / `final.wechatActions`；
- `subject.id`、ID 写回规则；
- 正文写作规则；
- 场景锚定规则；
- Stage4 结算规则；
- update/init prompt 合同；
- Skill 方法说明、激活条件、参数、返回格式；
- 微信动作、物品操作、情绪更新等执行说明。

这些信息超出 Stage1 职责，会干扰模型做资料路由，并增加错误输出概率。

## 设计方案

采用 Stage1 专用瘦身输入路径。

新增 Stage1 路由上下文构造方法：

```js
buildStage1RoutingContext({ store, action, base, loaded, materialSession, config })
```

该方法只产出 Stage1 必需信息：

```text
模式：现实 / 操控剧情
本次行动：...
当前位置：...
当前时间：...
当前对象线索：...
已加载资料摘要：...
可请求资料目录：...
```

Stage1 prompt 使用该专用上下文，不再直接渲染完整 `base` 或完整 `skills`。

## Stage1 可请求资料目录

Stage1 看到的是中文资料请求白名单，不是底层 Skill 说明书。

目录格式示例：

```text
角色查询：搜索角色卡、已知角色列表
地点查询：当前地点上下文、查询附近地点、搜索地点
世界线查询：按关键词搜索、按时间搜索
记忆查询：搜索角色记忆窗口
微信查询：联系人列表、会话片段
公司查询：工作上下文
势力查询：搜索势力
物品查询：角色物品、搜索已知物品
作品设定查询：入口说明、常驻设定、搜索人物、搜索剧情、搜索时间线、搜索能力、搜索关系、搜索地点、搜索物品
```

目录只告诉模型可以写哪些中文资料请求，不暴露英文 `skill`、`method`、参数结构、返回格式或激活条件。

## Stage1 prompt 保留内容

`stage1-guided-query.md` 保留：

- 任务说明：只输出中文 K:V；
- 本次行动；
- Stage1 专用路由上下文；
- 已加载资料极简摘要；
- 中文资料请求目录；
- Top3 请求限制；
- 随机场外候选；
- 固定输出顺序。

固定输出顺序保持：

```text
查询规划：
资料状态：继续请求资料 / 资料已足够
地点查询：
地点查询理由：
因果查询：
因果查询理由：
冲突查询：
冲突查询理由：
强制出场：
高优先候选：
戏剧候选：
禁止出场：
随机事件候选：
随机事件闯入条件：
资料请求：无 / N条
资料请求1：...
资料请求结束：是
```

## Stage1 prompt 移除内容

Stage1 prompt 不再渲染或出现：

- `{{动态Skills}}`；
- 完整 `{{基础上下文}}`；
- final JSON 规则；
- `elapsedSeconds`；
- `final.wechatActions`；
- `subject.id` / ID 写回规则；
- 正文写作规则；
- 场景锚定执行规则；
- Stage4 结算规则；
- update/init prompt 合同；
- Skill 的参数、激活条件、返回格式；
- 微信动作、物品操作、情绪更新等执行说明。

“加载角色卡不等于出场或结算”不作为结算规则展开，只改写为 Stage1 路由边界：

```text
角色卡请求只代表可作为参考资料；不得因此把角色写入强制出场。
```

## 数据流

当前数据流：

```text
baseSnapshot + skillText + loadedText
  -> stage1-guided-query.md
```

目标数据流：

```text
buildStage1RoutingContext()
+ stage1MaterialCatalogText()
+ loadedRoutingSummary()
+ randomActiveCandidateText
  -> stage1-guided-query.md
```

Stage2、Stage3、Stage4 不受此设计影响，各自继续使用自己的 prompt 与上下文。

## 组件边界

### `real-world-agent-loop.js`

负责：

- 在 `buildConfiguredPrompt()` 中识别 Stage1；
- Stage1 使用瘦身变量渲染；
- 非 Stage1 保持现有阶段变量；
- 不再向 Stage1 注入完整 `skills`。

### `real-world-agent-context.js` / `story-agent-context.js`

负责：

- 提供最小路由上下文摘要；
- 提供中文资料请求目录；
- 提供已加载资料的短摘要；
- 现实和操控剧情共享同一 Stage1 模板，但目录内容可按 mode 裁剪。

### `stage1-guided-query.md`

负责：

- 只描述资料路由任务；
- 只包含中文 K:V 输出格式；
- 不包含正文、结算、final 或 Skill 执行说明。

## 错误处理

Stage1 解析逻辑保持现有中文 K:V 解析与评分机制。

若模型请求不存在于中文资料请求目录中的类别或动作，仍由现有白名单映射丢弃，并在 retry prompt 中提示已丢弃资料请求。

若 Stage1 已加载资料摘要显示资料足够，但模型仍重复请求同一人物、地点或路线，解析结果可保留 `droppedMaterialRequests`，并在下一轮要求收敛。

## 成功标准

Stage1 请求日志不得包含以下词或结构：

```text
elapsedSeconds
final.wechatActions
subject.id
updateRegistry
initPromptRegistry
结算对象
类型完成
正文必须
场景锚定报告
Skill：
激活条件
返回格式
```

Stage1 请求日志必须包含：

```text
查询规划：
资料状态：
强制出场：
高优先候选：
戏剧候选：
禁止出场：
随机事件候选：
随机事件闯入条件：
资料请求：
资料请求结束：是
```

Stage1 仍必须支持现实模式与操控剧情模式。

## 测试计划

新增或更新测试：

1. Stage1 prompt 不包含 final、正文、结算、Skill 执行说明。
2. Stage1 prompt 包含中文资料请求目录。
3. Stage1 prompt 包含固定中文 K:V 输出字段。
4. Stage1 仍能解析中文 K:V 查询规划。
5. 已加载资料摘要只保留 title/短摘要，不携带完整角色卡或更新合同。
6. Story mode 使用同一瘦身 Stage1 输入，并包含作品设定查询目录。

## 非目标

本设计不修复 Stage4 滑动窗口重复问题。

本设计不改变 Stage2 场景锚定、Stage3 正文或 Stage4 结算协议。

本设计不重构资料加载器、updateRegistry、initPromptRegistry 或现有 Skill 实现。

## 自审结果

- Placeholder scan：无 TBD、TODO 或未定义目标。
- Internal consistency：Stage1 只负责资料路由，数据流和组件边界一致。
- Scope check：范围聚焦于 Stage1 prompt 输入瘦身，可单独实施。
- Ambiguity check：明确列出保留内容、移除内容、成功标准和非目标。
