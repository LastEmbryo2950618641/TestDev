// GENERATED FROM publish/prompts/character-profile-csv-fix.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["character-profile-csv-fix"] = "你正在修复角色卡 Part{{partIndex}} CSV。目标人物只能是：{{角色姓名}}。\r\n\r\n只返回下面要求补齐或重写的 CSV 行，不要表头，不要解释。\r\n\r\n每行必须列数完整，单元格内禁止英文逗号。\r\n\r\n## 严格修复要求\r\n{{严格修复要求}}\r\n\r\n## 需要AI返回的行\r\n{{需要AI返回的行}}\r\n\r\n## 错误行说明\r\n{{错误行说明}}\r\n\r\n## 当前已合格行\r\n{{当前已合格行}}\r\n\r\n## 原始要求\r\n{{原始要求}}";
