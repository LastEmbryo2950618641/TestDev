---
name: org-capability-entry-update
description: 根据现实推演正文追加或更新势力能力维度下的具体条目（兵种、科室、产线等）
---

# org-capability-entry-update

正文确认某势力下 **新设或调整** 具体能力条目（非整棵组织树）时使用。

## 四维

- `political` 政治｜`economic` 经济｜`asset` 资产｜`military` 军事
- 用 `field: solid.capabilities.{维度}.entries` 或 `value.dimension`

## 条目 state

| state | 含义 |
| --- | --- |
| fog | 仅知名称/意图，上级/编制未明 |
| sketch | 草案，可随推演调整 |
| established | 已确立，修改需「更改」类结算 + 正文硬事实 |

## 迷雾规则

- 无草案时 **只写** `name` + `state: fog` + `parentRef: { fog: true }`
- **禁止** 默认挂「国防部/总参谋部」等未在正文出现的上级
- 职责/编制/人数未明 → 不写，保持 `sketchNote` 短句即可

## 与 faction-structure 分工

- **隶属、部门、职位、任职人** → `faction-structure`
- **军事兵种、资产包、产线、执法支队** 等能力列表 → 本类型
- 同一实体可 `linkStructureId` 双链（可选）

## 示例（迷雾期新设兵种）

```json
{
  "updateType": "org-capability-entry",
  "subject": { "type": "faction", "name": "某安保公司" },
  "field": "solid.capabilities.military.entries",
  "change": {
    "mode": "upsert",
    "value": {
      "name": "黑盾特遣队",
      "kind": "兵种",
      "state": "fog",
      "parentRef": { "fog": true, "label": "迷雾" }
    }
  }
}
```
