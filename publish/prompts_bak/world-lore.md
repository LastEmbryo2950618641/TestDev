# 世界观固化设定

为 AI RPG 视觉小说生成世界《{世界}》的极简固化世界观。只返回一行紧凑合法 JSON，不要 Markdown、解释或换行。

## 当前剧情上下文

{剧情上下文}

## 输出要求

1. 根对象必须包含：`worldTag`、`background`、`factions`、`specialJobs`、`jobRanks`、`coreRules`、`calendar`、`worldline`。
2. `worldTag` 等于或贴近《{世界}》。
3. `background` 不超过 50 字。
4. `factions` 返回 1 到 2 个对象，每个只有 `name`、`desc`，`desc` 不超过 16 字。
5. `specialJobs` 返回 1 到 2 个对象，每个只有 `name`、`desc`，`desc` 不超过 16 字。
6. `jobRanks` 返回 3 到 5 个短字符串。
7. `coreRules` 返回 3 到 5 个短字符串，每项不超过 16 字。
8. `calendar` 必须包含 `label`、`months`、`days`、`hours`、`units`；月份和时段只给少量代表项即可。
9. `worldline` 必须包含 `timeRange`、`events`、`storyIndexes`、`factionMap`。
10. `worldline.events` 最多 1 个事件；事件只写短字段，不要长篇剧情。
11. `worldline.storyIndexes` 最多 3 个短字符串，禁止连续数字列表。
12. `worldline.factionMap` 最多 2 个势力，key 使用 `faction_1`、`faction_2`。
13. 只返回完整合法 JSON，整体控制在 1200 字符内。

## 最小 JSON 形状

复制这个结构，只替换内容，保持字段完整：

```json
{"worldTag":"{世界}","background":"50字内背景","factions":[{"name":"势力","desc":"短说明"}],"specialJobs":[{"name":"职业","desc":"短说明"}],"jobRanks":["低阶","中阶","高阶"],"coreRules":["规则一","规则二","规则三"],"calendar":{"label":"公元纪年","months":["1月"],"days":30,"hours":["上午","下午","夜晚"],"units":{"year":"年","month":"月","day":"日","hour":"时"}},"worldline":{"timeRange":"[起点 - 后续]","events":[{"eventId":"event_1","name":"事件名","time":"当前时期","summary":"短摘要","detail":"短详情","storyIndexes":["主线开端"],"factionIds":["faction_1"],"status":"进行中"}],"storyIndexes":["主线开端"],"factionMap":{"faction_1":{"势力ID":"faction_1","名称":"势力","类型":"组织","属性":{"影响":"中"},"关系网":{},"当前目标":"短目标","近期决策":[],"状态":"正常"}}}}
```
