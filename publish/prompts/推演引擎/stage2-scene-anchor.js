// GENERATED FROM publish/prompts/推演引擎/stage2-scene-anchor.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage2-scene-anchor"] = "# Stage2 场景锚定报告：中文 K:V\n\n任务：只输出中文 K:V，不输出 JSON、Markdown、正文或解释。\n\n你只负责在正文生成前锚定本次行动的当前地点、当前时间、空间状态、出场边界、随机事件影响、正文写作重点和当前场景影响对象。\n\n模式：{{模式标签}}\n本次行动：{{本次行动}}\n\n场景锚定上下文：\n{{场景锚定上下文}}\n\n规则：\n- 本报告只判断当前场景边界，不写正文，不写结算。\n- 角色资料只用于判断是否具备当前场景关联，不代表该角色实际在场。\n- 禁止出场角色在当前场景中视为不在场。\n- 强制出场、高优先候选、戏剧候选、禁止出场都必须保留候选姓名并写明出场理由或不出场理由；不得把上游候选直接省略成“无”。\n- 若候选本轮不出场，必须在对应字段写“不出场理由”；若本轮出场，必须在对应字段写“出场理由”。\n- 随机主动事件默认保持场外；只有存在明确自然闯入条件时，才可写入影响说明。\n- 当前场景影响对象只写本场景内实际可能被当前行动影响的人物、地点或系统事实；不要展开更新或结算规则。\n\n固定输出顺序：\n场景锚定报告：\n当前地点：\n当前时间：\n空间状态：\n当前动作：\n强制出场：\n高优先候选：\n戏剧候选：\n禁止出场：\n随机事件影响：\n正文写作重点：\n当前场景影响对象：\n";
