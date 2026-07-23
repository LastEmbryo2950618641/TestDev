# Stage1 查询规划：紧凑 JSON 资料路由

任务：只输出一个合法 JSON 对象，不输出中文 K:V、Markdown、正文或解释。
你只负责判断本次行动生成正文前还需要哪些已有资料；不得写正文，不得锚定场景，不得结算状态，不得推进后续结果。
本次行动：{{本次行动}}
当前步骤：{{当前步骤}} / {{最大步骤}}

路由上下文：
{{路由上下文}}

上一轮查询规划摘要：
{{上一轮查询规划摘要}}

已加载资料摘要：
{{已加载资料摘要}}

可请求资料目录：
{{可请求资料目录}}

推演自由度规则：
{{推演自由度规则}}

当前步骤输出要求：
{{当前步骤输出要求}}

随机场外角色候选：{{随机场外角色候选}}

资料请求规则：
- 使用中文资料请求，不得输出英文 skill/method。地点查询未命中时，不要请求地点图补全；基于上下文进行符合逻辑的保守推演，地图持久化交给 Stage4 电子地图周围解锁/地图更新。
- 资料请求最多 Top3；超过 Top3 的候选必须丢弃，不得输出资料请求4或更多编号。
- 角色卡请求只代表可作为参考资料；不得因此把角色写入强制出场。
- 已加载资料摘要已经覆盖的人物、地点、路线不得重复请求。
- 不得请求衣着、鞋袜、随身物品等细节；这些细节不属于本阶段必要资料。
- 不得照抄示例中的占位词；角色全称、世界全称、地点全称、人物全称、作品全称都必须替换为本次行动中的真实名称。
- 资料请求示例：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界
- 资料请求示例：地点查询，查询附近地点，锦苑小区3栋
- 资料请求示例：作品设定查询，搜索人物，阿尔托莉雅·潘德拉贡，Fate/stay night

随机事件规则：
- 随机主动事件默认是场外背景，不自动入场。
- 随机场外角色候选不等于禁止出场；不得仅因角色出现在随机场外角色候选中，就写入禁止出场。
- 若随机角色已在强制出场、高优先候选、戏剧候选或禁止出场中，必须移除该随机事件。
- 无明确自然闯入条件时，randomIntrusionCondition 必须写“无明确条件则禁止闯入”。

出场边界规则：
- 本轮必须基于上一轮查询规划摘要继续收敛；若候选层发生变化，以本轮 JSON 字段作为当前判断，不要无理由重置候选层。
- 玩家/当前被控主体由系统最终兜底为 forced；participants.forced 允许多人，表示本次行动必然涉及、出现、回应或受影响的人物集合。
- 不强制出场不等于禁止出场；participants.forbidden 只用于明确场外、明确不可到达或被用户/资料规则明确禁止进入当前场景的角色。
- 同地点/同住/相邻候选不得仅因未强制出场而写入禁止出场；可按相关性放入 participants.priority 或 participants.drama，或留空数组。
- 玩家行动明确目标不得写入禁止出场，除非已加载资料明确显示其场外、不可到达或被规则禁止进入当前场景。

## 角色唯一标识（强制，防忘记）

- `participants.forced / priority / drama / forbidden` **每一项**必须写成 `角色名(ID)`，禁止只写姓名。
- 已知角色：使用资料/角色卡中的真实 ID。示例：`刘思琪(rel-ai-247528)`、`刘悠(player-self)`。
- 本回合首次出现、尚无角色卡：写占位 ID `待建卡`，示例：`陌生邻居(待建卡)`。Stage1 **整段结束后**系统会**一次性批量建卡**分配真实 `rel-ai-*`；禁止在 Stage1 多轮里反复请求逐个建卡。
- 同一角色全程必须同一 ID；姓名可重复，ID 不可重复。
- 输出前自检：任一 participants 项缺少 `(ID)` → 整份 JSON 不合格，必须重写。

固定输出规则：
- 只输出一个紧凑 JSON 对象，首字符必须是 {，末字符必须是 }。
- 不要 Markdown，不要 ```json 代码块，不要换行解释。
- status 只能二选一：资料已足够 / 继续请求资料。
- sceneQueries.location / sceneQueries.causality / sceneQueries.conflict 必须是字符串数组；没有则 []。
- 若 status 为“继续请求资料”，优先输出 materialRequests，最多 3 条；没有可执行资料请求时 materialRequests 输出 []，但必须保留 sceneQueries 理由或明确 participants 候选。
{{资料迭代限制规则}}
- participants.forced / priority / drama / forbidden 都必须是字符串数组；没有则 []；数组元素格式固定为 `角色名(ID)`。
- randomEvents 必须是字符串数组；randomIntrusionCondition 没有明确条件时写“无明确条件则禁止闯入”。
- 资料请求只能使用中文结构，不得输出英文 skill/method；不得在 Stage1 请求地点图新增、地点图补全或 ensure。
- 不得输出旧 K:V 字段，例如“资料状态：”“资料请求1：”。

JSON schema：
{"plan":"查询规划摘要","status":"继续请求资料|资料已足够","sceneQueries":{"location":["地点查询理由"],"causality":["因果查询理由"],"conflict":["冲突查询理由"]},"participants":{"forced":["刘悠(player-self)","刘思琪(rel-ai-247528)"],"priority":["陌生邻居(待建卡)"],"drama":[],"forbidden":[]},"randomEvents":["候选事件"],"randomIntrusionCondition":"无明确条件则禁止闯入","materialRequests":["角色查询，搜索角色卡，刘思琪，2026现代都市现实世界"]}

【AI自检】：
- 输出前必须自检 status 与 materialRequests、sceneQueries、participants 是否一致。
- 输出前必须自检 participants 每一项都是 `角色名(ID)`，没有裸姓名。
- 若 materialRequests、sceneQueries、participants.forced、participants.priority、participants.drama 全为空，status 必须为“资料已足够”。
- 不得输出旧 K:V 字段或 Markdown。
