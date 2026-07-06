// GENERATED FROM publish/prompts/推演引擎/update/membership-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-membership"] = "---\r\nname: membership-update\r\ndescription: 根据现实推演正文确认角色在组织中的部门、职位与 orgId 归属\r\n---\r\n\r\n# membership-update\r\n\r\n正文确认角色 **入职、任职、调岗、离职** 时使用 `membership` 结算；与 `membership` 直接写入。\r\n\r\n## 字段\r\n\r\n- `orgId` / `orgName`：组织（须对应势力系统中已有 stub）\r\n- `title`：职位\r\n- `department`：部门；未明则 `departmentFog: true`\r\n- `state`：fog | sketch | established\r\n\r\n## 分工\r\n\r\n- 组织树职位占坑 → 可同时写 `faction-structure`\r\n- 角色主观归属 → 本类型写 `values.memberships`\r\n";
