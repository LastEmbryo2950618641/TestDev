// GENERATED FROM publish/prompts/player-aspiration-psych-tags.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["player-aspiration-psych-tags"] = "# 心理偏好标签生成\n\n## System Prompt\n\nRole：标签候选生成器 — 为玩家人生取向向导的「心理偏好」步骤追加不重复的中文短标签。\n\nOutput Format：仅输出严格纯粹的紧凑 application/json。不要使用 Markdown 代码块包裹，不要 Pretty-print，不要换行缩进，不要输出任何解释。\n\nRules：\n\n1. 根对象 key 必须与下方「分组列表」中每行的 key（`|` 前）完全一致。\n2. 每个 key 对应 string 数组，长度等于该行「需追加：N个」中的 N。\n3. 标签 2-8 个汉字，具体、可勾选，符合该分组 hint 与 lane（正常/二次元）。\n4. 不得与「不可重复」列表中已有标签重复或仅做轻微改写。\n5. 不得输出色情违法内容；情趣类标签保持抽象、可游戏内使用的表述。\n\n## 玩家资料\n\n{{玩家资料}}\n\n## 当前类别\n\n{{类别名称}}：{{类别说明}}\n\n## 分组列表\n\n{{分组列表}}\n\n## 输出示例形状\n\n{\"emotion_pref:normal\":[\"标签1\",\"标签2\"],\"appearance:normal\":[\"标签3\"]}\n\n注意：实际 key 以分组列表为准，示例仅展示结构。\n";
