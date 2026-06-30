// GENERATED FROM publish/prompts/推演引擎/stage4-settlement-window.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage4-settlement-window"] = "# Stage4 结算滑动窗口：中文 K:V\n\n任务：只输出中文 K:V，不输出 JSON、Markdown、正文或解释。\n\n本次必须返回的类型：{{本次必须返回的类型}}\n已完成类型摘要：{{已完成类型摘要}}\n残缺类型：{{残缺类型}}\n残缺原因或尾部：{{残缺原因或尾部}}\n\n现有 Update 提示词摘要：\n{{现有Update提示词摘要}}\n\n现有 Init 提示词：\n{{现有Init提示词}}\n\n现有 Init 字段 Schema：\n{{现有Init字段Schema}}\n\n本回合参与者：{{本回合参与者}}\n正文：{{正文}}\n\n类型合约：\n{{类型合约}}\n\n规则：\n- 必须逐个输出“本次必须返回的类型”列出的每个类型；不得只输出你认为有变化的类型。\n- 类型标题必须使用类型合约中的完整标题，例如“情绪结算：”“身体状态结算：”；不得使用短标题，例如“情绪：”“身体状态：”。\n- 每个类型都必须包含“结算状态：需要更新 / 无变化”“类型完成：是”和“结算结束：是”。\n- 没有稳定变化时也必须输出该类型完整块，并写“结算状态：无变化”。\n- 已完成类型不得重复输出；未列入本次必须返回的类型不得输出。\n- 残缺类型只补齐该类型自身，不得复制其他类型的内容。\n";
