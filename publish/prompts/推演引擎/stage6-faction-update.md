---
name: Stage9-faction-update
description: 正文与 Stage4–8 之后串行执行的势力草稿创建与字段更新（先创建，后更新）
---

# Stage9 势力更新

只输出一个合法 JSON 对象；本阶段在正文与 Stage4–8 之后串行执行，内部拆为 Stage9-1 和 Stage9-2。

## Stage9-1 势力创建

- 只允许输出 `createFactionDraft`；禁止输出 `createFaction`、`patchFactionDraft`、`patchFactionField`。
- 必须重新检查本轮完整上下文；只要识别到尚未入库的势力线索，就必须创建，即使 Stage1 候选为空也不能跳过复查。
- Stage1 候选的 `id` 若存在必须原样沿用；复查中新发现且没有 `id` 的势力才生成稳定唯一 ID。
- 候选称呼只是线索，不是最终名称；要结合上下文合理补全最终名称和资料，不得创建空壳，不得把临时称呼固化为正式名称。
- AI 输出的是短 English key 的 draft，不是最终 UI 落库 schema；最多三层嵌套。代码会将 draft 映射成现有 `createFaction` 参数。
- `reason` 可省略；若省略，代码自动补充创建原因。
- 同一响应批量返回全部待创建势力；没有待创建势力时返回空 `ops`。

### Stage9-1 输出结构

```json
{
  "ops": [
    {
      "method": "createFactionDraft",
      "params": {
        "candidate": "Stage1 原候选称呼",
        "id": "沿用的候选 ID 或新生成 ID",
        "name": "根据上下文补全的最终势力名",
        "type": "组织类型",
        "kind": "可选分类",
        "class": "classification",
        "world": "所属世界",
        "parent_id": null,
        "parent_name": null,
        "level": "层级",
        "location": "地点",
        "domain": "领域",
        "scale": "规模",
        "stance": "立场",
        "influence": 30,
        "desc": "简介",
        "structure": [{ "name": "部门", "members": ["职位A", "职位B"] }],
        "rules": ["规则"],
        "resources": ["资源"],
        "relations": [{ "target": "对象", "type": "关系" }],
        "panels": {
          "ideo": { "core": "", "base": "", "desc": "", "legit": 60 },
          "econ": { "income": "", "orgs": [{ "name": "机构", "description": "" }] },
          "pol": { "regime": "" },
          "mil": { "posture": "" },
          "dip": { "allies": [{ "name": "对象", "description": "", "viewOfSelf": "" }] },
          "ter": { "capital": "", "regions": [{ "name": "区域", "center": "", "area": "", "ctrl": "", "pop": "", "desc": "", "garrison": "" }] }
        },
        "reason": "可选"
      }
    }
  ],
  "done": true
}
```

- 面板 key 只使用 `ideo`、`econ`、`pol`、`mil`、`dip`、`ter`。
- 常用短字段包括 `desc`、`legit`、`orgs`、`power`、`rule`、`judge`、`exec`、`part`、`lead`、`troops`、`supply`、`reach`、`equip`、`orient`、`members`、`pop`、`admin`。
- 列表可以使用字符串，也可以使用对象；代码会统一映射为当前列表结构。

## Stage9-2 势力更新

- 只允许输出 `patchFactionDraft`；禁止输出 `createFactionDraft`、`createFaction`、`patchFactionField`。
- 当前字段明显不合理、空白、占位、壳化或过于模糊，且上下文足以稳定推断时，可以直接补齐更新。
- 当前字段已经具体、合理、成型时，必须有正文或上下文中的明确事实变化依据才允许更新。
- `reason` 必填。
- `field` 可以是顶层字段，也可以是短路径，例如 `ideo.core`、`ideo.legit`、`econ.income`、`pol.power`、`mil.forces`、`dip.allies`、`ter.regions`。
- `op` 只使用 `set`、`append`、`remove`、`merge`；删除列表项时优先提供 `match` 或 `index`。
- 没有可更新字段时返回空 `ops`。

### Stage9-2 输出结构

```json
{
  "ops": [
    {
      "method": "patchFactionDraft",
      "params": {
        "id": "force-xxx",
        "field": "econ.income",
        "op": "set",
        "value": "新的字段值",
        "reason": "正文或上下文中的依据"
      }
    }
  ],
  "done": true
}
```

`merge` 示例：

```json
{
  "method": "patchFactionDraft",
  "params": {
    "id": "force-xxx",
    "field": "econ",
    "op": "merge",
    "value": {
      "income": "新的收入结构",
      "orgs": [{ "name": "机构", "description": "职责" }]
    },
    "reason": "依据说明"
  }
}
```
