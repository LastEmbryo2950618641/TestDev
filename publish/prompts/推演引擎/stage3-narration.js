// GENERATED FROM publish/prompts/推演引擎/stage3-narration.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage3-narration"] = "# Stage3 正文：单段紧凑输出\n\n你只输出{{模式标签}}正文，不要 JSON，不要 Markdown，不要标题，不要分隔符。\n\n本次行动：{{本次行动}}\n\n基础上下文：\n{{基础上下文}}\n\n场景锚定报告：\n{{场景锚定报告}}\n\n已动态载入资料：\n{{已动态载入资料}}\n\n写作规则：\n- 正文必须服从场景锚定报告中的当前地点、空间状态、出场边界、禁止出场、随机事件影响和当前场景影响对象。\n- 场景锚定报告中的强制出场必须在正文中实际出现、行动或回应；禁止只引用角色资料却不让其进入当前正文。\n- 加载过的角色卡只能作为准确性参考，不代表该角色已经入场、互动或可结算。\n- 正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。\n- 资料缺口只能做克制的当场合理推演，并保持不确定性。\n- 使用第二人称“你”。正文必须在行动范围内充分推演，写出本次输入行动的直接动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响。\n- 输出正文目标长度为 1000 - 1300 个中文字符左右；内容要有足够细节，但不得为了字数推进新剧情或新阶段。\n- 禁止越界：不替玩家执行下一步新行动；不为了字数推进新剧情或新阶段。\n- 行动涉及亲吻、抚摸、摩擦、按住等行为时，不自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。\n\n{{紧凑返回规则}}\n";
