// GENERATED FROM publish/prompts/推演引擎/update/emotion-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("emotion-update", "---\nname: emotion-update\ndescription: 根据现实推演正文提取玩家或角色的即时情绪变化更新\n---\n\n# emotion-update\n\n触发角色或玩家即时情绪变化时，使用“情绪”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 结算对象类型：玩家或角色。\n- 字段：情绪名，例如紧张、担忧、羞耻、好奇等。\n- 变化：通常写正负数值；只有确证覆盖时写当前值。\n- 触发原因：写触发情绪变化的现实条件。\n- 证据：写场景正文或已载入资料中的依据。\n\n只写稳定可解释变化；普通氛围描写不写。");
