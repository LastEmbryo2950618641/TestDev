---
id: faction.query
category: 势力查询
name: 势力系统查询与调整
method: listFactions(), searchFactionOne(keyword), getFactionDetail(name), upsertFaction(payload), addFactionPosition(payload), listMemberships(params), getTerritoryControl(params), resolveTerritoryBrief(params)
params: keyword/name/factionName/parentName/position/characterName/reason 等
returns: 势力列表、势力详情、新增或调整后的势力与职位角色
trigger: 现实世界推演中，行动涉及国家、公司、学校、社区、家庭、组织、部门、下属单位、职位、角色人事归属或组织关系时查询或调整。
---

# 势力系统查询与调整 Skill

## 激活描述

现实推演遇到国家、公司、学校、社区、家庭、组织、部门、下属单位、职位或角色人事归属时，应先查询势力系统。若确认出现新势力、已有势力的新下属单位、或某势力下新增职位/角色占位，可通过本 Skill 写入。

## 可用方法

1. `listFactions()`：列出当前已知势力。
2. `searchFactionOne(keyword)`：按关键词查询一条势力。
3. `getFactionDetail(name)`：读取势力详情、归属、组织架构、职位角色、规则和资源。
4. `searchFactionArchive(keyword)`：按关键词读取相关势力资料库最近档案片段。
5. `upsertFaction(payload)`：新增或调整势力；payload 可含 name、type、parentName、level、location、domain、scale、stance、influence、description、structure、rules、resources、relations、reason。
6. `addFactionPosition(payload)`：给势力新增职位与角色占位；payload 含 factionName、position、characterName、reason。角色未知时 characterName 写“未知”。
7. `listMemberships(params)`：列出势力或全部角色的 orgId 人事归属（membership 与 structure 占坑合并视图）；params 可含 name/factionName。
8. `getTerritoryControl(params)`：读取地点控势一行与时间轴；params 含 locationName。
9. `resolveTerritoryBrief(params)`：读取地点控势摘要（无完整时间轴）；params 含 locationName，空则返回已揭示地点控势列表。

## 使用规则

1. 玩家/角色卡已有人事归属只有指向具体公司、学校、部门、机构或明确组织时才可新增进势力系统。
2. 组织架构必须精确到职位或地位，以及该职位上的角色；角色未知时写“未知”。
3. 禁止用“现实社会”“现代社会”“现实世界”“社会”“国家”“公民”“居民”“成年人”“成年学生”等抽象身份兜底生成势力或职位。
4. 新增势力必须写 parentName；未写时系统默认归属到主角/玩家所在最高国家级势力，无法判断时才使用“中华人民共和国”。
5. 调整已有势力只能新增或有理由地修改字段，不要删除旧结构。
6. 不要为了补全世界而一次性新增大量无关势力；只写本次现实行动确认或强相关的势力。