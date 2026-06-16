# 出场人物固化设定

只返回一个合法 JSON 对象，不要 Markdown、代码块、解释或换行。

## 目标锁定

本次只生成“人物基础区”的候选人物本人。候选姓名是正式姓名时，不得改成玩家、亲属、联系人或关系事件里的其他人。

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

## 生成规则

1. `name` 是当前人物正式姓名；`relationships` 是“关系：姓名”，多项用中文分号，关系对象不得写成当前人物本人。
2. `role` 写身份、社会角色或关系定位；`job` 只写已确认的内化职业。学生、亲属、联系人、主角、路人不是职业；不确定时 `job=""` 且 `jobConfirmed=false`。
3. `detail` 写背景、住址、学校/工作、处境和出现原因；`appearance` 只写外貌；`personality` 只写性格与关系边界。三者不要混写；每个字段控制在一句话内。
4. `factions` 是社群角色，元素含 `faction, role, reason`；用于家庭、住址、社区、社交圈等无等级归属。
5. `forcePositions` 是势力地位，元素含 `force, position, reason`；用于国家、学校、公司、部门、组织等有层级归属。现代中国现实人物通常包含“中华人民共和国 / 公民”。
6. `skills/equipment/items/wearing` 都是数组，每项必须有 `reason`。`equipment` 含 `name, description, equipSlots, reason`；`items` 含 `name, description, quantity, reason`；`wearing` 含 `slot, name, description, reason`。
7. 常规生活、上学、工作场景的 `wearing` 应包含基础槽位：内衣、上衣、内裤、下衣、袜子、鞋子；只有明确特殊事件才可返回“未穿戴”。
8. `worldValues` 只填“世界字段”中有证据的 key，没有则 `{}`。
9. `roleCardFieldReasons` 必须完整包含：姓名、所属世界、身份、职业、性别、生日、人际关系、外貌、性格、人物说明、社群角色、势力地位。每个值写当前人物本人的具体固化原因，不要写抽象套话。
10. `rpgFieldReasons` 必须完整包含这些 key：{RPG字段列表}。每个值写当前人物本人的具体经历、训练、身体状态或处境原因。
11. 本轮不要返回 `initialMetrics`、`initial_metrics` 或任何情绪/感觉数组；初始数值会由下一步专用小请求生成。
12. 成年角色若资料明确有恋爱、身体吸引、占有欲等证据，只写进 `detail/personality/roleCardFieldReasons` 的事实依据；不要在本轮展开数值数组。

## JSON 根字段

必须使用这些英文根字段，不要把“姓名/身份/外貌”等中文字段平铺到根对象：

`name, gender, relationships, role, detail, appearance, personality, faction, factions, forcePositions, job, jobConfirmed, rank, skills, equipment, items, wearing, worldValues, roleCardFieldReasons, rpgFieldReasons`

## 最小结构

```json
{"name":"姓名","gender":"性别","relationships":"关系：姓名","role":"身份","detail":"背景","appearance":"外貌","personality":"性格","faction":"首要社群","factions":[{"faction":"社群","role":"角色","reason":"原因"}],"forcePositions":[{"force":"势力","position":"地位","reason":"原因"}],"job":"","jobConfirmed":false,"rank":"首要地位","skills":[],"equipment":[],"items":[],"wearing":[],"worldValues":{},"roleCardFieldReasons":{},"rpgFieldReasons":{}}
```
