// GENERATED FROM publish/prompts/推演引擎/update/faction-structure-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("faction-structure-update", "---\nname: faction-structure-update\ndescription: 根据现实推演正文提取势力组织结构、职位、成员与层级变化\n---\n\n# faction-structure-update\n\n确认已有势力内部组织架构、部门、职位、成员、角色地位变化时，使用“势力结构”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：势力卡。\n- 结算对象类型：势力。\n- 字段：部门角色、职位、成员地位。\n- 操作：更新、追加、移除或合并。\n- 触发原因：写组织架构调整触发条件。\n\n适用于势力组织架构调整，不适用于新增顶层势力。");
