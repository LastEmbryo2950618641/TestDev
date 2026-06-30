// GENERATED FROM publish/prompts/推演引擎/update/map-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("map-update", "---\nname: map-update\ndescription: 根据现实推演正文提取地点、地图节点与地点事实变化\n---\n\n# map-update\n\n确认地点、地图节点、上级地点、地点说明、路线事实变化时，使用“地图”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：地图卡。\n- 结算对象类型：地点。\n- 字段：当前位置、上级地点、地点事实、地图节点、路线事实。\n- 操作：替换、追加或更新。\n- 触发原因：写玩家到达、观察、导航、确认路线等触发条件。\n\n若是正文确认的新地点或地点事实，必须写清地点全称和变化原因。");
