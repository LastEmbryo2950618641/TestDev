// GENERATED FROM publish/prompts/推演引擎/update/system-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("system-update", "---\nname: system-update\ndescription: 根据现实推演正文提取系统、日历、世界线或通用状态变化\n---\n\n# system-update\n\n确认公司、日历、微信、世界线等系统级记录变化时，使用“系统记录”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：系统卡。\n- 结算对象类型：公司、日历、微信、世界线或系统。\n- 字段：事件、记录、通信消息、剧情记录、状态等中文字段。\n- 操作：追加、替换、合并或更新。\n- 触发原因：写系统记录变化的触发事实。\n\n如果变化能归入角色卡、势力卡或地图卡，优先使用对应类型。");
