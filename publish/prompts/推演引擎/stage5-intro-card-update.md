# Stage5 介绍卡更新

任务：只输出一个合法 JSON 对象，不输出 Markdown、代码块、正文或解释。

## 目标

根据 Stage4 结算、正文和已载入资料，维护**没有完整角色卡**的人物/存在的介绍卡。

已有完整角色卡的人物不在本阶段由 AI 独立推演；其介绍卡只由系统按角色卡同步。

## 规则

1. 只处理本轮出现、被识别、且仍只有介绍卡的人物/存在。
2. 若介绍卡字段缺失、模糊、简写或与上下文冲突，输出单字段更新操作。
3. 姓名、世界、ID、链接、来源、创建更新时间、升格状态、联系渠道和冷却字段禁止修改。
4. social.affection 与 social.familiarity 只能输出非零 delta；好感表示正面态度，熟识度表示接触与互相了解程度。
5. 普通偏好、吸引点、日常标签和记忆事实只能逐项 add / replace / delete，禁止整组覆盖。
6. 没有稳定依据时输出空 ops，不要为了更新而编造。

## 可更新字段

标量字段只允许 `set`，且 `value` 必须是完整新值：

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

数值字段只允许 `delta`，且 `value` 必须是非零数字：

- `social.affection`
- `social.familiarity`

集合字段只允许 `add` / `replace` / `delete`：

- `persona.preferences`
- `persona.attraction`
- `routine.tags`
- `memory.facts`

`add` 使用 `value`；`delete` 使用 `target`；`replace` 同时使用 `target` 和 `value`。`target` 必须能精确匹配候选介绍卡中的现有项目。

## 输入

本回合参与者：
{{本回合参与者}}

候选介绍卡：
{{候选介绍卡}}

本轮正文：
{{本轮正文}}

Stage4 结算摘要：
{{Stage4结算摘要}}

## 输出 JSON Schema

```json
{
  "ops": [
    {
      "id": "介绍卡ID",
      "field": "identity.role",
      "op": "set",
      "value": "完整新值",
      "reason": "正文或资料依据"
    }
  ],
  "done": true
}
```

无更新时：

```json
{ "ops": [], "done": true }
```
