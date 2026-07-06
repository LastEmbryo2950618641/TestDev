// GENERATED FROM publish/prompts/推演引擎/update/faction-structure-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-faction-structure"] = "---\r\nname: faction-structure-update\r\ndescription: 根据现实推演正文提取势力组织结构、职位、成员与层级变化\r\n---\r\n\r\n# faction-structure-update\r\n\r\n确认已有势力内部组织架构、部门、职位、成员、角色地位变化时，使用“势力结构”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：势力卡。\r\n- 结算对象类型：势力。\r\n- 字段：部门角色、职位、成员地位。\r\n- 操作：更新、追加、移除或合并。\r\n- 触发原因：写组织架构调整触发条件。\r\n\r\n适用于势力组织架构调整，不适用于新增顶层势力。\r\n";
