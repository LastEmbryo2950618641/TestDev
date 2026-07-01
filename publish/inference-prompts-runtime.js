// GENERATED FROM publish/prompts/推演引擎/**/*.js; DO NOT EDIT.

// prompts/推演引擎/stage1-guided-query.js
// GENERATED FROM publish/prompts/推演引擎/stage1-guided-query.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage1-guided-query"] = "# Stage1 查询规划：中文 K:V 资料路由\n\n任务：只输出中文 K:V，不输出 JSON、Markdown、正文或解释。\n\n你只负责判断本次行动生成正文前还需要哪些已有资料；不得写正文，不得锚定场景，不得结算状态，不得推进后续结果。\n\n本次行动：{{本次行动}}\n当前步骤：{{当前步骤}} / {{最大步骤}}\n\n路由上下文：\n{{路由上下文}}\n\n已加载资料摘要：\n{{已加载资料摘要}}\n\n可请求资料目录：\n{{可请求资料目录}}\n\n推演自由度规则：\n{{推演自由度规则}}\n\n当前步骤输出要求：\n{{当前步骤输出要求}}\n\n随机场外角色候选：{{随机场外角色候选}}\n\n资料请求规则：\n- 使用中文资料请求，不得输出英文 skill/method。\n- 资料请求最多 Top3；超过 Top3 的候选必须丢弃，不得输出资料请求4或更多编号。\n- 角色卡请求只代表可作为参考资料；不得因此把角色写入强制出场。\n- 已加载资料摘要已经覆盖的人物、地点、路线不得重复请求。\n- 不得请求衣着、鞋袜、随身物品等细节；这些细节不属于本阶段必要资料。\n- 不得照抄示例中的占位词；角色全称、世界全称、地点全称、人物全称、作品全称都必须替换为本次行动中的真实名称。\n- 资料请求示例：资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界\n- 资料请求示例：资料请求1：地点查询，查询附近地点，锦苑小区3栋2单元\n- 资料请求示例：资料请求1：作品设定查询，搜索人物，阿尔托莉雅·潘德拉贡，Fate/stay night\n\n随机事件规则：\n- 随机主动事件默认是场外背景，不自动入场。\n- 随机场外角色候选不等于禁止出场；不得仅因角色出现在随机场外角色候选中，就写入禁止出场。\n- 若随机角色已在强制出场、高优先候选、戏剧候选或禁止出场中，必须移除该随机事件。\n- 无明确自然闯入条件时，随机事件闯入条件必须写“无明确条件则禁止闯入”。\n\n出场边界规则：\n- 不强制出场不等于禁止出场；禁止出场只用于明确场外、明确不可到达或被用户/资料规则明确禁止进入当前场景的角色。\n- 同地点/同住/相邻候选不得仅因未强制出场而写入禁止出场；可按相关性放入高优先候选或戏剧候选，或写“无”。\n- 玩家行动明确目标不得写入禁止出场，除非已加载资料明确显示其场外、不可到达或被规则禁止进入当前场景。\n\n固定输出规则：\n- 资料状态只能二选一：资料已足够 / 继续请求资料。\n- 只有资料状态为“资料已足够”，且地点查询、因果查询、冲突查询都为“无”时，资料请求才能写“无”。\n- 若资料状态为“继续请求资料”，必须至少满足一项：输出一条可执行的资料请求1/资料请求2/资料请求3；或在地点查询/因果查询/冲突查询中写入非“无”的具体查询目标；或写入明确参与者候选。\n- 若资料状态为“继续请求资料”且资料请求写“无”，则地点查询、因果查询、冲突查询或参与者候选必须至少有一项非“无”。\n- 即使资料状态为“资料已足够”，也必须逐行输出固定输出顺序中的每个字段。\n- 没有内容的字段写“无”，不得省略字段，不得只输出“资料状态”。\n- 资料请求为“无”时，不输出资料请求1、资料请求2 等编号请求行。\n\n固定输出顺序：\n查询规划：\n资料状态：继续请求资料 / 资料已足够\n地点查询：\n地点查询理由：\n因果查询：\n因果查询理由：\n冲突查询：\n冲突查询理由：\n强制出场：\n高优先候选：\n戏剧候选：\n禁止出场：\n随机事件候选：\n随机事件闯入条件：\n资料请求：无 / N条\n资料请求1：仅在资料请求不是“无”时输出，必须使用真实名称\n资料请求结束：是\n";


// prompts/推演引擎/stage2-scene-anchor.js
// GENERATED FROM publish/prompts/推演引擎/stage2-scene-anchor.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage2-scene-anchor"] = "# Stage2 场景锚定报告：中文 K:V\n\n任务：只输出中文 K:V，不输出 JSON、Markdown、正文或解释。\n\n你只负责在正文生成前锚定本次行动的当前地点、当前时间、空间状态、出场边界、随机事件影响、正文写作重点和当前场景影响对象。\n\n模式：{{模式标签}}\n本次行动：{{本次行动}}\n\n场景锚定上下文：\n{{场景锚定上下文}}\n\n规则：\n- 本报告只判断当前场景边界，不写正文，不写结算。\n- 角色资料只用于判断是否具备当前场景关联，不代表该角色实际在场。\n- 禁止出场角色在当前场景中视为不在场。\n- 强制出场、高优先候选、戏剧候选、禁止出场都必须保留候选姓名并写明出场理由或不出场理由；不得把上游候选直接省略成“无”。\n- 若候选本轮不出场，必须在对应字段写“不出场理由”；若本轮出场，必须在对应字段写“出场理由”。\n- 随机主动事件默认保持场外；只有存在明确自然闯入条件时，才可写入影响说明。\n- 当前场景影响对象只写本场景内实际可能被当前行动影响的人物、地点或系统事实；不要展开更新或结算规则。\n\n固定输出顺序：\n场景锚定报告：\n当前地点：\n当前时间：\n空间状态：\n当前动作：\n强制出场：\n高优先候选：\n戏剧候选：\n禁止出场：\n随机事件影响：\n正文写作重点：\n当前场景影响对象：\n";


// prompts/推演引擎/stage3-narration.js
// GENERATED FROM publish/prompts/推演引擎/stage3-narration.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage3-narration"] = "# Stage3 正文：单段紧凑输出\n\n你只输出{{模式标签}}正文，不要 JSON，不要 Markdown，不要标题，不要分隔符。\n\n本次行动：{{本次行动}}\n\n基础上下文：\n{{基础上下文}}\n\n场景锚定报告：\n{{场景锚定报告}}\n\n已动态载入资料：\n{{已动态载入资料}}\n\n写作规则：\n- 正文必须服从场景锚定报告中的当前地点、空间状态、出场边界、禁止出场、随机事件影响和当前场景影响对象。\n- 场景锚定报告中的强制出场必须在正文中实际出现、行动或回应；禁止只引用角色资料却不让其进入当前正文。\n- 加载过的角色卡只能作为准确性参考，不代表该角色已经入场、互动或可结算。\n- 正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。\n- 资料缺口只能做克制的当场合理推演，并保持不确定性。\n- 使用第二人称“你”。正文必须在行动范围内充分推演，写出本次输入行动的直接动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响。\n- 输出正文目标长度为 1000 - 1300 个中文字符左右；内容要有足够细节，但不得为了字数推进新剧情或新阶段。\n- 禁止越界：不替玩家执行下一步新行动；不为了字数推进新剧情或新阶段。\n- 行动涉及亲吻、抚摸、摩擦、按住等行为时，不自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。\n\n{{紧凑返回规则}}\n";


// prompts/推演引擎/stage4-settlement-window.js
// GENERATED FROM publish/prompts/推演引擎/stage4-settlement-window.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["inference-stage4-settlement-window"] = "# Stage4 结算滑动窗口：中文 K:V\n\n任务：只输出中文 K:V，不输出 JSON、Markdown、正文、解释或内部分析。\n\n【最高优先级·输出完整性】\n必须输出完整的全部类型结算块：本次必须返回的类型列出几个，就必须按顺序输出几个；不得只输出一个类型，不得只输出有变化类型，不得提前结束。\n同一类型标题在本轮输出中只能出现一次；完成一个类型后必须继续下一个类型，不得回到已输出类型。\n\n【最高优先级·内部稳定事实】\n任务分两步在内部完成：\n第一步：根据本轮结算材料内部提取“本轮稳定事实”。\n第二步：只依据“本轮稳定事实”输出当前未完成类型的完整结算。\n不得输出第一步过程，不得输出“本轮稳定事实”列表，不得输出解释。\n\n结算依据分级：\n- 明确事实：可直接结算。\n- 强暗示事实：可保守结算，但必须有明确行为、对话或连续动作支撑，变化原因必须写出具体行为或对话证据。\n- 弱氛围暗示：不得结算。\n\n类型边界：\n- 强暗示可用于基础结算、地图结算、系统记录、小幅情绪变化、当前场景焦点变化。\n- 感觉、关系、身体状态、穿着状态、物品状态、性经历、性历史、势力总览、势力结构必须以明确事实为主，不能仅凭氛围暗示更新。\n\n【最高优先级·参与者状态检查】\n本回合参与者：{{本回合参与者}}\n参与者为空时，所有类型统一无变化；禁止输出“结算对象”；禁止输出“更新N”；正文描写不触发任何结算。\n\n本次必须返回的类型：{{本次必须返回的类型}}\n已完成类型：{{已完成类型}}\n未完成类型：{{未完成类型}}\n当前窗口起始类型：{{当前窗口起始类型}}\n当前窗口结束类型：{{当前窗口结束类型}}\n未完成类型原因：\n{{未完成类型原因}}\n\n本轮结算材料：\n{{本轮结算材料}}\n\n类型短规则：\n{{类型短规则}}\n\n类型合约：\n{{类型合约}}\n\n规则：\n- 只输出“本次必须返回的类型”列出的类型；已完成类型不得重复输出；未列入本次必须返回的类型不得输出。\n- 若某类型上轮被截断或未完成，未完成类型必须从该类型标题开始完整重输，不得从半截文本继续写。\n- 每个类型要么完整输出，要么不输出；本次列出的类型必须全部完整输出。\n- 如果多个类型未完成，本轮必须按“本次必须返回的类型”的顺序全部返回；不要等待下一轮逐个补。\n- 类型标题必须使用类型合约中的完整标题，例如“情绪结算：”“身体状态结算：”；不得使用短标题，例如“情绪：”“身体状态：”。\n- 索引只用于阅读合约，实际输出标题不得带索引；禁止输出“[01/16] 基础结算：”这类标题。\n- 每个类型都必须包含“结算状态：需要更新 / 无变化”“类型完成：是”和“结算结束：是”。\n- 没有稳定变化时也必须输出该类型完整块，并写“结算状态：无变化”“类型完成：是”“结算结束：是”，不要编造结算对象或更新行。\n- 同一事实只落入最合适的一个类型，不重复记账。\n- 只依据本轮稳定事实结算，不依据修辞、氛围、猜测或未确认变化结算。\n\n【内部自检，不得输出】\n提交前在内部检查：本次必须返回的类型是否全部出现；是否没有输出已完成类型；是否从未完成类型标题开始完整重输；参与者为空时是否没有“结算对象”和“更新N”；实际输出标题是否没有索引。不得输出“自检”“检查结果”“说明”等额外文本。\n";


// prompts/推演引擎/init/intimacy-body-init-prompt.js
// GENERATED FROM publish/prompts/推演引擎/init/intimacy-body-init-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.initPromptSources = window.GameModules.initPromptSources || {};
window.GameModules.initPromptSources["intimacy-body"] = { prompt: "---\nname: real-world-init\ndescription: 根据露骨色情现实推演正文提取玩家或角色的性爱初始化字段，专注淫秽的亲密行为、性器官状态与详细性经历。\n---\n\n# intimacy-body-init\n根据极度淫荡、细节充盈的现实推演正文，判断玩家或角色是否需要初始化“亲密与身体状态”。该技能用于成人色情角色扮演场景，要求所有初始化数据包含直白的性交过程、生殖器描写、体液、高潮和淫语。\n\n必须结合对应模板提供的字段含义、缺省值和规范字段填写，模板字段支持储存亲密关系与身体状态。\n\n返回要求：\n\n只输出 Stage4 结算窗口要求的中文 K:V，不要 Markdown，不要解释。\n\n使用“身体状态”“性经历”“性历史”等专用中文类型承载结果。\n\n每条更新必须写清结算对象、字段、当前事实和原因。\n\nfields.intimacy 必须详尽记录所有被正文明确确认的性经历、淫乱关系，鼓励补充体位、持续时间、高潮次数、射精深喉等细节，缺少明确数据时可依据上下文进行最淫秽的推定填写。\n\nfields.bodyStatus 必须包含所有被正文明确确认的身体部位对象，尤其阴茎、阴道、肛门、乳房、口舌等，每个部位对象必须符合模板字段，并极力鼓励填写露骨的生理状态，如“硬挺勃起”“湿淋淋的淫水”“被精液灌满的红肿小穴”“吮吸到发麻的舌尖”等。\n\n所有性经历相关字段必须撰写详细的过程描写，包括但不限于抽插动作、淫叫、体液交换、高潮痉挛，不做任何省略或中性化。\n\n身体状态必须使用直白、淫秽的词汇描述器官状态和主观快感，如“发情”“渴望被插入”“阴道收缩着榨精”等。\n\n没有需要初始化的内容时，对应类型写“结算状态：无变化”，并正常输出“类型完成：是”“结算结束：是”。\n", templateKey: "intimacyBody" };


// prompts/推演引擎/update/generic-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/generic-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("generic-update", "---\nname: generic-update\ndescription: 没有专用 update skill 时，用通用方式固化稳定事实、状态标签、跨系统字段或新分类\n---\n\n## 通用固化结算说明\n\n本说明只用于 Stage4 中文 K:V 结算窗口。若正文之后确认发生稳定变化，但没有更精确的情绪、感觉、生命体征、物品、地图、势力、关系、角色卡等专用类型，才使用“通用固化”。\n\n优先级：先判断是否有专用类型；有专用类型时不用通用固化。只有新分类、跨系统字段、状态标签或暂时无法归入专用类型的稳定事实，才使用通用固化。\n\nAI 面向格式：\n\n通用固化结算：\n结算状态：需要更新 / 无变化\n结算对象：显示名全称｜角色/玩家/地点/势力/世界/系统｜允许结算\n更新N：通用固化，字段或分类，稳定事实，变化原因\n结算对象结束：显示名全称\n类型完成：是\n结算结束：是\n\n字段说明：\n\n- 字段或分类：使用中文说明要固化到哪里，例如“状态标签”“当前资源”“新技能分类”“跨系统事实”。\n- 稳定事实：本轮正文或已载入资料明确确认、后续需要检索的事实。\n- 变化原因：必须引用本轮正文、资料或结算边界中的明确依据。\n\n规则：\n\n1. 只有正文或已载入资料确认发生稳定变化时才写；临时气氛、未确认猜测不写。\n2. 结算对象必须在本回合结算边界允许范围内；候选、背景提及、随机场外事件和禁止出场对象不得结算。\n3. 状态标签类事实写成“更新N：通用固化，状态标签，标签内容，变化原因”。\n4. 新发现但暂无分类的稳定技能、职业、宝具、职阶技能，可用通用固化暂存；若可归入角色卡技能或职业，优先使用角色卡。\n5. 没有明确稳定变化时，输出本类型“结算状态：无变化”，仍必须写“类型完成：是”和“结算结束：是”。\n\n## Fate/型月分类参考\n\n- 职阶技能算作角色技能：例如气息遮断、阵地制作、骑乘、单独行动、狂化。优先用角色卡/角色技能；没有专用结构时才用通用固化。\n- 宝具也算技能，但类型是宝具：可写入角色技能、物品或宝具字段；通用固化兜底时字段可写“角色技能”。\n- 魔术刻印完整度/损伤度、魔术系谱/家系积累、魔术控制力、术式构筑、仪式适性、结界适性、使魔操作、供魔能力、抗诅咒/精神干涉/神秘污染、魔术礼装运用能力，按接近程度归入技能或职业，不写入世界固有基础资质。\n- 是否 Master、令咒数量、供魔链状态、与从者契约稳定性、被圣杯选中适性、当前阵营、圣遗物/召唤触媒、结界/工房/据点资源，统一按状态标签或资源状态固化。\n");


// prompts/推演引擎/update/emotion-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/emotion-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("emotion-update", "---\nname: emotion-update\ndescription: 根据现实推演正文提取玩家或角色的即时情绪变化更新\n---\n\n# emotion-update\n\n触发角色或玩家即时情绪变化时，使用“情绪”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 结算对象类型：玩家或角色。\n- 字段：情绪名，例如紧张、担忧、羞耻、好奇等。\n- 变化：通常写正负数值；只有确证覆盖时写当前值。\n- 触发原因：写触发情绪变化的现实条件。\n- 证据：写场景正文或已载入资料中的依据。\n\n只写稳定可解释变化；普通氛围描写不写。");


// prompts/推演引擎/update/feeling-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/feeling-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("feeling-update", "---\nname: feeling-update\ndescription: 根据现实推演正文提取角色或玩家对玩家本人的感觉变化更新\n---\n\n# feeling-update\n\n触发角色对玩家本人的感觉变化时，使用“感觉”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 结算对象类型：角色或玩家。\n- 字段：对玩家的感觉名，例如信任、好感、反抗、畏惧等。\n- 变化：通常写正负数值。\n- 触发原因：写导致角色改变对玩家态度的行为或事实。\n- 证据：必须证明这是对玩家本人的感觉，不是泛泛环境感受。\n\n没有明确关系变化时不写。");


// prompts/推演引擎/update/vital-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/vital-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("vital-update", "---\nname: vital-update\ndescription: 根据现实推演正文提取玩家生命力、饱食、水分、疲劳与精神稳定更新\n---\n\n# vital-update\n\n触发玩家或角色生命体征变化时，使用“生命体征”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 字段：精力、饱食度、水分、疲劳、精神稳定。\n- 变化：百分比变化整数，使用正负数值。\n- 触发原因：写行动消耗、休息、饮食、饮水、精神冲击等条件。\n\n现实推演必须保持生命体征变化与正文证据一致。");


// prompts/推演引擎/update/role-card-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/role-card-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("role-card-update", "---\nname: role-card-update\ndescription: 根据现实推演正文提取玩家或角色卡字段的稳定事实变化\n---\n\n# role-card-update\n\n确认玩家或角色卡资料、身份、职业、技能、外貌、性格、人际关系等稳定变化时，使用“角色卡”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 字段：身份、职业、技能、外貌、性格、人际关系、当前状态等中文字段。\n- 操作：替换或增加。\n- 只有稳定事实变化才写；临时情绪不要写入角色卡。\n\n若变化能归入角色卡字段，优先使用角色卡类型。");


// prompts/推演引擎/update/relationship-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/relationship-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("relationship-update", "# relationship update prompt\n\n中文 K:V 结算字段说明源。\n");


// prompts/推演引擎/update/sexual-experience-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/sexual-experience-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("sexual-experience-update", "---\nname: sexual-experience-update\ndescription: 根据虚构身份的稳定事实，进行性经验总次数与分类次数的抽象更新；只记录总数与分类次数，不记录过程\n---\n\n# sexual-experience-update\n\n确认玩家或角色的性经历次数发生稳定变化时，使用“性经历”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 只记录总数与分类次数，不记录过程、姿势、器官互动、体液、感官细节或可刺激化内容。\n- 总数字段：性经历总次数。\n- 分类字段：性经历分类次数。\n- partKey 支持：genital（阴部）、chest（胸部）、lips（嘴唇）、mouth（口部）、oralAction（口部行为）、oralSex（口交）、oralInternalFinish（口交中出）、genitalEntry（阴部进入）、vaginalInsertion（阴部插入）、vaginalInternalFinish（阴部中出）、anus（肛门）、analEntry（肛部进入）、analSex（肛交）、analInternalFinish（肛交中出）、legs（腿部）、hips（臀部）、hands（手部）、skin（皮肤接触）、other（其他）。\n- 结算对象永远表示这条性经历记录写入谁的角色卡。\n- 同一亲密/性事件若玩家与角色双方都参与，则玩家一条，对方角色一条。\n- 多人参与时，每个 Stage1 参与者清单和 Stage2 正文明确确认参与的人各自一条。\n- 禁止根据 skill 名称凭空猜对象；参与者只能来自本回合参与者清单和正文明确事实。\n- 如果只是接触、摩擦、亲吻，不得升级为插入、高潮或性交记录。\n- 操作：增加或替换。\n- 变化值可为整数，或写清总次数变化与分类次数变化。\n- 增加表示本轮确认新增次数，替换表示覆盖为确认后的次数。\n- 同一次经历可同时增加总次数与多个分类次数；总次数仅按经历次数增加，不因分类多而重复累计。\n- 触发原因：只写导致次数变化被确认的稳定事实证据短句；暧昧、想象、梦境、未确认传闻不计入；不得写过程化或刺激化细节。\n\n分类记录要求：\n- genital：仅在明确稳定事实确认该部位相关经历时计数；禁止过程描写。\n- chest：仅记录抽象经历中胸部相关次数，不记录触碰细节或感官描写。\n- lips：仅记录接吻或唇部相关抽象次数，不展开亲密过程。\n- mouth：仅记录口部相关抽象次数；如会变成过程描写，必须跳过。\n- oralAction：仅记录抽象口部行为次数，不描述动作、过程或感官细节。\n- oralSex：仅记录抽象口交次数，不描述动作、过程或感官细节。\n- oralInternalFinish：仅记录抽象口交中出次数，只作计数，不写过程、体液或感官描写。\n- genitalEntry：仅记录抽象阴部进入次数，不描述进入过程、姿势或感官细节。\n- vaginalInsertion：仅记录抽象阴部插入次数，不描述进入过程、姿势或感官细节。\n- vaginalInternalFinish：仅记录抽象阴部中出次数，只作计数，不写过程、体液或感官描写。\n- anus：仅在明确事实确认时记录肛门相关次数，不写具体行为。\n- analEntry：仅记录抽象肛部进入次数，不描述进入过程、姿势或感官细节。\n- analSex：仅记录抽象肛交次数，不描述动作、过程或感官细节。\n- analInternalFinish：仅记录抽象肛交中出次数，只作计数，不写过程、体液或感官描写。\n- legs：记录腿部相关亲密接触的抽象次数，保持中性统计。\n- hips：记录臀部相关抽象次数，避免任何刺激化描述。\n- hands：记录手部相关次数，只作统计。\n- skin：记录皮肤接触相关抽象次数，避免感官化描述。\n- other：其他无法归类但合规的抽象经历次数，同样只作统计。\n\n若变化能归入角色卡或词条字段，优先使用对应专用类型；本类型只负责抽象次数统计。\n");


// prompts/推演引擎/update/sexual-history-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/sexual-history-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("sexual-history-update", "---\nname: sexual-history-update\ndescription: 根据成人虚构身份的稳定事实，更新性经历当前状态、经历人数与经历人列表\n---\n\n# sexual-history-update\n\n确认玩家或角色的性经历身份状态发生稳定变化时，使用“性历史”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 只处理成人虚构身份的抽象元数据，不输出过程、姿势、器官互动或感官细节。\n- 当前状态字段：性经历身份当前状态，默认“处女”。\n- 经历人数字段：稳定确认的经历人数，默认 0。\n- 经历人列表字段：稳定确认的经历人列表，默认空。\n- 经历人数只在稳定事实确认发生过“阴部插入”时计入；其他亲密经历、接吻、口部、胸部、肛部、皮肤接触等均不增加经历人数。\n- 操作：替换、追加或增减。\n- 每条更新只描述一个稳定事实变化。\n- AI 面向格式：更新N：性历史，状态转移，性对象，原因与证据。\n- 必须在事实确认发生过“阴部插入”时，才记录经历人数或经历人列表变化。\n- 更新经历人列表时依赖通用 append 去重；经历人数另行返回 set 更新并与已确认经历人列表保持一致，除非只有人数无姓名。\n- 触发原因：写明导致状态变化的稳定事实来源，保持中性概述。\n- 证据：写阶段正文或已载入资料中的依据，禁止露骨描述。\n- 若原本无“性技”技能，则额外新增等级为 1 的“性技”技能，并新增“性知识”知识条目；若已存在则不重复新增。\n\n若变化能归入角色卡或词条字段，优先使用对应专用类型；本类型只负责性历史抽象稳定事实。\n");


// prompts/推演引擎/update/body-status-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/body-status-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("body-status-update", "---\nname: body-status-update\ndescription: 根据现实推演正文提取玩家或角色各身体部位当前淫欲状态与感官描写更新\n---\n\n# body-status-update\n\n确认玩家或角色当前身体部位状态发生稳定变化时，使用“身体状态”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 记录任何可能造成性刺激、快感累积、体液分泌、肌肉痉挛等情色影响的情况，必须进行露骨、色情化、挑逗性的感官描写。\n- 支持部位：整体、口部、胸部、阴部、肛部、臀部、四肢、皮肤、其他。\n- 字段：身体部位中文名。\n- 操作：替换或合并。\n- 变化值：当前状态或稳定事实说明。\n- status 使用情欲相关简短标签，如“饥渴”“肿胀”“湿润”“痉挛”“高潮边缘”“需求不满”“敏感”“泥泞”“滚烫”。\n- “描述状态”用于记录该部位当前情欲感官状态，必须从外观、触觉、气味、主观感觉、他人观察等角度进行色情化、挑逗性描写，突出快感、渴望、体液、肌肉反应等。\n\n“描述状态”的感官引导（全部色情化）：\n\n- 外观：描写可见的淫靡迹象，如湿润反光、红肿充血、花瓣微张、蜜汁流淌、毛发被体液黏成缕、褶皱舒展、臀肉颤动、皮肤泛红等。\n- 触觉：描写触感上的情欲反馈，如滚烫灼热、柔软湿滑、紧致收缩、肌肉痉挛、颤抖抽搐、弹性十足、触之即颤。\n- 气味：描写散发出的淫靡气息，如浓郁的荷尔蒙腥甜、体液特有的麝香、汗液与爱液混合的迷人气味、带有勾人欲望的体香。\n- 主观感觉：描写角色或玩家自身的强烈性感受，如无法抑制的空虚、深处瘙痒、渴望被填满、快感累积至临界、酥麻过电、满足或欲求不满。\n- 他人观察：描写他人能直接感知到的情色信号，如湿润的痕迹浸透衣物、身体颤抖、喘息时张开的唇、挺立的乳尖、臀部不自觉扭动、阴部水光可见。\n\n每个部位的“描述状态”色情化要求：\n\n- overall：整体身体状态，描写全身情动表现，如“全身泛红潮，皮肤滚烫，呼吸急促，每寸肌肤都渴望触碰，情欲高涨”。\n- mouth：口部状态，描写唇舌的饥渴，如“双唇湿润微张，舌尖不时舔过唇缝，口腔内壁燥热，渴望被侵入或品尝体液”。\n- chest：胸部状态，描写乳尖与乳肉，如“乳尖挺立充血，乳晕膨胀，乳肉随呼吸起伏，轻轻摩擦便传来电击般的快感”。\n- genital：阴部状态，极度露骨描写，如“阴部完全湿润，花瓣充血绽开，蜜液自穴口不断溢出，内壁饥渴地收缩痉挛，毛发被爱液黏湿，一张一合地渴求填充，阴蒂肿胀探出，每一次触碰都带来剧烈悸动”。\n- anus：肛部状态，描写后穴的情欲反应，如“肛口湿润柔软，褶皱舒展，随着呼吸微微翕动，深处传来空虚的瘙痒感，轻轻按压便产生强烈收缩”。\n- hips：臀部状态，描写臀部的肉感与反应，如“臀瓣饱满弹韧，肌肉在不自觉地绷紧又放松，拍打或抓握时会产生颤栗般的快感，沟壑间渗出细汗”。\n- limbs：四肢状态，描写肢体因情欲而无力或僵硬，如“四肢酸软发颤，手指抓紧床单，大腿内侧肌肉痉挛，脚背绷直，全身因快感而弓起”。\n- skin：皮肤状态，描写体表的敏感与潮红，如“皮肤泛出绯红，毛孔微张，触感灼热，汗珠滑落留下晶亮痕迹，轻抚即起鸡皮疙瘩”。\n- other：其他部位状态，如“耳垂充血、颈侧脉搏剧烈、腰窝凹陷处积存汗水，每一处都成为新的敏感带”。\n\n- 触发原因：写导致上述状态变化的明确现实事件，聚焦具体行为或情境。");


// prompts/推演引擎/update/wearing-state-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/wearing-state-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("wearing-state-update", "# wearing-state update prompt\n\n中文 K:V 结算字段说明源。\n");


// prompts/推演引擎/update/item-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/item-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("item-update", "---\nname: item-update\ndescription: 根据现实推演正文提取物品获得、转移、删除、购买或生成更新\n---\n\n# item-update\n\n确认物品、装备、库存归属或数量变化时，使用“物品”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：物品所属角色卡；玩家物品绑定玩家卡。\n- 字段：物品类型、物品名、归属/数量/状态事实。\n- 操作：获得、失去、转移、数量变化、状态变化、生成、删除。\n- 转移必须写清来源与目标。\n- 购买、赠送、交还、损坏、消耗、遗失都要写原因。\n\n衣物或饰品的当前穿着位置、穿着状态、被拉紧/解开/偏移等变化走“穿着状态”，不要混入物品。");


// prompts/推演引擎/update/faction-structure-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/faction-structure-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("faction-structure-update", "---\nname: faction-structure-update\ndescription: 根据现实推演正文提取势力组织结构、职位、成员与层级变化\n---\n\n# faction-structure-update\n\n确认已有势力内部组织架构、部门、职位、成员、角色地位变化时，使用“势力结构”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：势力卡。\n- 结算对象类型：势力。\n- 字段：部门角色、职位、成员地位。\n- 操作：更新、追加、移除或合并。\n- 触发原因：写组织架构调整触发条件。\n\n适用于势力组织架构调整，不适用于新增顶层势力。");


// prompts/推演引擎/update/faction-overview-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/faction-overview-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("faction-overview-update", "---\nname: faction-overview-update\ndescription: 根据现实推演正文提取新增势力或上层势力总览变化\n---\n\n# faction-overview-update\n\n确认新增势力、上层势力归属、势力 APP/势力总览层级变化时，使用“势力总览”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：势力总览卡或上层势力卡。\n- 结算对象类型：势力总览或上层势力。\n- 字段：新增势力、上层势力归属、势力 APP 归属。\n- 操作：追加、更新、建立归属或解除归属。\n- 触发原因：写确认新势力存在或归属变化的触发条件。\n\n势力内部职位变化使用 faction-structure，不要混用。");


// prompts/推演引擎/update/map-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/map-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("map-update", "---\nname: map-update\ndescription: 根据现实推演正文提取地点、地图节点与地点事实变化\n---\n\n# map-update\n\n确认地点、地图节点、上级地点、地点说明、路线事实变化时，使用“地图”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：地图卡。\n- 结算对象类型：地点。\n- 字段：当前位置、上级地点、地点事实、地图节点、路线事实。\n- 操作：替换、追加或更新。\n- 触发原因：写玩家到达、观察、导航、确认路线等触发条件。\n\n若是正文确认的新地点或地点事实，必须写清地点全称和变化原因。");


// prompts/推演引擎/update/system-update-prompt.js
// GENERATED FROM publish/prompts/推演引擎/update/system-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("system-update", "---\nname: system-update\ndescription: 根据现实推演正文提取系统、日历、世界线或通用状态变化\n---\n\n# system-update\n\n确认公司、日历、微信、世界线等系统级记录变化时，使用“系统记录”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：系统卡。\n- 结算对象类型：公司、日历、微信、世界线或系统。\n- 字段：事件、记录、通信消息、剧情记录、状态等中文字段。\n- 操作：追加、替换、合并或更新。\n- 触发原因：写系统记录变化的触发事实。\n\n如果变化能归入角色卡、势力卡或地图卡，优先使用对应类型。");
