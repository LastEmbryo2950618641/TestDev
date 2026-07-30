---
name: Stage9-faction-update
description: 正文与 Stage4–8 之后串行执行的势力创建/字段更新（先创建，后更新）
---

# Stage9 势力更新

只输出合法 JSON；本阶段在正文与 Stage4–8 之后串行执行，但内部拆为两步：

## Stage9-1 势力创建

- 只允许输出 createFaction；禁止输出 patchFactionField。
- 必须重新检查本轮完整上下文；只要稍微识别到可作为势力的组织线索，且尚未入库，就必须创建；即使 Stage1 候选为空，也不能跳过复查。
- 若 Stage1 待建势力候选里仍有未入库项，本步骤必须创建；正文或完整上下文中出现但 Stage1 漏记的势力线索也必须创建。
- Stage1 候选称呼只是线索，不是最终势力名；createFaction 时必须基于完整上下文合理推演并补全为完整势力资料。
- 若 Stage1 待建候选已带 `id`，createFaction 必须沿用该 id；不要自行改 ID、不要把候选 ID 丢掉。若是 Stage9-1 重新检查发现的新势力，才自行生成稳定唯一ID。
- 每个 createFaction 的 params 必须带 `candidateName`，并首次补全完整：`id/name/type/kind/classification/worldTag/parentId/parentName/level/location/domain/scale/stance/influence/description/structure/rules/resources/relations/solid.overviewPanels/reason`。禁止只建空壳，禁止把模糊线索、临时称呼或未知占位原样固化为最终 name。
- 若候选名只是简称、代称或不完整称呼，必须根据上下文推演出更合理、可区分、可持续使用的势力名称；不得以“上下文不足”为理由保留临时名或跳过创建。
- 同一响应必须把全部待创建势力分别写成 createFaction op，一次性批量返回；不要逐个等待下一轮，不要返回重试请求。
- 若没有任何未入库势力需要创建，可返回：`{ "ops": [], "done": true }`。

### overviewPanels 严格字段契约

- `solid.overviewPanels` 必须严格使用 UI 固定 schema；禁止中文 key、禁止 `entries` 里写“主要收入/支出结构”等非固定 key，禁止 `teritory` 拼写。
- `ideology` 固定字段：`core`、`reason`、`description`、`base`、`legitimacy`；每项都是对象，形如 `{ "value": "...", "reason": "..." }`，`legitimacy.value` 必须是数字。
- `economy.entries` 固定字段：`gdp`、`income`、`expenditure`、`assets`、`resources`、`production`、`system`、`institutions`、`laws`、`works`。
- `politics.entries` 固定字段：`regime`、`powerStructure`、`rulemaking`、`adjudication`、`execution`、`participation`、`leadership`、`institutions`、`laws`、`works`。
- `military.entries` 固定字段：`posture`、`forces`、`personnel`、`quality`、`sustainment`、`projection`、`equipment`、`institutions`、`laws`、`works`。
- `diplomacy.entries` 固定字段：`posture`、`orientation`、`allies`、`rivals`、`memberships`、`treaties`、`presence`、`institutions`、`laws`、`works`。
- `territory.entries` 固定字段：`capital`、`area`、`population`、`adminDivision`、`regions`。
- 所有固定字段都必须是 `{ "value": ..., "reason": "..." }`；不适用字段也必须给出基于上下文的保守说明，禁止留空或写“待推演补全”。
- 列表字段 value 形状：`institutions/laws/works/memberships/treaties` 为 `[{ "name": "...", "description": "..." }]`；`allies/rivals` 为 `[{ "name": "...", "description": "...", "viewOfSelf": "..." }]`；`forces` 为 `[{ "name": "...", "items": ["..."] }]`；`regions` 为 `[{ "name": "...", "capital": "...", "area": "...", "controlRate": "...", "population": "...", "description": "...", "garrison": "..." }]`。

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

createFaction 的 `params.solid.overviewPanels` 必须按上方严格字段契约写满全部固定字段；禁止输出空对象 `{}` 或省略字段。


