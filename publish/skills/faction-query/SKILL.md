---
id: faction.query
category: 势力查询
name: 势力系统查询与调整
method: listFactions(), getFactionField(id,panel,field), getFactionDetail(name), createFaction(payload), patchFactionField(params), searchFactionOne(keyword), listMemberships(params), getTerritoryControl(params), resolveTerritoryBrief(params)
params: id/panel/field/op/value/index/reason/name 等
returns: 势力列表（含ID与架构）、局部字段、创建完整势力、字段补丁结果
trigger: 正文前查询势力；正文后 Stage9 创建或按字段更新势力。
---

# 势力系统查询与调整 Skill

## 激活描述

正文前：默认应掌握全部势力名/ID 与组织架构；可按势力 ID + 面板 + 字段读取最新局部数据（国体/经济等）。
Stage1 若发现现实势力出现在上下文但不在列表中，可用 `createFaction` 登记为待建势力候选（附带首建建议参数，但不立即写库）。
正文后 Stage9：正文出现且未入库 → `createFaction`，且首轮尽量补全完整；已入库且正文有事实数据变化 → `patchFactionField`；仅提及无变化则不 patch。

## 可用方法

1. `listFactions()`：列出全部势力（含 id、名称、所属世界、组织架构）。
2. `getFactionField(params)`：按 `id` + 可选 `panel`（ideology/economy/politics/military/diplomacy/territory）+ `field` 读取最新一条/一组数据。
3. `searchFactionOne(keyword)` / `getFactionDetail(name)`：关键词或详情查询。
4. `createFaction(payload)`：用于势力首建资料。Stage1 只能把它登记为待建势力候选（不立即写库）；真正创建只在正文后 Stage9 执行。首次创建必须尽量补全 id、name、type、classification、worldTag、structure、solid.overviewPanels 等所有可稳定推断字段；Stage1 禁止 patch。
5. `patchFactionField(params)`：按势力 ID/字段更新。`op=set` 覆盖；`op=append` 列表末尾追加；`op=delete` 按 `index`（从 0）删除列表项。仅正文后 Stage9，且必须有正文事实变化依据。
6. `listMemberships` / `getTerritoryControl` / `resolveTerritoryBrief`：人事与控势只读。

## 使用规则

1. Stage1 只登记待建势力候选；真正创建与字段补丁写库仅 Stage9。
2. 创建必须给全量可知数据；更新只给 patch 参数。
3. 禁止抽象身份（现实社会/公民等）造势力。
4. 只写本轮确认或强相关势力，不要批量灌库。

