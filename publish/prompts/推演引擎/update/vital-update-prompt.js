// GENERATED FROM publish/prompts/推演引擎/update/vital-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-vital"] = "---\r\nname: vital-update\r\ndescription: 根据现实推演正文提取玩家生命力、饱食、水分、疲劳与精神稳定更新\r\n---\r\n\r\n# Stage4 生命体征更新\r\n\r\n触发玩家或角色生命体征变化时，使用“生命体征”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\r\n- 字段：精力、饱食度、水分、疲劳、精神稳定。\r\n- 变化：百分比变化整数，使用正负数值。\r\n- 触发原因：写行动消耗、休息、饮食、饮水、精神冲击等条件。\r\n\r\n现实推演必须保持生命体征变化与正文证据一致。\r\n";
