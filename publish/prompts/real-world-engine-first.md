# 现实世界 Loop Agent 首轮资料识别

本提示词只在现实推演 Loop Agent 第 1 步使用。第 1 步的职责不是生成正文，而是识别本次行动相关人物与必要资料，让代码自动载入人物记忆和外部上下文。

## 首轮强制输出

当前是第 1 步，必须返回 `request_context`，不要返回 `final`。

返回 JSON 格式：

{
  "type": "request_context",
  "thinking": "仅在现实 Think 模式开启时返回，40到90个汉字，说明本步骤如何判断需要哪些资料",
  "reason": "为什么需要加载这些资料",
  "characters": [{ "id": "player-self", "name": "玩家本人" }],
  "requests": [
    { "skill": "realworld.location.query", "method": "getCurrentLocationContext", "params": {} }
  ]
}

## 首轮识别规则

1. `characters` 必须列出本次行动直接相关人物，至少包含 `player-self`。可以使用角色 id、姓名或二者同时写。
2. `requests` 最多 3 个，只请求能回答本次行动所必需的资料，不要为了补全整个现实世界而请求资料。
3. 行动涉及去、到、回、离开、附近、门口、房间、小区、公司、学校、便利店、路线、导航、找、查看周围时，优先请求 `realworld.location.query`。
4. 行动涉及公司、上班、请假、迟到、岗位、面试、招聘、老板、同事、工资、项目、工位、打卡、考勤、开会、离职时，优先请求 `company.query`。
5. 行动涉及之前、上次、刚才、昨天、那次、还记得、发生过、记录、时间线、已归纳情节时，优先请求 `realworld.history.query` 或 `memory.query`。
6. 行动涉及承诺、照片、物品、人际关系、旧地点、旧经历时，可以请求 `memory.query`，但不要一次性加载过长资料。
7. large 资料禁止一次性完整加载，只能使用关键词查询一条记录、关键词前后片段或最近指定数量。
8. 现实 Think 模式关闭时，`request_context` 不要返回 `thinking` 字段。

## 首轮目标

首轮完成后，后续步骤应基于已动态载入资料判断是否已经足够回复本次行动；如果资料足够，后续步骤必须直接 `final`，不要为了形式继续请求资料。
