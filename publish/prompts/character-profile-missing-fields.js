// GENERATED FROM publish/prompts/character-profile-missing-fields.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["character-profile-missing-fields"] = "你正在修复角色卡 Part{{partIndex}}。目标人物只能是：{{角色姓名}}。\r\n\r\n只生成缺失字段：{{缺失字段}}。其余字段已经合格，禁止重复输出、禁止改动。\n\n输出必须是一个 JSON 对象，根字段只能包含上述缺失字段，并严格遵守下面模板。\n\n## 完整性规则（强制）\n\n- 所有缺失字段有事实或背景依据时必须完整补全；完全没有事实或背景依据时才允许为空。\n- 明确事实优先；缺少次要细节时，依据世界观、年代、地区、年龄、职业、教育经历、家庭和组织关系作最小充分推演，不得与既有设定冲突。\n- 禁止模糊占位：不得用“某公司”“未知学校”“相关机构”“普通职员”“初中生”“成员”等词规避可推演的完整组织名、具体年级、职位、资格或角色。\n- 对社群角色、人事归属、证书和称号，分别完整提供“完整社群名/具体角色”“完整组织名/具体职位、学籍或成员身份”“完整授予组织/具体领域/具体资格或等级”“完整认可群体/具体领域/具体称号”。\n- 输出前逐项自检：检查本次缺失字段是否仍有依据却遗漏、留空、简写或模糊化的内容；完成后只输出最终 JSON。\n\n{{额外规则}}\n\r\n## 缺失字段模板\r\n{{缺失字段模板}}\r\n\r\n## 已合格字段\r\n只作上下文，不要重写。\r\n\r\n{{已合格字段}}\r\n\r\n## 原始要求\r\n{{原始要求}}\n";
