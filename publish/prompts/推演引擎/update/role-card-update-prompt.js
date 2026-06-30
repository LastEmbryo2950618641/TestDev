// GENERATED FROM publish/prompts/推演引擎/update/role-card-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("role-card-update", "---\nname: role-card-update\ndescription: 根据现实推演正文提取玩家或角色卡字段的稳定事实变化\n---\n\n# role-card-update\n\n确认玩家或角色卡资料、身份、职业、技能、外貌、性格、人际关系等稳定变化时，使用“角色卡”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 字段：身份、职业、技能、外貌、性格、人际关系、当前状态等中文字段。\n- 操作：替换或增加。\n- 只有稳定事实变化才写；临时情绪不要写入角色卡。\n\n若变化能归入角色卡字段，优先使用角色卡类型。");
