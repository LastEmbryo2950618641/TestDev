# 世界观固化设定

为 AI RPG 视觉小说生成世界《{世界}》的固化世界观设定。

## 模板构成拆分

1. 任务定位：生成世界级固化资料，不生成单回合剧情。
2. 当前剧情上下文：提供作品、角色或剧情摘要。
3. 背景 background：世界总体背景。
4. 势力 factions：世界中的核心组织或阵营。
5. 特殊职业 specialJobs：该世界有代表性的职业/能力体系。
6. 职业等级 jobRanks：等级、阶位、职级或成长体系。
7. 核心规则 coreRules：世界运行规则。
8. 日历 calendar：世界时间单位。
9. 世界线 worldline：时间范围、事件、剧情索引、势力图。
10. 输出格式：一行紧凑 JSON。

## 可调项说明

- 想世界更详细：增加 factions、specialJobs、coreRules 数量上限。
- 想输出更短：降低每个字段字数限制。
- 想强化原作剧情：加强 storyIndexes 和 worldline 规则。
- 想减少原创：强调必须来自剧情上下文。

## 当前剧情上下文

{剧情上下文}

## 字段拆分规则

### 1. worldTag

- 必须等于或贴近《{世界}》。
- 用于后续词条、职业、世界线归属。

### 2. background

- 不超过80字。
- 概括世界时代、核心冲突、基础设定。

### 3. factions

- 2到4个。
- 每个 desc 不超过30字。
- 只写世界中真正重要的组织、阵营、国家、机构。

### 4. specialJobs

- 1到4个。
- 每个 desc 不超过30字。
- 表示该世界特有或显著的职业/能力体系。

### 5. jobRanks

- 3到6项。
- 表示等级、阶位、职位、能力成长层次。

### 6. coreRules

- 3到6项。
- 每项不超过24字。
- 写世界运行规则，不写剧情摘要。

### 7. calendar

- label：纪年或日历名。
- months：月份或阶段名。
- days：每月天数。
- hours：一天中的时段名。
- units：年月日时单位。

### 8. worldline

1. timeRange 是世界范围时间[时间1 - 时间2]。
2. events 是异世界事件数组，每个含 eventId、name、time、summary、detail、storyIndexes、factionIds、status。
3. storyIndexes 是剧情索引摘要数组，只能写 1 到 5 个短字符串，例如“主线开端”“家庭线索”，绝对不要输出连续数字列表。
4. factionMap 是势力对象键值对，key=势力ID。
5. factionMap value 必须含 势力ID、名称、类型、属性、关系网、当前目标、近期决策、状态。
6. 属性是 key:value；关系网 value 为 -100 到 100；状态只能是 正常/危机/扩张/衰退。

## 输出规则

1. 只返回一行紧凑 JSON，不要 Markdown，不要换行，不要解释。
2. 严格控制长度：background 不超过60字；factions 2到3个，每个 desc 不超过20字；specialJobs 1到3个，每个 desc 不超过20字；jobRanks 3到5项；coreRules 3到5项，每项不超过18字。
3. 必须生成 worldline 并写入，但 events 最多 1 个，storyIndexes 最多 5 个短字符串，factionMap 最多 3 个势力。
4. 不要输出连续数字数组、长编号列表或长篇剧情索引；不要生成世界专属属性字段，它会从能力维度文档固化。

## 返回 JSON 格式

只返回一个 JSON 对象。字段规范如下：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| worldTag | string | 是 | 世界标签，必须等于或贴近《{世界}》。 |
| background | string | 是 | 80 字内世界背景。 |
| factions | array<object> | 是 | 2 到 4 个核心组织、阵营、国家或机构。 |
| specialJobs | array<object> | 是 | 1 到 4 个特殊职业或能力体系。 |
| jobRanks | array<string> | 是 | 3 到 6 项等级、阶位、职位或成长层次。 |
| coreRules | array<string> | 是 | 3 到 6 项世界运行规则，每项 24 字内。 |
| calendar | object | 是 | 世界日历定义。 |
| worldline | object | 是 | 世界线、事件索引与势力图。 |

### 嵌套对象规范

| 路径 | 类型 | 必填字段 | 说明 |
| --- | --- | --- | --- |
| factions[] | object | name, desc | `desc` 不超过 30 字。 |
| specialJobs[] | object | name, desc | `desc` 不超过 30 字。 |
| calendar | object | label, months, days, hours, units | `months` 与 `hours` 为字符串数组；`days` 为数字；`units` 含 year/month/day/hour。 |
| worldline | object | timeRange, events, storyIndexes, factionMap | `timeRange` 格式为 `[时间1 - 时间2]`，`storyIndexes` 最多 5 个短字符串。 |
| worldline.events[] | object | eventId, name, time, summary, detail, storyIndexes, factionIds, status | 最多 1 个事件；`storyIndexes` 最多 5 个短字符串。 |
| worldline.factionMap.* | object | 势力ID, 名称, 类型, 属性, 关系网, 当前目标, 近期决策, 状态 | `关系网` 的数值为 -100 到 100；`状态` 只能是 正常/危机/扩张/衰退。 |

### 最小结构示意

```json
{
  "worldTag": "{世界}",
  "background": "背景介绍",
  "factions": [{ "name": "势力名", "desc": "说明" }],
  "specialJobs": [{ "name": "特殊职业", "desc": "说明" }],
  "jobRanks": ["等级体系"],
  "coreRules": ["世界规则"],
  "calendar": { "label": "纪年名", "months": ["月份"], "days": 30, "hours": ["时段名"], "units": { "year": "年", "month": "月", "day": "日", "hour": "时" } },
  "worldline": { "timeRange": "[时间1 - 时间2]", "events": [], "storyIndexes": [], "factionMap": {} }
}
```
