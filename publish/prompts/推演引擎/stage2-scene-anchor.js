// GENERATED FROM publish/prompts/推演引擎/stage2-scene-anchor.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage2-scene-anchor"] = "# Stage2 场景锚定报告：中文 K:V\n\n任务：只输出中文 K:V，不输出 JSON、Markdown、正文或解释。\n\n你必须在正文生成前锚定本次行动的当前地点、当前时间、空间状态、出场边界、随机事件影响、正文写作重点和结算边界。\n\n模式：{{模式标签}}\n本次行动：{{本次行动}}\n\n基础上下文：\n{{基础上下文}}\n\n参与者分层与查询规划：\n{{参与者分层与查询规划}}\n\n已加载资料摘要：\n{{已加载资料摘要}}\n\n规则：\n- 正文必须服从本报告。\n- 加载角色卡只作为准确性参考，不等于入场或结算。\n- 禁止出场角色不得出场、不得主动联系、不得结算。\n- 强制出场、高优先候选、戏剧候选、禁止出场都必须保留候选姓名并写明出场理由或不出场理由；不得把上游候选直接省略成“无”。\n- 若候选本轮不出场，必须在对应字段写“不出场理由”；若本轮出场，必须在对应字段写“出场理由”。\n- 随机主动事件默认是场外背景；除非有明确自然闯入条件，否则不得入场。\n- 结算边界必须只包含玩家、强制出场、正文实际确认入场/互动/被影响的角色或地点/系统事实。\n\n固定输出顺序：\n场景锚定报告：\n当前地点：\n当前时间：\n空间状态：\n当前动作：\n强制出场：\n高优先候选：\n戏剧候选：\n禁止出场：\n随机事件影响：\n正文写作重点：\n结算边界：\n";
