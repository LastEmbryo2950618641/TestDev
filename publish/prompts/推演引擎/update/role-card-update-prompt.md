---
name: role-card-update
description: Stage4 根据完整上下文更新已有完整角色卡
---

# Stage4 角色卡更新

仅更新玩家或已有完整角色卡的人物。仅有介绍卡或空壳 stub 的人物不在本阶段生成或修改完整角色卡。

只输出下方新的类型化操作合约。禁止使用旧输出格式或整组数组值。

## 允许操作

### 完整值覆盖 `set`

- `role`
- `job`
- `detail`
- `personality`
- `preferences`
- `currentLocation`
- `socialDrive.relationToPlayer`
- `socialDrive.relationDetail`
- `socialDrive.agenda.short`
- `socialDrive.agenda.deadline`
- `socialDrive.agenda.needPlayer`
- `socialDrive.agenda.needPlayerWhy`
- `socialDrive.agenda.urgency`

### 数值增量 `delta`

- `socialDrive.familiarity`

### 逐项集合 `add|replace|delete`

- `factions`
- `memberships`
- `certificates`
- `titles`

禁止整组替换。`replace` 和 `delete` 必须提供能精确匹配现有项目的 `target`；找不到目标时该操作应被拒绝，不得降级为新增。

### 仅新增集合 `add`

- `skills`
- `knowledge`
- `professions`

新增项目必须包含完整名称、说明、初始等级和依据。AI 不得输出经验值；经验由代码初始化为 0。

## 输出合约

```json
{
  "ops": [
    {
      "subject": { "id": "角色ID", "name": "角色名" },
      "field": "memberships",
      "op": "replace",
      "target": {
        "orgName": "旧组织全称",
        "title": "旧具体职位、学籍或成员身份"
      },
      "value": {
        "orgName": "新组织全称",
        "title": "新具体职位、学籍或成员身份",
        "department": "具体部门",
        "reason": "字段依据"
      },
      "reason": "人物资料、历史或正文中的具体依据"
    },
    {
      "subject": { "id": "角色ID", "name": "角色名" },
      "field": "skills",
      "op": "add",
      "value": {
        "name": "完整技能名称",
        "desc": "技能说明",
        "level": 1,
        "linkedStats": ["intelligence"]
      },
      "reason": "人物已开始稳定掌握该技能"
    },
    {
      "subject": { "id": "角色ID", "name": "角色名" },
      "field": "socialDrive.familiarity",
      "op": "delta",
      "delta": 2,
      "reason": "本轮持续互动增加了互相了解"
    }
  ],
  "done": true
}
```

无合法更新时输出：

```json
{"ops":[],"done":true}
```
