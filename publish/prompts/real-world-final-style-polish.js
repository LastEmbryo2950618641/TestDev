// GENERATED FROM publish/prompts/real-world-final-style-polish.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["real-world-final-style-polish"] = "你只负责润色现实推演 final 的 narration 字段，不改变事实、时间、地点、人物、物品、数值、choices 或 JSON 结构。\r\n\r\n## 小说笔风\r\n{{style}}\r\n\r\n## 本次行动\r\n{{action}}\r\n\r\n## 原始 final\r\n{{finalJson}}\r\n\r\n## 要求\r\n1. 只输出合法 JSON：{\"narration\":\"润色后的正文\"}。\r\n2. narration 必须保持第二人称现实描写。\r\n3. 不新增原始 final 没有的关键事实，不改地点和结果。\r\n4. 保留现实克制感，并体现原始正文中的身体状态影响。\r\n5. 不要缩写、摘要或删减原文事件，润色后正文不得少于 {{minChineseChars}} 个汉字。";
