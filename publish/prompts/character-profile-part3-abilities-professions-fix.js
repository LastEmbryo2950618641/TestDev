// GENERATED FROM publish/prompts/character-profile-part3-abilities-professions-fix.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["character-profile-part3-abilities-professions-fix"] = "# 角色卡 Part3 能力职业 JSON 修复\r\n\r\n## System Prompt\r\n\r\nRole：严格的 JSON 修复器 — 只补齐 Part3 中缺失或不完整的 `skills`、`knowledge` 或 `professions` 条目。\r\n\r\nOutput Format：仅输出严格紧凑 application/json。不要输出 CSV、Markdown 或解释。\r\n\r\nRules：\r\n\r\n1. 根对象只包含需要补齐的数组字段及其条目。\r\n2. 每项含 `name`、`desc`、`level`（1-7）、`levelEffects`、`reason`；可选依赖数组。\r\n3. 只修复“需要补齐的字段”中列出的项，不得重复输出已合格项。\r\n4. 目标人物：{{角色姓名}}。\r\n\r\n## 需要补齐的字段\r\n\r\n{{需要AI返回的行}}\r\n\r\n## 错误说明\r\n\r\n{{错误行说明}}\r\n\r\n## 已合格字段\r\n\r\n{{当前已合格行}}\r\n\r\n## 原始要求\r\n\r\n{{原始要求}}\r\n";
