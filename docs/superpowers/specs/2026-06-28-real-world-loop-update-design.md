# 现实推演链路与更新设计

## 目标

调整现实推演 Loop Agent 的阶段职责，解决以下问题：

- 正文推演越过玩家本次行动边界。
- Stage 3A 预筛选 skills 导致情绪、感觉、身体状态等更新被漏掉。
- 地点、势力、角色资料应在正文生成前进入上下文，而不是在结算阶段临时固化。
- 性经历更新需要明确参与双方，并且双方各自记录一次。
- 处女状态、破处人、初体验对象需要作为性历史事实单独记录。

## 总体链路

现实推演调整为四段职责清晰的链路：

1. Stage 1：上下文路由与补全。
2. Stage 2：行动范围内充分推演。
3. Stage 3A：基础结算字段生成。
4. Stage 3B：最多 4 个紧凑更新组全量检查并输出紧凑 JSON 更新。

核心原则：正文前补上下文，正文中只推演本次行动，正文后全量检查状态变化。

## 全局 AI 返回紧凑格式规则

所有现实推演链路中的 AI 请求返回都必须使用紧凑格式。

### JSON 返回

所有 JSON 返回必须满足：

- 只输出合法 JSON。
- 不输出 Markdown。
- 不输出代码块。
- 不输出解释文字。
- 不输出缩进。
- 不输出换行符。
- 不输出制表符。
- 不输出不可见字符。
- 字符串值内部也不得包含换行符、制表符或不可见字符。

示例：

```json
{"genericUpdates":[]}
```

### 正文返回

Stage 2 正文和 continuation 虽然不是 JSON，也必须满足：

- 不输出 Markdown。
- 不输出标题。
- 不输出任务说明。
- 不输出多段换行。
- 不输出制表符。
- 不输出不可见字符。
- 只返回紧凑正文文本。

### 解析前清洗

应用层在解析 AI 返回前应执行统一清洗：

- 去除首尾空白。
- 移除零宽字符等不可见字符。
- 对 JSON 响应，拒绝或修复包裹代码块。
- 对 JSON 字符串内部异常换行，按既有安全策略压缩为空格或判为非法。

该规则适用于 Stage 1、Stage 2、Stage 2 continuation、Stage 3A、Stage 3B 所有分组。

## Stage 1：上下文路由与补全

Stage 1 只负责判断为了正确生成本次行动范围内正文，需要载入哪些上下文资料。

### 输入

Stage 1 使用紧凑输入：

- 本次行动。
- 当前场景摘要。
- 当前地点。
- 当前时间。
- 当前玩家状态摘要。
- 最近现实推演摘要。
- 当前已载入角色、地点、势力、物品清单。
- 可请求资料类型清单。

### 输出

Stage 1 输出合法紧凑 JSON：

```json
{"participants":[],"needed":[],"missingContext":false,"reason":""}
```

字段含义：

- `participants`：本回合参与者、旁观者、被提及对象。
- `needed`：正文生成前必须载入或补全的资料请求。
- `missingContext`：是否存在缺失但必要的上下文。
- `reason`：简短说明。

### participants 规则

Stage 1 必须识别：

- 玩家是否直接参与。
- 直接互动对象是谁。
- 旁观者是谁。
- 被提及但未参与的人是谁。
- 哪些角色需要进入后续更新上下文包。

示例：

```json
{"participants":[{"type":"player","id":"player-self","name":"玩家","role":"actor"},{"type":"character","idOrName":"刘思琪","name":"刘思琪","role":"direct-target"}],"needed":[],"missingContext":false,"reason":"本回合直接互动对象已识别"}
```

### needed 规则

只请求与本次行动直接相关的最小资料：

- 角色卡：本次行动直接涉及某角色。
- 关系/亲密资料：涉及对话、互动、亲密、冲突。
- 身体/情绪基线：涉及身体状态、感觉、性/亲密互动。
- 地点资料：正文需要环境、空间、可见细节。
- 势力/组织：行动涉及组织身份、权力、背景影响。
- 物品资料：行动使用、获得、损坏、转移物品。

Stage 1 禁止写正文、禁止结算、禁止推演后续结果、禁止创造未知设定、禁止为了“可能有用”请求大量资料。

## Stage 2：行动范围内充分推演

Stage 2 保留充分推演，但必须严格限制在玩家本次输入行动范围内。

### 允许描写

- 玩家输入行动的动作过程。
- 身体感受。
- 周围环境变化。
- 可见细节。
- 他人反应。
- 对话回应。
- 直接短期连锁影响。

### 禁止越界

- 不替玩家执行下一步新行动。
- 不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。
- 不为了满足字数继续推进新剧情或新性行为阶段。
- 不改写已发生事实。
- 不新增无证据的身份、关系、地点或现实背景。

核心规则：写足“本次行动内发生什么”，不写“下一步可能发生什么”。

### continuation 规则

Stage 2 continuation 只用于补完截断句或让当前正文自然收束。

禁止 continuation：

- 扩展新动作阶段。
- 继续推进未输入行为。
- 为凑够 900-1200 字而追加新情节。
- 重复正文尾部。

continuation 应只输出正文 suffix，保持紧凑文本。

## Stage 3A：基础结算字段生成

Stage 3A 不再选择 skills，也不再输出 `groups`。

### 输出

Stage 3A 只输出：

```json
{"elapsedSeconds":180,"status":"当前状态","quest":"当前目标","choices":["行动一","行动二","行动三","行动四"],"sceneTitle":"场景标题","locationName":"地点名"}
```

### 移除内容

Stage 3A 移除：

- `groups`。
- update skills 判断。
- init skills 判断。
- 哪些分组需要运行的推理。

核心原则：Stage 3A 只负责回合基础结果，不负责裁剪更新范围。

## Stage 3B：普通更新组全量运行

Stage 3A 后固定执行最多 4 个紧凑更新组：

- `metrics`：情绪、感觉。
- `bodySex`：身体状态、性经历、性历史、亲密相关穿着/外观状态。
- `survival`：生命体征、系统状态。
- `worldSocialInventory`：关系、角色卡、地图、势力、泛用世界变化、物品。

其中 `worldSocialInventory` 由原 `worldSocial` 与 `inventory` 合并，确保更新请求总数控制在 4 次以内。

每组必须完整检查本组允许的全部更新类型。只有完整检查后确认本组没有明确变化，才允许返回：

```json
{"genericUpdates":[]}
```

通用提示词原则：

```text
你必须完整检查本组允许的所有更新类型；凡是阶段2正文已经确认的变化都必须返回，不能只返回最显眼的一项。只有在完整检查后确认本组没有任何明确变化时，才允许返回 {"genericUpdates":[]}。禁止猜测正文未确认的未来变化。
```

Stage 3B 禁止跨组写入：

- `metrics` 只写情绪/感觉。
- `bodySex` 只写身体状态、性经历、性历史、亲密相关穿着/外观状态。
- `worldSocialInventory` 禁止写情绪、感觉、身体状态、性经历、性历史和亲密相关穿着状态；只写关系、角色卡非亲密字段、地图、势力、泛用世界变化、物品。

## 紧凑更新上下文包

Stage 3B 不再给每组完整大上下文，而是为每组构造最小必要上下文包。

通用字段：

- 本次行动。
- Stage 2 正文。
- Stage 3A 度过时间。
- 当前地点。
- 本回合参与者。

### metricsContext

只包含：

- 相关参与者当前 `metrics.emotions`。
- 相关参与者当前 `metrics.temporaryEmotions`。
- 相关参与者当前 `metrics.playerFeelings`。
- 相关参与者当前 `metrics.temporaryPlayerFeelings`。
- 本次行动。
- Stage 2 正文。
- 本回合参与者。

metrics 组必须完整检查：

- 固定情绪。
- 临时情绪。
- 固定感觉。
- 临时感觉。

正文中出现明确短时反应，例如紧张、羞耻、兴奋、快感、疼痛、压迫感、眩晕等，不允许直接返回空数组。

### bodySexContext

只包含：

- 相关参与者当前 `bodyStatus`。
- 相关参与者当前 `intimacy.sexualExperienceCount`。
- 相关参与者当前 `intimacy.sexualExperienceParts`。
- 相关参与者当前 `intimacy.sexualHistory`。
- 相关参与者当前亲密相关穿着/外观状态。
- 本回合参与者。
- 本次行动。
- Stage 2 正文。

bodySex 组必须完整检查：

- `body-status`。
- `sexual-experience`。
- `sexual-history`。
- 亲密相关穿着/外观状态。

正文有身体接触、压迫、摩擦、疼痛、潮湿、疲劳、敏感等明确状态时，不能只输出 `sexual-experience` 而漏掉 `body-status`。正文有衣物被推开、掀起、解开、拉下、破损、脱下等明确变化时，不能漏掉穿着/外观状态更新。

### survivalContext

只包含：

- 相关主体当前生命体征。
- 相关系统状态。
- 本次行动。
- Stage 2 正文。
- 度过时间。

### 穿着/外观状态更新规则

亲密相关穿着状态合并到 bodySex 组处理，因为它通常直接影响身体接触、外露状态、性经历和性历史判断。

更新依据必须同时包含：

- 当前已知穿着状态。
- Stage 2 正文确认的本回合变化。

穿着更新应描述“当前实际状态”，而不是只用二值脱/穿。例如：

- 胸罩仍穿着，但被推开，胸部外露。
- 衬衫仍穿着，但扣子被解开。
- 裙子仍在身上，但被掀起。
- 连裤袜仍穿着，但局部被拉下或破损。

如果正文只确认“手伸入胸罩揉捏”，且没有确认胸罩被脱下，则不能把状态更新成“未穿胸罩”；应更新为“胸罩仍穿着，但被手伸入/推挤，胸部受到隔内衣或半外露接触”。

穿着状态更新也必须遵守行动边界：不得因为亲密行为自动推断脱衣、换衣、衣物损坏，除非 Stage 2 正文明确确认。

### worldSocialInventoryContext

只包含：

- 相关关系摘要。
- 相关角色卡非亲密字段摘要。
- 当前地点/地图摘要。
- 相关势力/组织摘要。
- 当前相关物品、背包、场景物品摘要。
- 本次行动。
- Stage 2 正文。
- 本回合参与者。

worldSocialInventory 只固化正文已确认的关系、角色卡非亲密字段、地点、势力、物品变化，不负责补正文前缺失资料，也不写亲密相关穿着状态。

## Init 更新规则

init 不属于每回合全量运行的普通更新组。

init 只负责建基线或补结构，例如：

- 新角色首次进入亲密/身体相关链路。
- 角色缺少 `intimacy` 基线。
- 角色缺少 `bodyStatus` 基线。
- 缺少这些结构会导致后续正文或更新无法正确落到角色卡。

性经历增量不由 init 表达。具体次数变化、分类次数变化、性历史变化，全部由 `bodySex` 组根据正文事实输出。

如果第一次发生插入，但目标角色还没有 `intimacy/bodyStatus`：

1. 先执行 init，补齐该角色的 `intimacy/bodyStatus` 基线。
2. 再执行 bodySex，应用本回合确认的 `sexual-experience`、`body-status`、`sexual-history` 更新。

init 的触发原因是目标角色缺少承载更新所需的基础结构，不是因为“阴部插入次数 +1”。

## 性经历双方记录规则

双方都各自记录一次。

`sexual-experience.subject` 永远表示这条记录写入谁的角色卡。

当 Stage 2 正文确认两个参与者共同参与同一亲密/性事件：

- 玩家输出一条 `sexual-experience`。
- 对方角色输出一条 `sexual-experience`。
- 多人参与时，每个正文明确参与者各自一条。

参与者只能来自 Stage 1 参与者清单和 Stage 2 正文确认事实。禁止根据 skill 名称凭空猜对象。

partner 信息可以写入 `reason/evidence`，但不作为结算定位依据。

## 性历史、处女状态与初体验对象

处女状态、破处人、初体验对象属于 `sexual-history`，不是 init，也不是单纯 `sexual-experience` 次数。

### 触发条件

当且仅当同时满足以下条件时，bodySex 组可以从处女更新为非处女：

- 进入事件前的处女事实已经被明确建立：当前 `sexualHistory` 明确为处女；或 init/既有角色资料明确建立“无既往阴道性交历史”的基线；或 Stage 2 正文在本次行动范围内明确推演并确认其此前为处女。
- Stage 2 正文明确确认发生首次阴道插入、首次性交、由本次阴道插入直接造成的处女膜破裂，或等价的首次事实。
- 该事实来自玩家本次行动范围内或正文确认的直接结果。
- 不是仅摩擦、亲吻、抚摸、前戏、口交、手指、隔衣接触。
- 不是 continuation 或模型越界自行补出的未输入新阶段。

如果当前状态是 `unknown`，但 Stage 2 正文在行动范围内明确推演出“此前为处女”的上下文事实，则 bodySex 组应先输出一条 `sexual-history` 更新，将 `virginityStatus` 从 `unknown` 更新为 `处女`，并写明处女事实证据。

如果同一回合随后又确认发生首次插入/首次性交/由本次插入造成处女膜破裂，则 bodySex 组还应继续输出转变更新，将 `virginityStatus` 从 `处女` 更新为 `非处女`，并写入 `firstVaginalPartner`、`firstVaginalAt`、`firstVaginalEvidence`；更新理由必须同时写明“此前处女事实证据”和“本次转变证据”。

如果当前状态是 `unknown`，正文只发生插入但没有明确处女事实、首次事实或处女膜破裂证据，则不能直接更新为处女或非处女。

### 被破处方更新

被破处方应输出 `sexual-history` 更新，例如：

```json
{"updateType":"sexual-history","subject":{"type":"character","id":"rushiqi","name":"刘思琪"},"field":"intimacy.sexualHistory","change":{"mode":"merge","value":{"virginityStatus":"非处女","firstVaginalPartner":{"type":"player","id":"player-self","name":"玩家"},"firstVaginalAt":"当前回合","firstVaginalEvidence":"阶段2正文明确确认首次阴道插入"}},"reasons":[{"trigger":"首次阴道插入事实确认","evidence":"正文明确确认","confidence":"confirmed"}]}
```

### 破处人更新

破处人也可输出 `sexual-history` 更新，用于记录其作为对方初体验对象的历史事实，例如：

```json
{"updateType":"sexual-history","subject":{"type":"player","id":"player-self","name":"玩家"},"field":"intimacy.sexualHistory","change":{"mode":"merge","value":{"defloweredPartners":[{"type":"character","id":"rushiqi","name":"刘思琪","at":"当前回合"}]}},"reasons":[{"trigger":"成为对方首次阴道性交对象","evidence":"正文明确确认","confidence":"confirmed"}]}
```

### 初体验对象字段

性历史中需要支持初体验对象字段：

- `firstVaginalPartner`：首次阴道性交对象。
- `firstVaginalAt`：首次阴道性交发生时间或场景摘要。
- `firstVaginalEvidence`：证据短句。
- `defloweredPartners`：主体曾作为破处人的对象列表。

这些字段属于 `intimacy.sexualHistory`。

## 错误处理与回退

- Stage 1 返回非法 JSON：降级为当前已有上下文，并保留玩家和可推断直接互动对象。
- Stage 3A 返回非法 JSON：使用默认 `elapsedSeconds/status/choices`，不阻塞 Stage 3B。
- 单个 Stage 3B 组失败：该组视为空更新，其他组继续。
- 某组输出跨组字段：normalize 或 compat 阶段丢弃非法字段。
- `sexual-experience` 只输出一方：通过测试和日志暴露，prompt 中明确要求双方各自输出。
- `sexual-history` 缺少 `firstVaginalPartner`：视为不完整更新，应在提示词和 schema 中要求补齐。

## 验证重点

实现后需要验证：

1. Stage 3A 不再输出或依赖 `groups`。
2. Stage 3B 即使 Stage 3A 没有选择 metrics，也会运行 metrics。
3. 正文有明显情绪/感觉时，metrics 不返回空。
4. 正文有身体接触、摩擦、压迫时，bodySex 不只输出 `sexual-experience`，还检查 `body-status`。
5. 双方参与性经历时，生成两条 `sexual-experience`。
6. 明确首次阴道插入或由本次插入造成处女膜破裂时，被破处方更新 `virginityStatus`、`firstVaginalPartner`、`firstVaginalAt`。
7. 明确首次阴道插入时，破处人记录 `defloweredPartners`。
8. 当前状态为 `unknown` 且正文明确建立此前处女事实时，先输出 `unknown → 处女` 的 `sexual-history` 更新。
9. 当前状态为 `unknown` 时，只有正文明确建立此前处女事实并确认本次首次事实，才允许继续转为非处女。
10. 当前状态为 `unknown` 且正文只确认插入、没有处女/首次/处女膜破裂证据时，不直接转为处女或非处女。
11. 仅亲吻、抚摸、摩擦、手指、口交时，不把处女改为非处女。
12. Stage 2 不把本次行动扩展成未输入的新阶段。
13. continuation 只补完截断句或自然收束，不推进新动作。
14. 正文确认衣物被推开、掀起、解开、拉下但未脱下时，亲密相关穿着/外观状态应保留衣物仍穿着并记录局部状态。
15. 正文没有确认脱衣时，不把穿着更新成未穿。
16. Stage 3B 更新请求总数不超过 4 次：metrics、bodySex、survival、worldSocialInventory。
17. 所有 AI 请求返回都不包含换行符、制表符、零宽字符等不可见字符。
18. JSON 返回不包含 Markdown、代码块、解释文字或缩进。
19. Stage 1 缺地点、势力、角色资料时，在正文前请求补全。

## 非目标

本设计不包含：

- 修改 UI 展示样式。
- 新增长期事件系统。
- 将所有性行为改成事件溯源模型。
- 让 worldSocialInventory 在 Stage 3 临时创造正文前需要的世界资料。
- 提交 git commit。
