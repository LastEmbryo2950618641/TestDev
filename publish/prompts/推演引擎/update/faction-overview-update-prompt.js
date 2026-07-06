// GENERATED FROM publish/prompts/推演引擎/update/faction-overview-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-faction-overview"] = "---\r\nname: faction-overview-update\r\ndescription: 根据现实推演正文提取新增势力或上层势力总览变化\r\n---\r\n\r\n# faction-overview-update\r\n\r\n确认新增势力、上层势力归属、势力 APP/势力总览层级变化时，使用“势力总览”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：势力总览卡或上层势力卡。\r\n- 结算对象类型：势力总览或上层势力。\r\n- 字段：新增势力、上层势力归属、势力 APP 归属。\r\n- 操作：追加、更新、建立归属或解除归属。\r\n- 触发原因：写确认新势力存在或归属变化的触发条件。\r\n\r\n势力内部职位变化使用 faction-structure，不要混用。\r\n";
