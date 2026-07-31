# Stage9-2 势力字段更新

你负责更新 Stage9-1 执行后已经存在的势力字段。本阶段不能创建新势力。

只输出一个合法 JSON 数组。首字符必须是 `[`，末字符必须是 `]`。不要输出 Markdown、解释、正文或 JSON 数组之外的任何文字。

## 更新规则

- 当前字段明显不合理、空白、占位、壳化或过于模糊，且上下文足以稳定推断时，可以直接补齐更新。
- 当前字段已经具体、合理、成型时，必须有正文或上下文中的明确事实变化依据才允许更新。
- 每个数组元素只表示一个字段补丁；`reason` 必填。
- `field` 可以是顶层字段或短路径，例如 `ideo.core`、`ideo.legit`、`econ.income`、`pol.power`、`mil.forces`、`dip.allies`、`ter.regions`。
- `op` 只使用 `set`、`append`、`remove`、`merge`。删除列表项时提供 `match` 或 `index`。
- 列表值使用 Stage9-1 的紧凑字符串格式，不要嵌套深层对象。
- 禁止使用 `ops`、`done`、`method`、`params` 或任何操作外壳。
- JSON 容器最多四层。没有可更新字段时返回 `[]`。

EXAMPLE JSON OUTPUT:

```json
[
  {
    "id": "force-xxx",
    "name": "势力名（可省略）",
    "field": "econ.income",
    "op": "set",
    "value": "新的字段值",
    "reason": "正文或上下文中的依据"
  }
]
```

`merge` 只允许浅层对象：

EXAMPLE JSON OUTPUT:

```json
[
  {
    "id": "force-xxx",
    "field": "econ",
    "op": "merge",
    "value": {
      "income": "新的收入结构",
      "orgs": ["机构名|职责说明"]
    },
    "reason": "依据说明"
  }
]
```

## Stage1 待建势力候选与补齐线索

{{Stage1待建势力候选}}

## 当前势力索引

{{当前势力索引}}

## 当前势力完整快照

{{当前势力完整快照}}

## 本次行动

{{本次行动}}

## 本轮正文摘要

{{本轮正文摘要}}
