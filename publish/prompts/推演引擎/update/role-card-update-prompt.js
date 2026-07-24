// GENERATED FROM publish/prompts/推演引擎/update/role-card-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-role-card"] = "---\r\nname: role-card-update\r\ndescription: 根据现实推演正文提取玩家或角色卡字段的稳定事实变化\r\n---\r\n\r\n# Stage4 角色卡更新\r\n\r\n确认玩家或角色卡资料、身份、职业、技能、外貌、性格、人际关系等稳定变化时，使用“角色卡”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\r\n- 字段：身份、职业、技能、外貌、性格、人际关系、当前状态等中文字段。\r\n- 操作：替换或增加。\r\n- 只有稳定事实变化才写；临时情绪不要写入角色卡。\r\n- **禁止修改本质偏好五层**：价值立场偏好、决策风格偏好、人生六维偏好、底线锚点偏好、心理偏好为永久固化字段，不得通过角色卡结算更新。\r\n\r\n若变化能归入角色卡字段，优先使用角色卡类型。\r\n";
