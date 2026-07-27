---
name: membership-update
description: Stage4 按具体项目更新角色的人事归属
---

# Stage4 人事归属更新

人事归属表示角色在可指认组织中的正式或准正式身份，包括任职、学籍、公民身份或正式成员身份。软性圈层位置属于社群角色，不属于本类型。

比较当前 `memberships` 与已经加载的完整上下文。只要人物的组织身份存在适用锚点，且当前记录缺失、模糊、不完整或与上下文冲突，就必须输出完整操作。已知人物是学生但缺少具体学校、年级时，必须结合当前世界、时代、地区、年龄和人物资料补全完整学校名与具体年级。

## 操作规则

- 每项固定使用 `"field":"memberships"`。
- `"op":"add|replace|delete"` 表示三种允许操作；实际输出时只能选择其中一个具体值。
- `add` 必须提供完整 `value`。
- `replace` 必须同时提供精确 `target` 和完整 `value`。
- `delete` 必须提供精确 `target`，不提供 `value`。
- 禁止整组替换。找不到 `target` 时操作应被拒绝，不得变成新增。
- 项目必须包含完整 `orgName` 和具体 `title`；存在部门依据时补充具体 `department`。
- 禁止“某公司”“未知学校”“普通职员”“初中生”“成员”等模糊占位。

## 输出结构

```json
{
  "subject": { "id": "角色ID", "name": "角色名" },
  "field": "memberships",
  "op": "replace",
  "target": {
    "orgName": "原组织全称",
    "title": "原具体身份",
    "department": "原具体部门"
  },
  "value": {
    "orgName": "新组织全称",
    "title": "新具体身份",
    "department": "新具体部门",
    "reason": "字段事实依据"
  },
  "reason": "人物资料、历史或正文中的具体依据"
}
```
