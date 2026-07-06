// GENERATED FROM publish/prompts/推演引擎/update/item-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-item"] = "---\r\nname: item-update\r\ndescription: 根据现实推演正文提取物品获得、转移、删除、购买或生成更新\r\n---\r\n\r\n# item-update\r\n\r\n确认物品、装备、库存归属或数量变化时，使用“物品”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：物品所属角色卡；玩家物品绑定玩家卡。\r\n- 字段：物品类型、物品名、归属/数量/状态事实。\r\n- 操作：获得、失去、转移、数量变化、状态变化、生成、删除。\r\n- 转移必须写清来源与目标。\r\n- 购买、赠送、交还、损坏、消耗、遗失都要写原因。\r\n\r\n衣物或饰品的当前穿着位置、穿着状态、被拉紧/解开/偏移等变化走“穿着状态”，不要混入物品。\r\n";
