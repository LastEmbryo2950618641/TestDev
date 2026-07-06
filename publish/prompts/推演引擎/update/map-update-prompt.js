// GENERATED FROM publish/prompts/推演引擎/update/map-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-map"] = "---\r\nname: map-update\r\ndescription: 根据现实推演正文提取地点、地图节点与地点事实变化\r\n---\r\n\r\n# map-update\r\n\r\n确认地点、地图节点、上级地点、地点说明、路线事实变化时，使用“地图”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：地图卡。\r\n- 结算对象类型：地点。\r\n- 字段：当前位置、上级地点、地点事实、地图节点、路线事实。\r\n- 操作：替换、追加或更新。\r\n- 触发原因：写玩家到达、观察、导航、确认路线等触发条件。\r\n\r\n若是正文确认的新地点或地点事实，必须写清地点全称和变化原因。\r\n\r\n**地图节点颗粒度**：电子地图只记录建筑物级 POI（如「3栋2单元」）与小区级场所（公园、商店等）。走廊、楼梯间、单个房间属于建筑物内部，写「当前位置/上级地点」即可，不要作为地图节点输出。\r\n";
