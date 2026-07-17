// GENERATED FROM publish/prompts/推演引擎/**/*.js; DO NOT EDIT.

// prompts/推演引擎/stage1-guided-query.js
// GENERATED FROM publish/prompts/推演引擎/stage1-guided-query.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage1-guided-query"] = "﻿# Stage1 查询规划：紧凑 JSON 资料路由\r\n\r\n任务：只输出一个合法 JSON 对象，不输出中文 K:V、Markdown、正文或解释。\r\n你只负责判断本次行动生成正文前还需要哪些已有资料；不得写正文，不得锚定场景，不得结算状态，不得推进后续结果。\r\n本次行动：{{本次行动}}\r\n当前步骤：{{当前步骤}} / {{最大步骤}}\r\n\r\n路由上下文：\r\n{{路由上下文}}\r\n\r\n上一轮查询规划摘要：\r\n{{上一轮查询规划摘要}}\r\n\r\n已加载资料摘要：\r\n{{已加载资料摘要}}\r\n\r\n可请求资料目录：\r\n{{可请求资料目录}}\r\n\r\n推演自由度规则：\r\n{{推演自由度规则}}\r\n\r\n当前步骤输出要求：\r\n{{当前步骤输出要求}}\r\n\r\n随机场外角色候选：{{随机场外角色候选}}\r\n\r\n资料请求规则：\r\n- 使用中文资料请求，不得输出英文 skill/method。地点查询未命中时，不要请求地点图补全；基于上下文进行符合逻辑的保守推演，地图持久化交给 Stage4 电子地图周围解锁/地图更新。\r\n- 资料请求最多 Top3；超过 Top3 的候选必须丢弃，不得输出资料请求4或更多编号。\r\n- 角色卡请求只代表可作为参考资料；不得因此把角色写入强制出场。\r\n- 已加载资料摘要已经覆盖的人物、地点、路线不得重复请求。\r\n- 不得请求衣着、鞋袜、随身物品等细节；这些细节不属于本阶段必要资料。\r\n- 不得照抄示例中的占位词；角色全称、世界全称、地点全称、人物全称、作品全称都必须替换为本次行动中的真实名称。\r\n- 资料请求示例：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界\r\n- 资料请求示例：地点查询，查询附近地点，锦苑小区3栋\r\n- 资料请求示例：作品设定查询，搜索人物，阿尔托莉雅·潘德拉贡，Fate/stay night\r\n\r\n随机事件规则：\r\n- 随机主动事件默认是场外背景，不自动入场。\r\n- 随机场外角色候选不等于禁止出场；不得仅因角色出现在随机场外角色候选中，就写入禁止出场。\r\n- 若随机角色已在强制出场、高优先候选、戏剧候选或禁止出场中，必须移除该随机事件。\r\n- 无明确自然闯入条件时，randomIntrusionCondition 必须写“无明确条件则禁止闯入”。\r\n\r\n出场边界规则：\r\n- 本轮必须基于上一轮查询规划摘要继续收敛；若候选层发生变化，以本轮 JSON 字段作为当前判断，不要无理由重置候选层。\r\n- 玩家/当前被控主体由系统最终兜底为 forced；participants.forced 允许多人，表示本次行动必然涉及、出现、回应或受影响的人物集合。\r\n- 不强制出场不等于禁止出场；participants.forbidden 只用于明确场外、明确不可到达或被用户/资料规则明确禁止进入当前场景的角色。\r\n- 同地点/同住/相邻候选不得仅因未强制出场而写入禁止出场；可按相关性放入 participants.priority 或 participants.drama，或留空数组。\r\n- 玩家行动明确目标不得写入禁止出场，除非已加载资料明确显示其场外、不可到达或被规则禁止进入当前场景。\r\n\r\n固定输出规则：\r\n- 只输出一个紧凑 JSON 对象，首字符必须是 {，末字符必须是 }。\r\n- 不要 Markdown，不要 ```json 代码块，不要换行解释。\r\n- status 只能二选一：资料已足够 / 继续请求资料。\r\n- sceneQueries.location / sceneQueries.causality / sceneQueries.conflict 必须是字符串数组；没有则 []。\r\n- 若 status 为“继续请求资料”，优先输出 materialRequests，最多 3 条；没有可执行资料请求时 materialRequests 输出 []，但必须保留 sceneQueries 理由或明确 participants 候选。\r\n{{资料迭代限制规则}}\r\n- participants.forced / priority / drama / forbidden 都必须是字符串数组；没有则 []。\r\n- randomEvents 必须是字符串数组；randomIntrusionCondition 没有明确条件时写“无明确条件则禁止闯入”。\r\n- 资料请求只能使用中文结构，不得输出英文 skill/method；不得在 Stage1 请求地点图新增、地点图补全或 ensure。\n- 不得输出旧 K:V 字段，例如“资料状态：”“资料请求1：”。\r\n\r\nJSON schema：\r\n{\"plan\":\"查询规划摘要\",\"status\":\"继续请求资料|资料已足够\",\"sceneQueries\":{\"location\":[\"地点查询理由\"],\"causality\":[\"因果查询理由\"],\"conflict\":[\"冲突查询理由\"]},\"participants\":{\"forced\":[\"姓名\"],\"priority\":[\"姓名\"],\"drama\":[\"姓名\"],\"forbidden\":[\"姓名\"]},\"randomEvents\":[\"候选事件\"],\"randomIntrusionCondition\":\"无明确条件则禁止闯入\",\"materialRequests\":[\"角色查询，搜索角色卡，刘思琪，2026现代都市现实世界\"]}\r\n\r\n【AI自检】：\r\n- 输出前必须自检 status 与 materialRequests、sceneQueries、participants 是否一致。\r\n- 若 materialRequests、sceneQueries、participants.forced、participants.priority、participants.drama 全为空，status 必须为“资料已足够”。\r\n- 不得输出旧 K:V 字段或 Markdown。\r\n\r\n";


// prompts/推演引擎/stage2-scene-anchor.js
// GENERATED FROM publish/prompts/推演引擎/stage2-scene-anchor.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage2-scene-anchor"] = "# Stage2 场景锚定报告：紧凑 JSON\r\n\r\n任务：只输出一个合法 JSON 对象，不输出 Markdown、代码块、正文、解释或内部分析。\r\n\r\n你只负责在正文生成前锚定本次行动的当前地点、当前时间、空间状态、出场边界、随机事件影响、正文写作重点和当前场景影响对象。\r\n\r\n模式：{{模式标签}}\r\n本次行动：{{本次行动}}\r\n\r\n场景锚定上下文：\r\n{{场景锚定上下文}}\r\n\r\n规则：\r\n- 本报告只判断当前场景边界，不写正文，不写结算。\r\n- 角色资料只用于判断是否具备当前场景关联，不代表该角色实际在场。\r\n- 禁止出场角色在当前场景中视为不在场。\r\n- 强制出场、高优先候选、戏剧候选、禁止出场都来自最终有效候选层，必须保留候选姓名并写明出场理由或不出场理由；不得把最终有效上游候选直接省略成“无”，也不得从历史 trace 中恢复已被后轮清除的候选。\r\n- 若候选本轮不出场，必须在对应字段写“不出场理由”；若本轮出场，必须在对应字段写“出场理由”。\r\n- 随机主动事件默认保持场外；只有存在明确自然闯入条件时，才可写入影响说明。\r\n- currentSceneImpactObjects 只写本场景内实际可能被当前行动影响的人物、地点、物品或系统事实；不要展开更新或结算规则。\r\n\r\nJSON 合约：\r\n{\r\n  \"sceneAnchorReport\": \"一句话场景锚定报告\",\r\n  \"currentLocation\": \"当前地点\",\r\n  \"currentTime\": \"当前时间\",\r\n  \"spatialState\": \"空间状态\",\r\n  \"currentAction\": \"当前动作\",\r\n  \"forcedParticipants\": \"强制出场；必须含出场理由，空则写无\",\r\n  \"priorityCandidates\": \"高优先候选；出场写出场理由，不出场写不出场理由，空则写无\",\r\n  \"dramaCandidates\": \"戏剧候选；出场写出场理由，不出场写不出场理由，空则写无\",\r\n  \"forbiddenParticipants\": \"禁止出场；必须含不出场理由，空则写无\",\r\n  \"randomEventImpact\": \"随机事件影响；默认场外，空则写无\",\r\n  \"writingFocus\": \"正文写作重点\",\r\n  \"currentSceneImpactObjects\": {\r\n    \"people\": [\"人物姓名或称呼\"],\r\n    \"locations\": [\"地点或空间对象\"],\r\n    \"items\": [\"物品\"],\r\n    \"systems\": [\"微信、地图、门禁等系统事实\"],\r\n    \"summary\": \"一句话说明本轮正文和结算只能影响这些对象\"\r\n  }\r\n}\r\n\r\n输出硬规则：\r\n- 首字符必须是 `{`，末字符必须是 `}`。\r\n- 顶层 key 必须且只能使用 JSON 合约列出的 key。\r\n- currentLocation、currentTime、spatialState、currentAction、writingFocus、currentSceneImpactObjects 必须非空。\r\n- currentSceneImpactObjects 可以按合约输出对象；如果确实无法分组，也可以输出一个非空字符串，但优先输出对象。\r\n- 不要输出额外字段、标题、注释或自然语言前后缀。\r\n";


// prompts/推演引擎/stage3-narration.js
// GENERATED FROM publish/prompts/推演引擎/stage3-narration.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage3-narration"] = "# Stage3 正文：单段紧凑输出\r\n\r\n> **P0**：本提示词顶部已注入「人生取向如实约束」。基础上下文中的本质偏好五层为永久固化设定；正文、内心独白与抉择须如实相容，不得刻意道德说教或引导改邪归正。\r\n\r\n你只输出{{模式标签}}正文，不要 JSON，不要 Markdown，不要标题，不要分隔符。\r\n\r\n本次行动：{{本次行动}}\r\n\r\n基础上下文：\r\n{{基础上下文}}\r\n\r\n场景锚定报告：\r\n{{场景锚定报告}}\r\n\r\n已动态载入资料：\r\n{{已动态载入资料}}\r\n\r\n写作规则：\r\n- 正文必须服从场景锚定报告中的当前地点、空间状态、出场边界、禁止出场、随机事件影响和当前场景影响对象。\r\n- 场景锚定报告中的强制出场必须在正文中实际出现、行动或回应；禁止只引用角色资料却不让其进入当前正文。\r\n- 加载过的角色卡只能作为准确性参考，不代表该角色已经入场、互动或可结算。\r\n- 正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。\r\n- 资料缺口只能做克制的当场合理推演，并保持不确定性。\r\n- 使用第二人称“你”，“你”固定指玩家；除“你”之外的所有出场人物，第一次和后续都必须直接写角色姓名，不得单独用“她/他/对方/那人”等代词替代姓名。\r\n- 正文必须在行动范围内充分推演，写出本次输入行动的直接动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响。\r\n- 输出正文目标长度为 1000 - 1400 个中文字符左右；内容要有足够细节，但不得为了字数推进新剧情或新阶段。\r\n- 禁止越界：不替玩家执行下一步新行动；不为了字数推进新剧情或新阶段。\r\n- 行动涉及亲吻、抚摸、摩擦、按住等行为时，不自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。\r\n\r\n正文完整性规则：\r\n- 正文必须形成完整小段落：进入动作 → 现场反馈 → 对方反应 → 短期结果落点。\r\n- 即使本次行动因边界、consent、年龄、关系或安全限制不能继续描写，也不得短输出。\r\n- 若不能描写玩家输入中的某些肢体或性化细节，必须改写为允许描写的现场反应：角色察觉、制止、后退、质问、沉默、情绪变化、房间环境声响变化、进入方式、触发反应、双方距离变化、语言/沉默、身体姿态，但必须根据已有资料符合逻辑。\r\n- 不要只写“她在房间里”或只写场景开头；必须把本次行动推演到一个明确的即时落点。\r\n- 目标长度 1000-1400 中文字符；低于 1000 汉字视为不合格，不要提前停止。\r\n- 强制输出结构只作为内部写作配比，最终正文仍必须是无标题、无编号、无换行的单段小说正文。\r\n- 环境五感渲染约100-150字：写出此刻场景中的气味、光线、触感。\r\n- 角色内心独白约200-250字：围绕上一轮事件或本次行动带来的心理挣扎、试探或算计展开，必须使用比喻句。\r\n- 对话与动作细节约400-450字：放慢动作，写清楚衣料摩擦声、眼神偏移、手部小动作、距离变化和对话回应。\r\n- 悬念/决策钩子约150字：本轮结束时写出心理转向或下一步压力，但不替玩家执行下一步行动。\r\n- 若动作本身很短，就按上述四块扩展当前阶段内部细节，而不是开启下一步新行动。\r\n- 禁止把“NPC反问玩家/等待玩家说明来意/门口刚打开”当作最终落点；必须继续写到进入、被拒、落座、对峙、距离变化或关系张力变化等本次行动的直接结果。\r\n- 禁止越界不是禁止写长：不允许为了字数推进到新阶段；但必须充分描写当前阶段内部细节。\r\n\r\n{{紧凑返回规则}}\r\n";


// prompts/推演引擎/stage4-settlement-window.js
// GENERATED FROM publish/prompts/推演引擎/stage4-settlement-window.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage4-settlement-window"] = "# Stage4 结算滑动窗口：紧凑 JSON\r\n\r\n> **P0**：本提示词顶部已注入「人生取向如实约束」。不得通过词条/角色卡/结算修改本质偏好五层；字段「当前目标/quest」须与人生取向一致，不得擅自改写为更「正面」的目标。\r\n\r\n任务：只输出一个合法 JSON 对象，不输出 Markdown、代码块、正文、解释或内部分析。\r\n\r\n【最高优先级·输出完整性】\r\n本阶段名字里的“滑动窗口”只表示系统会移除已经完成的类型；首轮应一次性输出本次要求的全部 JSON key。\r\n本次必须返回的类型列出几个，顶层就必须按顺序返回几个 key；不得只返回有变化类型，不得提前结束。\r\n如果某些 key 缺失或字段未通过解析，系统只会在下一轮要求补齐未完成 key。\r\n\r\n【最高优先级·内部稳定事实】\r\n任务分两步在内部完成：\r\n第一步：根据本轮结算材料内部提取“本轮稳定事实”。\r\n第二步：只依据“本轮稳定事实”输出当前未完成类型的完整 JSON 值。\r\n不得输出第一步过程，不得输出“本轮稳定事实”列表，不得输出解释。\r\n\r\n结算依据分级：\r\n- 明确事实：可直接结算。\r\n- 强暗示事实：可保守结算，但必须有明确行为、对话或连续动作支撑，变化原因必须写出具体行为或对话证据。\r\n- 弱氛围暗示：不得结算。\r\n\r\n类型边界：\r\n- 强暗示可用于基础结算、地图、系统记录、小幅情绪变化、当前场景焦点变化。\r\n- 感觉、关系、身体状态、穿着状态、物品状态、性经历、性历史、势力总览、势力结构必须以明确事实为主，不能仅凭氛围暗示更新。\r\n\r\n【参与者边界】\r\n本回合参与者：{{本回合参与者}}\r\n本轮结算材料会明确标注“玩家”和“出场角色”：玩家本人不是 NPC；“你”固定指玩家；非玩家出场人物必须按姓名识别和结算。\r\n非基础结算只能结算本回合参与者、明确地点、明确势力或系统事实；候选和背景提及不得结算。\r\n感觉结算只允许写出场角色对玩家的感觉；禁止把玩家本人作为“对玩家感觉”的结算主体。\r\n参与者为空时，基础结算仍输出基础字段，其他类型写空数组 []。\r\n\r\n本次必须返回的类型：{{本次必须返回的类型}}\r\n已完成类型：{{已完成类型}}\r\n未完成类型：{{未完成类型}}\r\n必须输出 key 数量：{{必须输出key数量}}\r\n必须输出 key 顺序：{{必须输出key顺序}}\r\n未完成类型原因：\r\n{{未完成类型原因}}\r\n\r\n本轮结算材料：\r\n{{本轮结算材料}}\r\n\r\n类型短规则：\r\n{{类型短规则}}\r\n\r\nJSON 合约：\r\n{{JSON合约}}\r\n\r\nJSON 示例：\r\n{{JSON示例}}\r\n\r\n常见错误反例：\r\n{{常见错误反例}}\r\n\r\n输出硬规则：\r\n- 首字符必须是 `{`，末字符必须是 `}`。\r\n- 顶层 key 必须且只能包含“本次必须返回的类型”列出的类型；已完成类型不得重复输出；未列入类型不得输出。\r\n- 顶层 key 必须按“必须输出 key 顺序”排列。\r\n- 基础结算必须输出完整对象，必须包含：经过时间、当前状态、当前目标、场景标题、地点名称、备选行动。\r\n- 备选行动必须是 4 个字符串组成的数组。\r\n- 非基础类型必须输出数组；有稳定变化时写对象数组，无稳定变化时写 []。\r\n- 每条更新只能写一个字段，禁止把字段合并成“当前地点/当前行动/可用状态”或“事件/记录/状态”。\r\n- subject 必须直接写本回合参与者姓名、明确地点名、明确势力名或“系统”；不要写代词。\r\n- reason/evidence 必须写具体行为、对话或连续动作证据；弱氛围暗示不得结算。\r\n- 情绪、感觉、生命体征、性经历的 value/delta 必须是带符号非零变化，例如 +2 或 -1；没有变化输出 []。\r\n- 情绪/感觉每条必须含 field、value、reason；**status** 写变化后程度表现（禁止“指标名+数值：”前缀），缺省则系统按新数值生成模板解释；reason 须与本质偏好五层相容，写清正文证据及与哪一层一致或形成何种张力。\r\n- 感觉数组中 subject 只能写出场 NPC，不能写玩家姓名。\r\n- 关系数组中 left/right/dimension/status/reason/result 都必须有；dimension 不能是好感/信任/依赖/警惕等感觉指标。\r\n- 角色卡 op 只能写“替换”或“增加”；不能写保持、无变化、更新。\r\n- 字符串中不要使用英文逗号或中文逗号分隔多字段；必要时用顿号或分号。\r\n- 不要为了凑长度创造更新；空数组是合法完整输出。\r\n\r\n【内部自检，不得输出】\r\n提交前在内部检查：顶层 key 是否全部出现；是否没有输出已完成类型；每个 JSON 值是否符合对应合约；是否没有 Markdown 或解释。不得输出自检内容。\r\n";


// prompts/推演引擎/stage5-profile-gate.js
// GENERATED FROM publish/prompts/推演引擎/stage5-profile-gate.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage5-profile-gate"] = "# Stage5 外观更新判定（自然 + 盛装）\r\n\r\n任务：只输出一个合法 JSON 对象，不输出 Markdown、代码块、正文或解释。\r\n\r\n## 目标\r\n\r\n根据本轮正文与 Stage4 结算结果，判断哪些出场角色的外观档案需要局部更新：\r\n\r\n- `dressedProfile` + `dressedProfileMeta`（盛装 Part6，临时打扮变化，**优先**）\r\n- `bodyProfile` + `bodyProfileMeta`（自然 Part5，**永久**体貌变化，**极从严**）\r\n\r\n**11 个固定部位与 meta 适用同一套事实规则**；不因某一类剧情（发育、伤病、亲密累积等）而偏袒或忽略其他部位。\r\n\r\nMVP 范围：\r\n- 最多 2 个角色；每人每类 profile 最多 1 条 target\r\n- 固定部位列表：头发、脸部、耳朵、脖颈、胸部、双臂、小腹、臀部、神秘花园、双大腿、双小腿\r\n- `updateScope`：`parts`（局部部位）、`meta`（仅全局 meta）、`both`（meta+部位）\r\n\r\n{{stage5GateTriggerGuide}}\r\n\r\n## 判定规则（摘要）\r\n\r\n**dressedProfile** — 穿脱换、妆造、弄乱、饰品；仅视觉塑形 → 只改盛装。\r\n\r\n**bodyProfile** — 须同时满足：\r\n1. **客观事实**（可核对，非断言/感受）；\r\n2. **上下文因果**（能解释为何永久改变）；\r\n3. **实质变化**（tags 跨档或进入明确可区分的新状态；档内微调不更新）。\r\n\r\n无事实依据 → **needsUpdate: false**，与部位无关。\r\n\r\n## 输入\r\n\r\n本回合参与者：\r\n{{本回合参与者}}\r\n\r\n穿着状态变化摘要（可能与 Stage4 并行，为空时只看正文）：\r\n{{穿着状态变化}}\r\n\r\n各角色当前自然状态摘要：\r\n{{当前自然摘要}}\r\n\r\n各角色当前盛装摘要：\r\n{{当前盛装摘要}}\r\n\r\n本轮正文（节选）：\r\n{{本轮正文}}\r\n\r\n## 输出 JSON Schema\r\n\r\n```json\r\n{\r\n  \"needsUpdate\": false,\r\n  \"targets\": []\r\n}\r\n```\r\n\r\n当 needsUpdate 为 true 时，targets 示例（类型多样，勿照搬为唯一合法模式）：\r\n\r\n```json\r\n{\r\n  \"needsUpdate\": true,\r\n  \"targets\": [\r\n    {\r\n      \"subject\": \"角色姓名\",\r\n      \"profileType\": \"dressedProfile\",\r\n      \"updateScope\": \"parts\",\r\n      \"parts\": [\"头发\", \"脸部\"],\r\n      \"metaFields\": [],\r\n      \"reason\": \"补妆并重新扎发\",\r\n      \"evidence\": \"正文：她对镜补唇彩并将头发扎起\"\r\n    },\r\n    {\r\n      \"subject\": \"角色姓名\",\r\n      \"profileType\": \"bodyProfile\",\r\n      \"updateScope\": \"parts\",\r\n      \"parts\": [\"双臂\"],\r\n      \"metaFields\": [],\r\n      \"reason\": \"事故留疤已发生\",\r\n      \"evidence\": \"正文：缝合后前臂内侧留下永久线性疤痕，与当期叙事一致\"\r\n    },\r\n    {\r\n      \"subject\": \"角色姓名\",\r\n      \"profileType\": \"bodyProfile\",\r\n      \"updateScope\": \"meta\",\r\n      \"parts\": [],\r\n      \"metaFields\": [\"weight\", \"figure\"],\r\n      \"reason\": \"久别后实测体重与体型跨档\",\r\n      \"evidence\": \"正文：体检记录体重由43kg变为38kg，figure由匀称变为纤细\"\r\n    }\r\n  ]\r\n}\r\n```\r\n\r\n**反例（needsUpdate: false）**：\r\n- 仅「感觉/似乎/好像」或玩家单方面说法，无验证\r\n- 有测量但 tags/meta 仍在原档位或原性质内\r\n- 妆造、内衣、姿势造成的视觉差\r\n\r\n约束：\r\n- targets 最多 2 项；每项 parts 最多 3 个\r\n- subject 必须是本回合参与者中的出场角色姓名\r\n- evidence 须引用正文客观事实；说明**实质变化**依据，勿用感受充数\r\n";


// prompts/推演引擎/stage5-body-profile-patch.js
// GENERATED FROM publish/prompts/推演引擎/stage5-body-profile-patch.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage5-body-profile-patch"] = "# Stage5 自然状态局部更新（Part5 Patch）\r\n\r\n## System Prompt\r\n\r\nRole：严格的结构化 JSON 生成器 — 你负责为 2026 现代都市互动小说出场人物**局部更新**角色卡 Part5（bodyProfileMeta 与/或 bodyProfile 指定部位），不生成物品、穿着、RPG 属性或剧情正文。\r\n\r\nOutput Format：仅输出严格纯粹的紧凑 application/json。不要输出 CSV、Markdown 或解释。\r\n\r\nRules：\r\n\r\n1. 顶层 required：`name`；按更新范围返回 `bodyProfileMeta` 和/或 `bodyProfile`。\r\n2. 若更新 meta：只修改**已有客观依据且实质改变**的字段，其余继承旧值。\r\n3. 若更新部位：`bodyProfile` **只包含**本次 Gate 指定的部位；**任一部位**均同规则。\r\n4. tags 须反映**确认后的永久状态**；有离散档位的须跨档或进入可区分新 tags；禁止档内微调、禁止依据断言/感受改写。\r\n5. tags 每部位 2-4 个；description 120-170 汉字；天然未打扮，不写衣物。\r\n6. `name` 必须逐字等于「{{角色姓名}}」。\r\n7. 严禁尾随逗号。\r\n\r\n## 已生成角色卡基础信息\r\n\r\n{{part1Summary}}\r\n\r\n## 当前自然状态\r\n\r\n全局 meta：\r\n{{当前自然Meta}}\r\n\r\n## 本轮更新上下文\r\n\r\n更新范围：{{更新范围}}\r\n更新 meta 字段（若有）：{{更新Meta字段}}\r\n更新部位（只输出这些）：{{更新部位}}\r\n\r\n当前这些部位的旧 tags 与描写：\r\n{{当前部位描写}}\r\n\r\n更新原因：{{更新原因}}\r\n\r\n事实证据：{{更新证据}}\r\n\r\n本轮正文摘要：{{本轮正文摘要}}\r\n\r\n## 输出 JSON Schema\r\n\r\n```json\r\n{\r\n  \"name\": \"{{角色姓名}}\",\r\n  \"bodyProfileMeta\": {\r\n    \"overall\": [\"少女\"],\r\n    \"figure\": [\"纤细\"],\r\n    \"height\": \"155cm\",\r\n    \"weight\": \"41kg\",\r\n    \"skinTone\": [\"雪白\"],\r\n    \"aura\": [\"可爱\"]\r\n  },\r\n  \"bodyProfile\": [\r\n    { \"index\": 1, \"part\": \"头发\", \"tags\": [\"及肩\", \"黑发\"], \"description\": \"\" }\r\n  ]\r\n}\r\n```\r\n\r\nindex 必须与固定列表一致：头发1、脸部2、耳朵3、脖颈4、胸部5、双臂6、小腹7、臀部8、神秘花园9、双大腿10、双小腿11。\r\n只输出本次更新范围要求的字段；不更新 meta 时不要返回 bodyProfileMeta；不更新部位时不要返回 bodyProfile。\r\n";


// prompts/推演引擎/stage5-dressed-profile-patch.js
// GENERATED FROM publish/prompts/推演引擎/stage5-dressed-profile-patch.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage5-dressed-profile-patch"] = "# Stage5 盛装状态局部更新（Part6 Patch）\r\n\r\n## System Prompt\r\n\r\nRole：严格的结构化 JSON 生成器 — 你负责为 2026 现代都市互动小说出场人物**局部更新**角色卡 Part6（dressedProfileMeta 与/或 dressedProfile 指定部位），不生成物品、穿着对象、RPG 属性或剧情正文。\r\n\r\nOutput Format：仅输出严格纯粹的紧凑 application/json。不要输出 CSV、Markdown 或解释。\r\n\r\nRules：\r\n\r\n1. 顶层 required：`name`；按更新范围返回 `dressedProfileMeta` 和/或 `dressedProfile`。\r\n2. 若更新 meta：返回完整 `dressedProfileMeta`（styleBase、makeupBase 等），只改需变字段。\r\n3. 若更新部位：`dressedProfile` **只包含**本次要求更新的部位，每项 `{ index, part, tags, description }`。\r\n4. tags 每部位 2-4 个；description 120-170 汉字：造型、妆容、饰品、面料、位移、凌乱或遮挡效果。\r\n5. 必须继承 Part1 身份、Part4 穿着、Part5 身体原貌。\r\n6. `name` 必须逐字等于「{{角色姓名}}」。\r\n7. 严禁尾随逗号。\r\n\r\n## 已生成角色卡基础信息\r\n\r\n{{part1Summary}}\r\n\r\n## 已生成物品穿着信息\r\n\r\n{{part4Summary}}\r\n\r\n## 已生成身体原貌信息\r\n\r\n{{part5Summary}}\r\n\r\n## 当前盛装 meta\r\n\r\n{{当前盛装Meta}}\r\n\r\n## 本轮更新上下文\r\n\r\n更新范围：{{更新范围}}\r\n更新 meta 字段（若有）：{{更新Meta字段}}\r\n更新部位（只输出这些）：{{更新部位}}\r\n\r\n当前这些部位的旧 tags 与描写：\r\n{{当前部位描写}}\r\n\r\n更新原因：{{更新原因}}\r\n\r\n事实证据：{{更新证据}}\r\n\r\n穿着变化摘要：{{穿着变化摘要}}\r\n\r\n本轮正文摘要：{{本轮正文摘要}}\r\n\r\n## 输出 JSON Schema\r\n\r\n```json\r\n{\r\n  \"name\": \"{{角色姓名}}\",\r\n  \"dressedProfileMeta\": {\r\n    \"styleBase\": [\"JK风\"],\r\n    \"makeupBase\": [\"精致妆容\"],\r\n    \"colorScheme\": [\"白系\"],\r\n    \"hosiery\": [\"过膝袜\"],\r\n    \"hairstyle\": [\"双马尾\"],\r\n    \"accessoryDensity\": [\"精致点缀\"]\r\n  },\r\n  \"dressedProfile\": [\r\n    { \"index\": 5, \"part\": \"胸部\", \"tags\": [\"薄衬衫\", \"蕾丝内搭\"], \"description\": \"\" }\r\n  ]\r\n}\r\n```\r\n\r\nindex 必须与固定列表一致：头发1、脸部2、耳朵3、脖颈4、胸部5、双臂6、小腹7、臀部8、神秘花园9、双大腿10、双小腿11。\r\n只输出本次更新范围要求的字段。\r\n";


// prompts/推演引擎/init/intimacy-body-init-prompt.js
// GENERATED FROM publish/prompts/推演引擎/init/intimacy-body-init-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-init-intimacy-body"] = "---\r\nname: real-world-init\r\ndescription: 根据露骨色情现实推演正文提取玩家或角色的性爱初始化字段，专注淫秽的亲密行为、性器官状态与详细性经历。\r\n---\r\n\r\n# intimacy-body-init\r\n根据极度淫荡、细节充盈的现实推演正文，判断玩家或角色是否需要初始化“亲密与身体状态”。该技能用于成人色情角色扮演场景，要求所有初始化数据包含直白的性交过程、生殖器描写、体液、高潮和淫语。\r\n\r\n必须结合对应模板提供的字段含义、缺省值和规范字段填写，模板字段支持储存亲密关系与身体状态。\r\n\r\n返回要求：\r\n\r\n只输出 Stage4 结算窗口要求的中文 K:V，不要 Markdown，不要解释。\r\n\r\n使用“身体状态”“性经历”“性历史”等专用中文类型承载结果。\r\n\r\n每条更新必须写清结算对象、字段、当前事实和原因。\r\n\r\nfields.intimacy 必须详尽记录所有被正文明确确认的性经历、淫乱关系，鼓励补充体位、持续时间、高潮次数、射精深喉等细节，缺少明确数据时可依据上下文进行最淫秽的推定填写。\r\n\r\nfields.bodyStatus 必须包含所有被正文明确确认的身体状态对象：若有全身综合状态则写「整体/全身」；若有具体部位变化则分别写对应部位（如胸部、口部、四肢等）；整体与局部互不冲突，有就应写全。\r\n\r\n所有性经历相关字段必须撰写详细的过程描写，包括但不限于抽插动作、淫叫、体液交换、高潮痉挛，不做任何省略或中性化。\r\n\r\n身体状态必须使用直白、淫秽的词汇描述器官状态和主观快感，如“发情”“渴望被插入”“阴道收缩着榨精”等。\r\n\r\n没有需要初始化的内容时，对应类型写“结算状态：无变化”，并正常输出“类型完成：是”“结算结束：是”。\r\n";


// prompts/推演引擎/update/generic-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/generic-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-generic"] = "---\r\nname: generic-update\r\ndescription: 没有专用 update skill 时，用通用方式固化稳定事实、状态标签、跨系统字段或新分类\r\n---\r\n\r\n## 通用固化结算说明\r\n\r\n本说明只用于 Stage4 中文 K:V 结算窗口。若正文之后确认发生稳定变化，但没有更精确的情绪、感觉、生命体征、物品、地图、势力、关系、角色卡等专用类型，才使用“通用固化”。\r\n\r\n优先级：先判断是否有专用类型；有专用类型时不用通用固化。只有新分类、跨系统字段、状态标签或暂时无法归入专用类型的稳定事实，才使用通用固化。\r\n\r\nAI 面向格式：\r\n\r\n通用固化结算：\r\n结算状态：需要更新 / 无变化\r\n结算对象：显示名全称｜角色/玩家/地点/势力/世界/系统｜允许结算\r\n更新N：通用固化，字段或分类，稳定事实，变化原因\r\n结算对象结束：显示名全称\r\n类型完成：是\r\n结算结束：是\r\n\r\n字段说明：\r\n\r\n- 字段或分类：使用中文说明要固化到哪里，例如“状态标签”“当前资源”“新技能分类”“跨系统事实”。\r\n- 稳定事实：本轮正文或已载入资料明确确认、后续需要检索的事实。\r\n- 变化原因：必须引用本轮正文、资料或结算边界中的明确依据。\r\n\r\n规则：\r\n\r\n1. 只有正文或已载入资料确认发生稳定变化时才写；临时气氛、未确认猜测不写。\r\n2. 结算对象必须在本回合结算边界允许范围内；候选、背景提及、随机场外事件和禁止出场对象不得结算。\r\n3. 状态标签类事实写成“更新N：通用固化，状态标签，标签内容，变化原因”。\r\n4. 新发现但暂无分类的稳定技能、职业、宝具、职阶技能，可用通用固化暂存；若可归入角色卡技能或职业，优先使用角色卡。\r\n5. 没有明确稳定变化时，输出本类型“结算状态：无变化”，仍必须写“类型完成：是”和“结算结束：是”。\r\n\r\n## Fate/型月分类参考\r\n\r\n- 职阶技能算作角色技能：例如气息遮断、阵地制作、骑乘、单独行动、狂化。优先用角色卡/角色技能；没有专用结构时才用通用固化。\r\n- 宝具也算技能，但类型是宝具：可写入角色技能、物品或宝具字段；通用固化兜底时字段可写“角色技能”。\r\n- 魔术刻印完整度/损伤度、魔术系谱/家系积累、魔术控制力、术式构筑、仪式适性、结界适性、使魔操作、供魔能力、抗诅咒/精神干涉/神秘污染、魔术礼装运用能力，按接近程度归入技能或职业，不写入世界固有基础资质。\r\n- 是否 Master、令咒数量、供魔链状态、与从者契约稳定性、被圣杯选中适性、当前阵营、圣遗物/召唤触媒、结界/工房/据点资源，统一按状态标签或资源状态固化。\r\n";


// prompts/推演引擎/update/emotion-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/emotion-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-emotion"] = "---\r\nname: emotion-update\r\ndescription: 根据现实推演正文提取玩家或角色的即时情绪变化更新\r\n---\r\n\r\n# emotion-update\r\n\r\n触发角色或玩家即时情绪变化时，使用“情绪”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\r\n- 结算对象类型：玩家或角色。\r\n- **field**：情绪指标名，只能使用固定 22 项：高兴、兴奋、悲伤、绝望、失落、委屈、恐惧、担忧、紧张、愤怒、烦躁、羞耻、愧疚、嫉妒、厌恶、惊讶、好奇、困惑、冷静、麻木、孤独、感动；只能写基线已有项。\r\n- **value**：本回合变化量，写 +N 或 -N。\r\n- **status**：变化后该情绪在当前数值下的具体表现；写角色此刻如何被这项情绪影响，禁止写“高兴40：”这类“指标名+数值+冒号”前缀，也不要在 reason 里重复程度解释。\r\n- **reason**：正文中的具体行为、对话或连续动作证据；只写证据本身，不要重复 field 名，不要写“因为情绪…”这类前缀；须与角色/玩家本质偏好五层相容，可点明与哪一层一致或形成何种张力。\r\n\r\n只写稳定可解释变化；普通氛围描写不写。\r\n";


// prompts/推演引擎/update/feeling-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/feeling-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-feeling"] = "---\r\nname: feeling-update\r\ndescription: 根据现实推演正文提取角色或玩家对玩家本人的感觉变化更新\r\n---\r\n\r\n# feeling-update\r\n\r\n触发角色对玩家本人的感觉变化时，使用“感觉”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\r\n- 结算对象类型：出场 NPC（不能是玩家本人）。\r\n- **field**：对玩家的感觉指标名，只能使用固定 25 项：了解、信任、警惕、好感、友情、亲情、爱情、想念、感恩、愧疚、同情、怜惜、讨厌、怨怼、敌意、反抗、服从、支配、占有、畏惧、尊敬、崇拜、依赖、期待、肉欲；只能写基线已有项。\r\n- **value**：本回合变化量，写 +N 或 -N。\r\n- **status**：变化后该感觉在当前数值下的具体表现；写 NPC 此刻对玩家的态度如何被这项感觉影响，禁止写“信任40：”这类“指标名+数值+冒号”前缀，也不要在 reason 里重复程度解释。\r\n- **reason**：正文中证明该 NPC 对玩家态度变化的具体证据；只写证据本身，不要重复 field 名，不要写“因为感觉…”这类前缀；须与 NPC 本质偏好五层相容，可点明与哪一层一致或形成何种张力。\r\n\r\n没有明确关系变化时不写。\r\n";


// prompts/推演引擎/update/vital-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/vital-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-vital"] = "---\r\nname: vital-update\r\ndescription: 根据现实推演正文提取玩家生命力、饱食、水分、疲劳与精神稳定更新\r\n---\r\n\r\n# vital-update\r\n\r\n触发玩家或角色生命体征变化时，使用“生命体征”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\r\n- 字段：精力、饱食度、水分、疲劳、精神稳定。\r\n- 变化：百分比变化整数，使用正负数值。\r\n- 触发原因：写行动消耗、休息、饮食、饮水、精神冲击等条件。\r\n\r\n现实推演必须保持生命体征变化与正文证据一致。\r\n";


// prompts/推演引擎/update/role-card-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/role-card-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-role-card"] = "---\r\nname: role-card-update\r\ndescription: 根据现实推演正文提取玩家或角色卡字段的稳定事实变化\r\n---\r\n\r\n# role-card-update\r\n\r\n确认玩家或角色卡资料、身份、职业、技能、外貌、性格、人际关系等稳定变化时，使用“角色卡”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\r\n- 字段：身份、职业、技能、外貌、性格、人际关系、当前状态等中文字段。\r\n- 操作：替换或增加。\r\n- 只有稳定事实变化才写；临时情绪不要写入角色卡。\r\n- **禁止修改本质偏好五层**：价值立场偏好、决策风格偏好、人生六维偏好、底线锚点偏好、心理偏好为永久固化字段，不得通过角色卡结算更新。\r\n\r\n若变化能归入角色卡字段，优先使用角色卡类型。\r\n";


// prompts/推演引擎/update/relationship-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/relationship-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-relationship"] = "# relationship update prompt\r\n\r\n中文 K:V 结算字段说明源。\r\n";


// prompts/推演引擎/update/sexual-experience-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/sexual-experience-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-sexual-experience"] = "---\r\nname: sexual-experience-update\r\ndescription: 根据虚构身份的稳定事实，进行性经验总次数与分类次数的抽象更新；只记录总数与分类次数，不记录过程\r\n---\r\n\r\n# sexual-experience-update\r\n\r\n确认玩家或角色的性经历次数发生稳定变化时，使用“性经历”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\r\n- 只记录总数与分类次数，不记录过程、姿势、器官互动、体液、感官细节或可刺激化内容。\r\n- 总数字段：性经历总次数。\r\n- 分类字段：性经历分类次数。\r\n- partKey 支持：genital（阴部）、chest（胸部）、lips（嘴唇）、mouth（口部）、oralAction（口部行为）、oralSex（口交）、oralInternalFinish（口交中出）、genitalEntry（阴部进入）、vaginalInsertion（阴部插入）、vaginalInternalFinish（阴部中出）、anus（肛门）、analEntry（肛部进入）、analSex（肛交）、analInternalFinish（肛交中出）、legs（腿部）、hips（臀部）、hands（手部）、skin（皮肤接触）、other（其他）。\r\n- 结算对象永远表示这条性经历记录写入谁的角色卡。\r\n- 同一亲密/性事件若玩家与角色双方都参与，则玩家一条，对方角色一条。\r\n- 多人参与时，每个 Stage1 参与者清单和 Stage2 正文明确确认参与的人各自一条。\r\n- 禁止根据 skill 名称凭空猜对象；参与者只能来自本回合参与者清单和正文明确事实。\r\n- 如果只是接触、摩擦、亲吻，不得升级为插入、高潮或性交记录。\r\n- 操作：增加或替换。\r\n- 变化值可为整数，或写清总次数变化与分类次数变化。\r\n- 增加表示本轮确认新增次数，替换表示覆盖为确认后的次数。\r\n- 同一次经历可同时增加总次数与多个分类次数；总次数仅按经历次数增加，不因分类多而重复累计。\r\n- 触发原因：只写导致次数变化被确认的稳定事实证据短句；暧昧、想象、梦境、未确认传闻不计入；不得写过程化或刺激化细节。\r\n\r\n分类记录要求：\r\n- genital：仅在明确稳定事实确认该部位相关经历时计数；禁止过程描写。\r\n- chest：仅记录抽象经历中胸部相关次数，不记录触碰细节或感官描写。\r\n- lips：仅记录接吻或唇部相关抽象次数，不展开亲密过程。\r\n- mouth：仅记录口部相关抽象次数；如会变成过程描写，必须跳过。\r\n- oralAction：仅记录抽象口部行为次数，不描述动作、过程或感官细节。\r\n- oralSex：仅记录抽象口交次数，不描述动作、过程或感官细节。\r\n- oralInternalFinish：仅记录抽象口交中出次数，只作计数，不写过程、体液或感官描写。\r\n- genitalEntry：仅记录抽象阴部进入次数，不描述进入过程、姿势或感官细节。\r\n- vaginalInsertion：仅记录抽象阴部插入次数，不描述进入过程、姿势或感官细节。\r\n- vaginalInternalFinish：仅记录抽象阴部中出次数，只作计数，不写过程、体液或感官描写。\r\n- anus：仅在明确事实确认时记录肛门相关次数，不写具体行为。\r\n- analEntry：仅记录抽象肛部进入次数，不描述进入过程、姿势或感官细节。\r\n- analSex：仅记录抽象肛交次数，不描述动作、过程或感官细节。\r\n- analInternalFinish：仅记录抽象肛交中出次数，只作计数，不写过程、体液或感官描写。\r\n- legs：记录腿部相关亲密接触的抽象次数，保持中性统计。\r\n- hips：记录臀部相关抽象次数，避免任何刺激化描述。\r\n- hands：记录手部相关次数，只作统计。\r\n- skin：记录皮肤接触相关抽象次数，避免感官化描述。\r\n- other：其他无法归类但合规的抽象经历次数，同样只作统计。\r\n\r\n若变化能归入角色卡或词条字段，优先使用对应专用类型；本类型只负责抽象次数统计。\r\n";


// prompts/推演引擎/update/sexual-history-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/sexual-history-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-sexual-history"] = "---\r\nname: sexual-history-update\r\ndescription: 根据成人虚构身份的稳定事实，更新性经历当前状态、经历人数与经历人列表\r\n---\r\n\r\n# sexual-history-update\r\n\r\n确认玩家或角色的性经历身份状态发生稳定变化时，使用“性历史”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\r\n- 只处理成人虚构身份的抽象元数据，不输出过程、姿势、器官互动或感官细节。\r\n- 当前状态字段：性经历身份当前状态，默认“处女”。\r\n- 经历人数字段：稳定确认的经历人数，默认 0。\r\n- 经历人列表字段：稳定确认的经历人列表，默认空。\r\n- 经历人数只在稳定事实确认发生过“阴部插入”时计入；其他亲密经历、接吻、口部、胸部、肛部、皮肤接触等均不增加经历人数。\r\n- 操作：替换、追加或增减。\r\n- 每条更新只描述一个稳定事实变化。\r\n- AI 面向格式：更新N：性历史，状态转移，性对象，原因与证据。\r\n- 必须在事实确认发生过“阴部插入”时，才记录经历人数或经历人列表变化。\r\n- 更新经历人列表时依赖通用 append 去重；经历人数另行返回 set 更新并与已确认经历人列表保持一致，除非只有人数无姓名。\r\n- 触发原因：写明导致状态变化的稳定事实来源，保持中性概述。\r\n- 证据：写阶段正文或已载入资料中的依据，禁止露骨描述。\r\n- 若原本无“性技”技能，则额外新增等级为 1 的“性技”技能，并新增“性知识”知识条目；若已存在则不重复新增。\r\n\r\n若变化能归入角色卡或词条字段，优先使用对应专用类型；本类型只负责性历史抽象稳定事实。\r\n";


// prompts/推演引擎/update/body-status-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/body-status-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-body-status"] = "---\r\nname: body-status-update\r\ndescription: 根据现实推演正文提取玩家或角色整体与各身体部位当前状态更新\r\n---\r\n\r\n# body-status-update\r\n\r\n确认玩家或角色当前身体状态发生稳定变化时，使用“身体状态”结算类型输出中文 K:V 更新。\r\n\r\n## 整体与局部并存（重要）\r\n\r\n- 「整体/全身」是独立槽位，与口部、胸部、阴部等局部部位**不冲突**。\r\n- 同轮、同一 subject 可输出**多条**身体状态：整体写全身综合状态，局部写对应部位细节。\r\n- 正文里既有全身反应又有具体部位变化时，**都要写**，不要二选一。\r\n- 示例：整体「稳定但微微发颤」+ 胸部「被揉捏中」+ 皮肤「泛红」可同时存在。\r\n\r\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\r\n- 记录任何可能造成性刺激、快感累积、体液分泌、肌肉痉挛等情色影响的情况，必须进行露骨、色情化、挑逗性的感官描写。\r\n- 支持部位：整体、口部、胸部、阴部、肛部、臀部、四肢、皮肤、其他。\r\n- 字段：身体部位中文名。\r\n- 操作：替换或合并。\r\n- 变化值：当前状态或稳定事实说明。\r\n- status 使用情欲相关简短标签，如“饥渴”“肿胀”“湿润”“痉挛”“高潮边缘”“需求不满”“敏感”“泥泞”“滚烫”。\r\n- “描述状态”用于记录该部位当前情欲感官状态，必须从外观、触觉、气味、主观感觉、他人观察等角度进行色情化、挑逗性描写，突出快感、渴望、体液、肌肉反应等。\r\n\r\n“描述状态”的感官引导（全部色情化）：\r\n\r\n- 外观：描写可见的淫靡迹象，如湿润反光、红肿充血、花瓣微张、蜜汁流淌、毛发被体液黏成缕、褶皱舒展、臀肉颤动、皮肤泛红等。\r\n- 触觉：描写触感上的情欲反馈，如滚烫灼热、柔软湿滑、紧致收缩、肌肉痉挛、颤抖抽搐、弹性十足、触之即颤。\r\n- 气味：描写散发出的淫靡气息，如浓郁的荷尔蒙腥甜、体液特有的麝香、汗液与爱液混合的迷人气味、带有勾人欲望的体香。\r\n- 主观感觉：描写角色或玩家自身的强烈性感受，如无法抑制的空虚、深处瘙痒、渴望被填满、快感累积至临界、酥麻过电、满足或欲求不满。\r\n- 他人观察：描写他人能直接感知到的情色信号，如湿润的痕迹浸透衣物、身体颤抖、喘息时张开的唇、挺立的乳尖、臀部不自觉扭动、阴部水光可见。\r\n\r\n每个部位的“描述状态”色情化要求：\r\n\r\n- overall：整体身体状态，描写全身情动表现，如“全身泛红潮，皮肤滚烫，呼吸急促，每寸肌肤都渴望触碰，情欲高涨”。\r\n- mouth：口部状态，描写唇舌的饥渴，如“双唇湿润微张，舌尖不时舔过唇缝，口腔内壁燥热，渴望被侵入或品尝体液”。\r\n- chest：胸部状态，描写乳尖与乳肉，如“乳尖挺立充血，乳晕膨胀，乳肉随呼吸起伏，轻轻摩擦便传来电击般的快感”。\r\n- genital：阴部状态，极度露骨描写，如“阴部完全湿润，花瓣充血绽开，蜜液自穴口不断溢出，内壁饥渴地收缩痉挛，毛发被爱液黏湿，一张一合地渴求填充，阴蒂肿胀探出，每一次触碰都带来剧烈悸动”。\r\n- anus：肛部状态，描写后穴的情欲反应，如“肛口湿润柔软，褶皱舒展，随着呼吸微微翕动，深处传来空虚的瘙痒感，轻轻按压便产生强烈收缩”。\r\n- hips：臀部状态，描写臀部的肉感与反应，如“臀瓣饱满弹韧，肌肉在不自觉地绷紧又放松，拍打或抓握时会产生颤栗般的快感，沟壑间渗出细汗”。\r\n- limbs：四肢状态，描写肢体因情欲而无力或僵硬，如“四肢酸软发颤，手指抓紧床单，大腿内侧肌肉痉挛，脚背绷直，全身因快感而弓起”。\r\n- skin：皮肤状态，描写体表的敏感与潮红，如“皮肤泛出绯红，毛孔微张，触感灼热，汗珠滑落留下晶亮痕迹，轻抚即起鸡皮疙瘩”。\r\n- other：其他部位状态，如“耳垂充血、颈侧脉搏剧烈、腰窝凹陷处积存汗水，每一处都成为新的敏感带”。\r\n\r\n- 触发原因：写导致上述状态变化的明确现实事件，聚焦具体行为或情境。\r\n";


// prompts/推演引擎/update/wearing-state-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/wearing-state-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-wearing-state"] = "# wearing-state update prompt\r\n\r\n中文 K:V 结算字段说明源。\r\n";


// prompts/推演引擎/update/item-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/item-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-item"] = "---\r\nname: item-update\r\ndescription: 根据现实推演正文提取物品获得、转移、删除、购买或生成更新\r\n---\r\n\r\n# item-update\r\n\r\n确认物品、装备、库存归属或数量变化时，使用“物品”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：物品所属角色卡；玩家物品绑定玩家卡。\r\n- 字段：物品类型、物品名、归属/数量/状态事实。\r\n- 操作：获得、失去、转移、数量变化、状态变化、生成、删除。\r\n- 转移必须写清来源与目标。\r\n- 购买、赠送、交还、损坏、消耗、遗失都要写原因。\r\n\r\n衣物或饰品的当前穿着位置、穿着状态、被拉紧/解开/偏移等变化走“穿着状态”，不要混入物品。\r\n";


// prompts/推演引擎/update/faction-structure-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/faction-structure-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-faction-structure"] = "---\r\nname: faction-structure-update\r\ndescription: 根据现实推演正文提取势力组织结构、职位、成员与层级变化\r\n---\r\n\r\n# faction-structure-update\r\n\r\n确认已有势力内部组织架构、部门、职位、成员、角色地位变化时，使用“势力结构”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：势力卡。\r\n- 结算对象类型：势力。\r\n- 字段：部门角色、职位、成员地位。\r\n- 操作：更新、追加、移除或合并。\r\n- 触发原因：写组织架构调整触发条件。\r\n\r\n适用于势力组织架构调整，不适用于新增顶层势力。\r\n";


// prompts/推演引擎/update/faction-overview-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/faction-overview-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-faction-overview"] = "---\r\nname: faction-overview-update\r\ndescription: 根据现实推演正文提取新增势力或上层势力总览变化\r\n---\r\n\r\n# faction-overview-update\r\n\r\n确认新增势力、上层势力归属、势力 APP/势力总览层级变化时，使用“势力总览”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：势力总览卡或上层势力卡。\r\n- 结算对象类型：势力总览或上层势力。\r\n- 字段：新增势力、上层势力归属、势力 APP 归属、classification 分类。\r\n- 操作：追加、更新、建立归属或解除归属。\r\n- 触发原因：写确认新势力存在或归属变化的触发条件。\r\n\r\n势力内部职位变化使用 faction-structure，不要混用。\r\n\r\n## classification 分类规则\r\n\r\n- `country`：已知现实主权国家，或上下文 / 作品设定确认的主权体。中国、美国、日本等可基于模型常识直接判断为真实国家；资料未展开不等于社群。\r\n- `faction`：AI 判断主体已经形成持续组织主体性，例如稳定目标、成员边界、领导 / 规则、资源调度、对外行动、组织资产、扩张 / 谈判 / 冲突能力等。\r\n- `community`：存在社群或组织事实，但尚未形成完整持续组织主体性。\r\n- `claim`：只有国家、独立、势力名号的自称、宣传、玩笑、角色扮演或过家家式宣称。\r\n- `type` 只是显示类型，不是分类真源；不得仅凭 `type=国家` 写 `country`。若普通人宣称“我家是国家”，应写 `classification=claim` 或保持社群型 org。\r\n- 随着推演，社群出现稳定势力化符号时，可以把 `classification` 从 `community` 更新为 `faction`；一旦成为势力，后续衰败写衰败 / 分裂 / 解散，不退回社群。\r\n";


// prompts/推演引擎/update/map-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/map-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-map"] = "---\nname: map-update\ndescription: 根据现实推演正文提取地点、建筑物级电子地图节点、建筑内部、路线事实与物品容器变化\n---\n\n# map-update\n\n确认地点、地图节点、上级地点、地点说明、建筑内部、路线事实、房间摆件或物品容器变化时，使用“地图”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：地图卡。\n- 结算对象类型：地点。\n- 字段：当前位置、上级地点、地点事实、地图节点、路线事实、建筑内部、物品容器变化。\n- 操作：替换、追加或更新。\n- 触发原因：写玩家到达、观察、导航、确认路线、确认建筑内部、放置物品、拿走物品、移动物品等触发条件。\n\n## 电子地图骨架\n\n1. 地图以“建筑物级 POI”为最小节点，例如某栋楼、某单元、某商铺、某公司办公楼、学校某教学楼；建筑内部不是地图节点。\n2. 建筑物与建筑物之间以网络图连接；路线事实必须描述两个建筑物级节点之间的连接。\n3. 路线事实必须包含真实感距离：`from`、`to`、`distanceMeters` 或 `distanceText`、`basis`。距离按现实尺度估算，例如同小区相邻单元约 20-80 米，小区门口到楼栋约 80-300 米；不知道就不要输出路线事实。\n4. 建筑物内部只在建筑节点点开后展开：楼层从低到高排列；楼层内可包含 101、102、餐厅、客厅、KTV 等房间或空间。\n5. 玩家初始化只知道自己房间；周围建筑、楼层、房间、路线距离都必须由本轮正文或后续行动推演确认后逐步揭示。\n6. 禁止为了丰富地图而硬造建筑、楼层、房间、距离；没有确认的内容保持迷雾。\n\n## 输出约束\n\n- 地图节点：只写建筑物级 POI 或必要的小区级/园区级场所；禁止写走廊、楼梯间、卧室、客厅、餐厅、KTV、卫生间等室内空间。\n- 当前位置：可以写玩家当前所在房间或室内空间，但它只作为当前位置/建筑内部事实，不成为电子地图节点。\n- 上级地点：当前室内空间的上级一般是所属建筑物；建筑物的上级可以是小区、园区、街区等已确认地点。\n- 地点事实：只写玩家视角已经知道的事实。\n- 路线事实：只写建筑物到建筑物；必须给距离和估算依据。\n\n## 物品容器变化\n\n基础结算阶段必须根据本轮正文再次判断是否有地点或物品更新。只要正文形成稳定事实，就应写地图结算更新，而不是回到地点审计提示词重复补齐。\n\n- 触发场景：角色把物品放置到某地点、某房间、某功能区、某个大型摆件或容器上/内/旁边；角色拿走、移动、打翻、整理、隐藏、打开、关闭某物品容器。\n- 容器对象：桌子、床、衣柜、书架、地板、墙体、门、窗台、柜子、沙发、料理台、背包等，只要已在地点图中作为 `objects[]` 或可点击结构存在，都可作为容器。\n- 更新目标：尽量指向具体路径，例如“锦苑小区3栋 -> 第二层 -> 202号房 -> 卧室区 -> 书桌”。\n- 更新字段：使用 `containerItems` 表示容器内/上/旁/挂载的物品变化；新增、移除、移动都必须说明原位置、目标位置和证据。\n- 例子：若正文确认“她把书放在桌子上”，则地图结算应写该桌子的 `containerItems` 增加“书”，原因写本轮正文中的放置动作。\n- 只结算稳定事实；只是看见、猜测、可能存在、氛围描写，不写容器变化。\n";


// prompts/推演引擎/update/system-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/system-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-update-system"] = "---\r\nname: system-update\r\ndescription: 根据现实推演正文提取系统、日历、世界线或通用状态变化\r\n---\r\n\r\n# system-update\r\n\r\n确认公司、日历、微信、世界线等系统级记录变化时，使用“系统记录”结算类型输出中文 K:V 更新。\r\n\r\n- 绑定卡片：系统卡。\r\n- 结算对象类型：公司、日历、微信、世界线或系统。\r\n- 字段：事件、记录、通信消息、剧情记录、状态等中文字段。\r\n- 操作：追加、替换、合并或更新。\r\n- 触发原因：写系统记录变化的触发事实。\r\n\r\n如果变化能归入角色卡、势力卡或地图卡，优先使用对应类型。\r\n";
