# 出场人物固化设定

只返回一个合法 JSON 对象，不要 Markdown、代码块、解释或换行。

## 目标锁定

本次只生成“人物基础区”的候选人物本人。候选姓名是正式姓名时，`name` 必须逐字等于候选姓名，不得同音改字、近形改字、改成玩家、亲属、联系人或关系事件里的其他人。

如果人物基础区写的是“刘思琪”，`name` 就必须是“刘思琪”，禁止输出“刘诗琪”“刘思琦”“刘思绮”等任何变体。若你认为资料里其他写法更常见，也必须服从人物基础区的姓名。

玩家资料只作为关系、住址、社会处境证据；除目标就是玩家本人外，不得把玩家字段当成当前人物字段。若候选姓名是妹妹、联系人、父亲等称谓，按命名要求和关系证据生成正式姓名。

## 玩家本人目标锁定

{玩家本人目标锁定}

## 输入区

人物预设资料：
{人物预设资料区}

人物基础区：
{人物基础区}

玩家基础资料：
{玩家基础资料区}

玩家现实身份：
{玩家现实身份区}

玩家居住家庭：
{玩家居住家庭区}

玩家人际关系：
{玩家人际关系区}

玩家备注：
{玩家备注区}

关系事件：
{关系事件区}

世界观资料：
{世界观资料区}

世界字段：{世界字段}

## 参数说明

| 参数 | 含义 | 生成时如何使用 |
| --- | --- | --- |
| `{人物预设资料区}` | 已有预设角色卡或空文本 | 有预设时优先沿用确定事实，但仍要服从目标锁定。 |
| `{人物基础区}` | 本次要生成的候选人物基础资料 | 决定当前 JSON 的主语；`name`、`role`、`relationships` 必须围绕这里的候选人物。 |
| `{玩家基础资料区}` | 玩家姓名、性别、生日等基础资料 | 只作为关系对象证据；除玩家本人目标外，不得写成当前人物字段。 |
| `{玩家现实身份区}` | 玩家职业、城市、学校/工作等现实身份 | 用于判断当前人物与玩家的现实交集和关系背景。 |
| `{玩家居住家庭区}` | 玩家居住状态、家庭成员、父母状态 | 用于补充亲属、同住、家庭压力和生活处境证据。 |
| `{玩家人际关系区}` | 玩家明确填写的人际关系 | 用于生成 `relationships`、家庭/社群/势力证据。 |
| `{玩家备注区}` | 玩家补充的角色、关系、外貌、性格、世界观等事实 | 是重要证据来源；不能忽略备注里的明确人物和关系。 |
| `{关系事件区}` | 微信联系人、同步来源或剧情关系事件 | 用于判断当前人物为何出现、与玩家的具体关系和联系。 |
| `{世界观资料区}` | 当前世界背景、势力、职业体系、世界线 | 用于判断人物设定是否符合世界规则。 |
| `{世界字段}` | 当前 RPG 字段定义和可用 key | `worldValues` 只允许填这里存在且有证据的 key。 |
| `{RPG字段列表}` | `rpgFieldReasons` 必须包含的 key 列表 | 每个 key 的值必须是中文原因句，不是数字、布尔值或数组。 |
| `{玩家本人目标锁定}` | 当目标是玩家本人时的额外约束 | 防止 AI 把亲属、联系人或关系对象误写成玩家本人。 |

## JSON 字段开发文档

| 字段 | 类型 | 必填 | 含义 | 写法要求 |
| --- | --- | --- | --- | --- |
| `name` | string | 是 | 当前人物正式姓名 | 当人物基础区给出正式姓名时必须逐字复制，不得改字。 |
| `gender` | string | 是 | 当前人物性别 | 使用人物基础区或证据区可确认的性别，不确定可留空字符串。 |
| `relationships` | string | 是 | 当前人物与他人的关系 | 格式为“关系：姓名”，多项用中文分号；关系对象不能写成当前人物本人。 |
| `role` | string | 是 | 身份、社会角色或关系定位 | 写“妹妹、同学、程序工程师、邻居”等定位，不要写长背景。 |
| `detail` | string | 是 | 背景、住址、学校/工作、处境和出现原因 | 一句话，写当前人物本人，不要混入外貌和性格。 |
| `appearance` | string | 是 | 外貌 | 一句话，只写可见形象、体貌、穿搭风格，不写性格。 |
| `personality` | string | 是 | 性格与关系边界 | 一句话，只写稳定性格和互动边界，不写外貌。 |
| `faction` | string | 是 | 首要社群名 | 通常取 `factions[0].faction`，没有则写“无”。 |
| `factions` | array | 是 | 社群角色列表 | 每项为 `{ "faction": "社群", "role": "角色", "reason": "原因句" }`。 |
| `forcePositions` | array | 是 | 势力地位列表 | 每项为 `{ "force": "势力", "position": "地位", "reason": "原因句" }`。 |
| `job` | string | 是 | 已内化职业 | 只有明确长期职业/训练时填写；学生、亲属、联系人不是职业。 |
| `jobConfirmed` | boolean | 是 | `job` 是否有确认证据 | `job` 为空时必须为 `false`。 |
| `rank` | string | 是 | 首要势力地位 | 通常取 `forcePositions[0].position`，没有可写身份定位。 |
| `skills` | array | 是 | 个人能力/技能 | 每项为 `{ "name": "能力名", "desc": "说明", "reason": "变化原因句" }`；`reason` 不能是数字。 |
| `equipment` | array | 是 | 装备 | 每项为 `{ "name": "装备名", "description": "说明", "equipSlots": ["槽位"], "reason": "变化原因句" }`。 |
| `items` | array | 是 | 随身或重要物品 | 每项为 `{ "name": "物品名", "description": "说明", "quantity": 1, "reason": "变化原因句" }`。 |
| `wearing` | array | 是 | 当前穿着 | 每项为 `{ "slot": "槽位", "name": "名称", "description": "说明", "reason": "变化原因句" }`。 |
| `worldValues` | object | 是 | 世界专属字段初始值 | 只填 `{世界字段}` 中存在且证据明确的 key；没有则 `{}`。 |
| `roleCardFieldReasons` | object | 是 | 角色卡字段原因 | 必须包含固定中文字段；每个值必须是当前人物相关原因句。 |
| `rpgFieldReasons` | object | 是 | RPG 字段变化原因 | 必须完整包含 `{RPG字段列表}`；每个值必须是中文原因句，禁止返回数字、百分比、布尔值、数组或对象。 |

## 生成规则

1. `name` 是当前人物正式姓名；当人物基础区给出正式姓名时，必须逐字复制该姓名，不能同音替换、不能改字。`relationships` 是“关系：姓名”，多项用中文分号，关系对象不得写成当前人物本人。严禁把多段关系写成链式冒号，例如不要写“妹妹：刘悠:姐姐：刘思瑶”，必须写成“妹妹：刘悠；姐姐：刘思瑶”。
2. `role` 写身份、社会角色或关系定位；`job` 只写已确认的内化职业。学生、亲属、联系人、主角、路人不是职业；不确定时 `job=""` 且 `jobConfirmed=false`。
3. `detail` 写背景、住址、学校/工作、处境和出现原因；`appearance` 只写外貌；`personality` 只写性格与关系边界。三者不要混写；每个字段控制在一句话内。
4. `factions` 是社群角色，元素含 `faction, role, reason`；用于家庭、住址、社区、社交圈等无等级归属。
5. `forcePositions` 是势力地位，元素含 `force, position, reason`；用于国家、学校、公司、部门、组织等有层级归属。现代中国现实人物通常包含“中华人民共和国 / 公民”。
6. `skills/equipment/items/wearing` 都是数组，每项必须有 `reason`。`equipment` 含 `name, description, equipSlots, reason`；`items` 含 `name, description, quantity, reason`；`wearing` 含 `slot, name, description, reason`。
7. 常规生活、上学、工作场景的 `wearing` 应包含基础槽位：内衣、上衣、内裤、下衣、袜子、鞋子；只有明确特殊事件才可返回“未穿戴”。
8. `worldValues` 只填“世界字段”中有证据的 key，没有则 `{}`。
9. `roleCardFieldReasons` 必须完整包含：姓名、所属世界、身份、职业、性别、生日、人际关系、外貌、性格、人物说明、社群角色、势力地位。每个值建议写当前人物本人相关的固化原因，尽量避免抽象套话。
10. `rpgFieldReasons` 必须完整包含这些 key：{RPG字段列表}。每个值建议结合当前人物本人的经历、训练、身体状态或处境原因。
11. 本轮不要返回 `initialMetrics`、`initial_metrics` 或任何情绪/感觉数组；初始数值会由下一步专用小请求生成。
12. 成年角色若资料明确有恋爱、身体吸引、占有欲等证据，只写进 `detail/personality/roleCardFieldReasons` 的事实依据；不要在本轮展开数值数组。

## JSON 根字段

必须使用这些英文根字段，不要把“姓名/身份/外貌”等中文字段平铺到根对象：

`name, gender, relationships, role, detail, appearance, personality, faction, factions, forcePositions, job, jobConfirmed, rank, skills, equipment, items, wearing, worldValues, roleCardFieldReasons, rpgFieldReasons`

## 最小结构

```json
{"name":"姓名","gender":"性别","relationships":"关系：姓名","role":"身份","detail":"背景","appearance":"外貌","personality":"性格","faction":"首要社群","factions":[{"faction":"社群","role":"角色","reason":"原因"}],"forcePositions":[{"force":"势力","position":"地位","reason":"原因"}],"job":"","jobConfirmed":false,"rank":"首要地位","skills":[],"equipment":[],"items":[],"wearing":[],"worldValues":{},"roleCardFieldReasons":{},"rpgFieldReasons":{}}
```
