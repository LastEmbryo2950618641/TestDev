---
name: membership-update
description: 根据现实推演正文确认角色在组织中的部门、职位与 orgId 归属
---

# Stage4 人事归属更新

正文确认角色 **入职、任职、调岗、离职** 时使用 `membership` 结算；与 `membership` 直接写入。

## 字段

- `orgId` / `orgName`：组织（须对应势力系统中已有 stub）
- `title`：职位
- `department`：部门；未明则 `departmentFog: true`
- `state`：fog | sketch | established

## 分工

- 组织树职位占坑 → 可同时写 `faction-structure`
- 角色主观归属 → 本类型写 `values.memberships`
