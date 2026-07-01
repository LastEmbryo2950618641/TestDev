# Stage3 正文上下文瘦身设计

## 背景

Stage1/Stage2 已改为阶段专用 slim context，但 Stage3 正文阶段仍通过 `buildConfiguredNarrationPrompt(...)` 注入：

- `compactUpdatePromptText(base, 1800)`：来自 full `baseSnapshot(...)`。
- `config.ctx.buildLoadedText(loaded)`：来自 full 动态载入资料。

这会把 final 阶段规则、写回规则、工具回执、无事实查询结果和流程控制句带入正文 prompt，污染正文模型判断。

## 目标

Stage3 只接收“可用于正文写作的事实”和“正文写作规则”，不接收工具协议、写回协议、结算协议、查询协议或空资料噪音。

必须删除的 Stage3 正文污染：

- `时间规则：所有现实时间都以桌面时间为准；本次 final 必须返回 elapsedSeconds...`
- 所有 `subject.id` / `主体ID规则` 残留。
- `势力资料库：...暂无记录` 这类空资料。
- `需严格跟着世界线续写，保证正文对最新世界线连续性` 这句原样表述。
- `realworld.location.query.searchLocationOne`、`character.query...`、`worklore.query...` 等工具回执标题。
- `文本内容参照material-xxx`、`参照对象：...` 等工具侧元信息。
- `关键词查询：前往刘思琪房间` 这种只有查询动作、没有事实结果的回执。
- 地点资料里的流程控制句，例如“除非玩家提出新的未知地点，不要继续为同一人物地点或路线重复 request_context”。

必须保留的 Stage3 正文语义：

- 最近已发生事实和世界线连续性，但改写为正文规则，不保留 Stage1/Stage2 式原句。
- 当前地点、时间提示、场景标题、玩家本次行动。
- 场景锚定报告。
- 已加载资料中能直接用于正文的事实：人物当前所在、空间关系、可见/可听见条件、通信/微信事实、角色当前可观察状态、明确历史事实。
- 正文必须承接已发生事实，不改写已发送内容，只写本次行动直接结果。

## 推荐方案

新增 Stage3 专用正文上下文瘦身器，而不是复用 Stage1/Stage2 redaction。

新增接口：

```js
redactNarrationPollution(text = ''): string
loadedNarrationSummary(items = []): string
buildNarrationContext({ store, action, base, loaded, materialSession, sceneAnchorReport, config }): string
```

real/story context 都实现这些接口；story 可复用 real 的通用清洗逻辑，再补充 story-specific 场景/作品字段。

## 数据流

当前 Stage3 数据流：

```text
baseSnapshot/full base + buildLoadedText/full loaded
  -> buildConfiguredNarrationPrompt
  -> stage3-narration template
```

改造后：

```text
buildNarrationContext + loadedNarrationSummary + sceneAnchorReport
  -> buildConfiguredNarrationPrompt
  -> stage3-narration template
```

`buildConfiguredNarrationPrompt(...)` 应停止把 full `base` 和 full `buildLoadedText(loaded)` 直接传给 Stage3。它只渲染：

- `基础上下文`: `buildNarrationContext(...)` 输出。
- `场景锚定报告`: Stage2 输出。
- `已动态载入资料`: `loadedNarrationSummary(loaded)` 输出。
- `紧凑返回规则`: 现有 prose compact rule。

## Stage3 正文上下文内容

现实模式建议输出：

```text
模式：现实
本次行动：...
当前地点：...
当前场景：...
当前时间提示：...
玩家可写资料：...
最近事实连续性：正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。
最近世界线摘要：...
最近记录摘要：...
```

操控剧情模式建议输出：

```text
模式：操控剧情
本次行动：...
作品：...
被操控角色：...
当前场景：...
当前时间提示：...
当前目标：...
最近事实连续性：正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。
最近剧情摘要：...
```

## 动态载入资料正文摘要规则

`loadedNarrationSummary(items)` 应只保留能写进正文的事实行。

保留倾向：

- `当前位置`、`当前地点`、`空间事实`、`房间`、`门口`、`走廊`、`相邻`、`可听见`、`可看见`、`通信`、`微信`。
- 明确人物状态：在场、附近、进入、离开、路过、等待、回应、看见、听见。
- 明确历史事实或关系事实，但不得展开结算字段。

删除倾向：

- 英文工具标题和 method-like 标题：`*.query.*`、`realworld.*`、`worklore.*`。
- 工具元信息：`文本内容参照...`、`参照对象：...`、`来源ID：...`。
- 无事实查询回执：`关键词查询：...` 且没有结果事实。
- 流程控制句：`不要继续...request_context`、`不要重复请求...`、`Top3`、`资料请求`、`request_context`。
- final/settlement/write-back 字段：`elapsedSeconds`、`final.wechatActions`、`subject.id`、`主体ID规则`、`结算对象`、`类型完成`、`更新N`。
- 空字段：`暂无记录`、`未填写`、`暂无` 且没有事实内容。

标题清洗：

- 污染标题统一替换为 `资料N`。
- 安全标题可保留中文语义，如 `地点资料`、`人物资料`，但不得保留工具 method。

## Stage3 prompt 模板调整

`stage3-narration.md` 保持正文阶段定位，但调整表述：

- 保留 `基础上下文`、`场景锚定报告`、`已动态载入资料` 三段。
- `基础上下文` 的内容来自 Stage3 slim context。
- 写作规则中保留世界线连续性语义：
  - `正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。`
- 不出现用户要求删除的原句：
  - `需严格跟着世界线续写，保证正文对最新世界线连续性`

## 测试策略

新增/更新测试：

1. real Stage3 prompt pollution regression
   - 输入 base 包含 final elapsedSeconds、subject.id、主体ID规则、空势力资料库、世界线原句。
   - 输入 loaded 包含 `realworld.location.query.searchLocationOne`、`文本内容参照material-xxx`、`参照对象`、`关键词查询：前往刘思琪房间`、流程控制句。
   - 断言 Stage3 prompt 不包含这些污染。
   - 断言仍包含当前地点、空间事实、场景锚定报告、正文承接规则。

2. story Stage3 prompt pollution regression
   - 输入 base 包含世界线原句、角色数值、final rule。
   - 输入 loaded 标题为 `worklore.query.searchPeople`。
   - 断言不泄漏工具标题、final、原世界线句。
   - 断言保留作品、角色、当前场景、空间事实。

3. prompt source scan
   - `stage3-narration.md` / generated `.js` 不包含 `需严格跟着世界线续写...`、`elapsedSeconds`、`subject.id`、`结算边界：` 等污染词。

4. full regression
   - `node tests/real-world-loop-update.test.js`
   - `node tests/story-agent-guided.test.js`

## 非目标

- 不改 Stage4 结算滑动窗口。
- 不删除 Stage4 需要的 full base / settlement context。
- 不改变 Stage1/Stage2 已完成的 slim context 设计。
- 不改变正文生成长度、第二人称、越界约束等现有正文规则。

## 验收标准

- Stage3 prompt 不再出现 final/write-back/tool-query/protocol/empty archive 污染。
- Stage3 仍能看到正文必要事实：行动、地点、场景、最近事实连续性、场景锚定报告、有效动态资料事实。
- real/story 两种模式都有测试覆盖。
- `.md` prompt 修改后同步生成 `.js` 和 runtime bundle（如项目现有流程需要）。
- 所有相关 Node 测试通过。
