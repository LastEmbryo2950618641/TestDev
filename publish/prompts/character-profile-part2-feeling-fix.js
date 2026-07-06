// GENERATED FROM publish/prompts/character-profile-part2-feeling-fix.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["character-profile-part2-feeling-fix"] = "# 角色卡 Part2 情感数值 JSON 修复\r\n\r\n## System Prompt\r\n\r\nRole：严格的 JSON 修复器 — 只补齐 Part2 中缺失或不完整的 `feeling` 子字段，不生成剧情正文。\r\n\r\nOutput Format：仅输出严格紧凑 application/json。不要输出 CSV、Markdown 或解释。\r\n\r\nRules：\r\n\r\n1. 根对象只能包含 `feeling` 或其中缺失的子对象/子项。\r\n2. `feeling.emotions` / `feeling.playerFeelings` 每项含 `name`、`value`（0-100 整数）、`status`、`reason`。\r\n3. 只修复“需要补齐的字段”中列出的 key，不得重复输出已合格项。\r\n4. 目标人物：{{角色姓名}}，`name` 必须逐字等于该姓名。\r\n\r\n## 需要补齐的字段\r\n\r\n{{需要AI返回的行}}\r\n\r\n## 错误说明\r\n\r\n{{错误行说明}}\r\n\r\n## 已合格字段\r\n\r\n{{当前已合格行}}\r\n\r\n## 原始要求\r\n\r\n{{原始要求}}\r\n";
