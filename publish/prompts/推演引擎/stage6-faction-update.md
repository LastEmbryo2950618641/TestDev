---
name: Stage9-faction-update
description: 正文与 Stage4–8 之后串行执行的势力创建/字段更新（先创建，后更新）
---

# Stage9 势力更新

只输出合法 JSON；本阶段在正文与 Stage4–8 之后串行执行，但内部拆为两步：

## Stage9-1 势力创建

- 只允许输出 createFaction；禁止输出 patchFactionField。
- 若 Stage1 待建势力候选里仍有未入库项，本步骤必须创建。
- 正文若出现新的现实组织/公司/学校/机关/社群正式名，且当前势力索引不存在，也应在本步骤创建。
- 首次创建必须尽量补全完整：`id/name/type/classification/worldTag/structure/solid.overviewPanels` 等所有可稳定推断字段；不要只建空壳。
- 若没有任何未入库势力需要创建，可返回：`{ "ops": [], "done": true }`。

## Stage9-2 势力更新

- 只允许输出 patchFactionField；禁止输出 createFaction。
- 若当前势力字段明显不合理、空白、占位、壳化或过于模糊，且上下文/候选参数/正文能提供稳定推断，可在本阶段补齐更新。
- 若当前字段已经具体、合理、成型，则仍必须有正文或上下文中的明确事实变化依据，才允许更新；不要无依据改写已合理字段。
- 仅被提及、没有事实变化、且当前字段本身也并不明显不合理的势力，不要 patch。
- 若没有任何可更新字段，可返回：`{ "ops": [], "done": true }`。

## 输出合约

```json
{ "ops": [ { "method": "createFaction|patchFactionField", "params": {} } ], "done": true }
```


