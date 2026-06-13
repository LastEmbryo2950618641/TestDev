# 世界观固化设定

为 AI RPG 视觉小说生成世界《{世界}》的固化世界观设定。

## 当前剧情上下文

{剧情上下文}

## 输出规则

1. 只返回一行紧凑 JSON，不要 Markdown，不要换行，不要解释。
2. 严格控制长度：background 不超过80字；factions 2到4个，每个 desc 不超过30字；specialJobs 1到4个，每个 desc 不超过30字；jobRanks 3到6项；coreRules 3到6项，每项不超过24字。
3. 必须生成 worldline 并写入：timeRange 是世界范围时间[时间1 - 时间2]；events 是异世界事件数组，每个含 eventId、name、time、summary、detail、storyIndexes、factionIds、status。
4. storyIndexes 是原著剧情索引数组，对应 md 文档“剧情索引”。
5. factionMap 是势力对象键值对，key=势力ID，value 必须含 势力ID、名称、类型、属性、关系网、当前目标、近期决策、状态。
6. 属性是 key:value；关系网 value 为 -100 到 100；状态只能是 正常/危机/扩张/衰退。
7. 不要生成世界专属属性字段，它会从能力维度文档固化。

## 返回格式

{"worldTag":"{世界}","background":"背景介绍","factions":[{"name":"势力名","desc":"说明"}],"specialJobs":[{"name":"特殊职业","desc":"说明"}],"jobRanks":["等级体系"],"coreRules":["世界规则"],"calendar":{"label":"纪年名","months":["月份"],"days":30,"hours":["时段名"],"units":{"year":"年","month":"月","day":"日","hour":"时"}},"worldline":{"timeRange":"[时间1 - 时间2]","events":[{"eventId":"event_1","name":"事件名","time":"时间","summary":"摘要","detail":"详细信息","storyIndexes":["剧情索引1"],"factionIds":["faction_1"],"status":"进行中"}],"storyIndexes":["剧情索引1"],"factionMap":{"faction_1":{"势力ID":"faction_1","名称":"势力名","类型":"组织","属性":{"资源":"中等"},"关系网":{},"当前目标":"主要意图","近期决策":[],"状态":"正常"}}}}
