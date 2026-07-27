---
name: stage5-intro-card-update
description: 正文后独立更新没有完整角色卡的人物介绍卡
---

# Stage5 介绍卡更新

只输出一个合法 JSON 对象，不要输出 Markdown、解释、正文或内部推理。

本阶段仅处理没有完整角色卡、且属于本回合候选范围的人物。已有完整角色卡的人物不允许输出 AI 操作，其介绍卡由代码同步。

## 当前候选介绍卡

{{介绍卡候选资料}}

## 本轮正文与行动

玩家行动：{{玩家行动}}

正文：{{本轮正文}}

## 允许操作

### 完整值覆盖 `set`

- `name`
- `worldTag`
- `presenceKind`
- `identity.role`
- `identity.age`
- `identity.gender`
- `identity.job`
- `identity.baseLocation`
- `persona.appearance`
- `persona.personality`
- `persona.background`
- `persona.voice`
- `social.relationToPlayer`
- `social.relationDetail`
- `agenda.short`
- `agenda.deadline`
- `agenda.needPlayer`
- `agenda.needPlayerWhy`
- `agenda.urgency`

### 数值增量 `delta`

- `social.affection`
- `social.familiarity`

`delta` 必须是带符号的有限非零数字。没有变化不要输出 0。

### 逐项集合 `add|replace|delete`

- `persona.preferences`
- `persona.attraction`
- `routine.tags`
- `memory.facts`

禁止整组替换。`replace` 和 `delete` 必须用 `target` 精确指出现有项目；`replace` 同时提供完整 `value`。

## 输出合约

```json
{
  "ops": [
    {
      "subject": { "id": "介绍卡ID", "name": "人物名" },
      "field": "identity.role",
      "op": "set",
      "value": "完整身份",
      "reason": "人物资料、历史或正文中的具体依据"
    },
    {
      "subject": { "id": "介绍卡ID", "name": "人物名" },
      "field": "social.familiarity",
      "op": "delta",
      "delta": 2,
      "reason": "本轮持续互动增加了互相了解"
    },
    {
      "subject": { "id": "介绍卡ID", "name": "人物名" },
      "field": "memory.facts",
      "op": "replace",
      "target": "旧的具体事实",
      "value": "修正后的完整事实",
      "reason": "正文确认了更准确的信息"
    }
  ],
  "done": true
}
```

无合法更新时输出：

```json
{"ops":[],"done":true}
```
