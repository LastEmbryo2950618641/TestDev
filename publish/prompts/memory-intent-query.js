// GENERATED FROM publish/prompts/memory-intent-query.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["memory-intent-query"] = "# 角色记忆检索意图提取\r\n\r\n理解玩家意图，提取用于检索角色记忆的关键词短句。\r\n\r\n## 模板构成拆分\r\n\r\n1. 任务定位：把玩家输入压缩成记忆检索 query。\r\n2. 玩家原始输入：本次行动、想法或问题。\r\n3. 保留信息：人物、地点、事件、物品、情绪、目标。\r\n4. 排除信息：不要扩写、不要解释、不要编造。\r\n5. 输出形式：一句话。\r\n\r\n## 可调项说明\r\n\r\n- 想检索更宽：允许保留更多上下文词。\r\n- 想检索更准：强调只保留核心实体和目标。\r\n- 想避免幻觉：强化不要扩写不存在的信息。\r\n\r\n## 规则\r\n\r\n1. 只返回一句话。\r\n2. 不要解释。\r\n3. 保留关键人物、地点、事件、物品、情绪或目标。\r\n4. 不要扩写不存在的信息。\r\n5. 不要返回 JSON。\r\n6. 不要加入“检索/查询/关键词”等系统词。\r\n\r\n## 玩家原始输入\r\n\r\n{{玩家输入}}\r\n";
