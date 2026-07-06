// GENERATED FROM publish/prompts/推演引擎/update/system-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-system"] = "---\r\nname: system-update\r\ndescription: 根据现实推演正文提取系统、日历、世界线或通用状态变化\r\n---\r\n\r\n# system-update\r\n\r\n确认公司、日历、微信、世界线等系统级记录变化时，使用“系统记录”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：系统卡。\r\n- 结算对象类型：公司、日历、微信、世界线或系统。\r\n- 字段：事件、记录、通信消息、剧情记录、状态等中文字段。\r\n- 操作：追加、替换、合并或更新。\r\n- 触发原因：写系统记录变化的触发事实。\r\n\r\n如果变化能归入角色卡、势力卡或地图卡，优先使用对应类型。\r\n";
