---
id: realworld.history.query
category: 现实记录查询
name: 现实世界记录查询
method: getRecentRealWorldLog(limit), searchRealWorldLog(keyword), getWorldlinePending(), listWorldlinePlots(), getWorldlinePlotRecords(plotId)
params: limit: 最近记录数量；keyword: 旧行动、地点、时间或事件关键词；plotId: 已归纳情节编号或名称
returns: 最近现实推演记录、关键词命中的历史现实记录、正在记录时间线、已归纳情节目录或情节关联记录
trigger: 现实世界推演中，行动涉及刚才、之前、上次、昨天、那次、记录、时间线、已经发生过的现实事件时查询。
---

# 现实世界记录查询 Skill

## 激活描述

现实记录会随推演增长，默认只载入少量最近摘要。需要引用旧现实行动、地点变化或时间线事件时，应查询现实记录。

## 可用方法

1. `getRecentRealWorldLog(limit)`：读取最近若干条现实记录。
2. `searchRealWorldLog(keyword)`：按关键词搜索旧现实记录。
3. `getWorldlinePending()`：读取正在记录、尚未归纳的现实时间线记录。
4. `listWorldlinePlots()`：读取已归纳情节目录。
5. `getWorldlinePlotRecords(plotId)`：按情节编号或名称动态载入该情节关联记录。

## 使用规则

1. 没有命中旧记录时，不得把旧事件当成既定事实。
2. 与角色记忆不同，现实记录只记录玩家本人收起手机后的现实行动。
3. 如果旧现实记录与最新状态冲突，以最新状态和已载入资料为准。
4. 已归纳情节目录只作为索引；需要使用情节细节时必须调用 `getWorldlinePlotRecords(plotId)`。