---
id: realworld.history.query
category: 现实记录查询
name: 现实世界记录查询
method: getRecentRealWorldLog(limit), searchRealWorldLog(keyword), listWorldlineIndex(), searchWorldlineByKeyword(keyword), searchWorldlineByTime(startTime,endTime,keyword,time), getWorldlinePlotRecords(plotId)
params: limit: 最近记录数量；keyword: 旧行动、地点、人物、物品或事件关键词；startTime/endTime: AI 根据当前桌面时间推断出的最小/最大时间，格式 YYYY-MM-DD HH:mm；time: 无法推断时间段时使用的日期、时间段或时间关键词；plotId: 已归纳情节编号或名称
returns: 最近现实推演记录、关键词命中的历史现实记录、世界线清单、按关键词或时间命中的世界线资料、情节关联记录
trigger: 现实世界推演中，行动涉及刚才、之前、上次、昨天、那次、记录、时间线、世界线、已归纳情节或已经发生过的现实事件时查询。
---

# 现实世界记录查询 Skill

## 激活描述

现实记录会随推演增长，默认只载入少量最近摘要。需要引用旧现实行动、地点变化或时间线事件时，应查询现实记录。

## 可用方法

1. `getRecentRealWorldLog(limit)`：读取最近若干条现实记录。
2. `searchRealWorldLog(keyword)`：按关键词搜索旧现实记录。
3. `listWorldlineIndex()`：读取世界线清单，只返回正在记录概况、最近事件索引和已归纳情节索引。
4. `searchWorldlineByKeyword(keyword)`：按人物、地点、事件、物品或组织关键词动态载入具体世界线事件与情节资料。
5. `searchWorldlineByTime(startTime,endTime,keyword,time)`：按 AI 推断的具体时间段动态载入世界线事件与情节资料；`startTime/endTime` 使用 `YYYY-MM-DD HH:mm`，可附带 `keyword` 缩小范围；无法推断具体范围时退化为 `time` 关键词查询。
6. `listWorldlinePlots()`：只查看已归纳情节目录。
7. `getWorldlinePlotRecords(plotId)`：按情节编号或名称动态载入该情节关联记录。

## 使用规则

1. 没有命中旧记录时，不得把旧事件当成既定事实。
2. 与角色记忆不同，现实记录只记录玩家本人收起手机后的现实行动。
3. 如果旧现实记录与最新状态冲突，以最新状态和已载入资料为准。
4. 世界线清单和已归纳情节目录只作为索引；需要具体细节时，按已知线索调用 `searchWorldlineByKeyword(keyword)`、`searchWorldlineByTime(startTime,endTime,keyword,time)` 或 `getWorldlinePlotRecords(plotId)`。
5. 遇到“昨天晚上”“三天前”“上周五”“14:00 到 16:00 之间”“午饭后那段”等模糊时间，必须先依据基础上下文里的桌面时间推断最小/最大时间，写成 `YYYY-MM-DD HH:mm` 后作为 `startTime/endTime` 参数；关键词仍写入 `keyword`。无法可靠推断范围时，才只传 `time` 退化为旧查询。
6. 不要为了完整背景一次性加载全部世界线；只查询本次行动必要的关键词、时间段或情节。