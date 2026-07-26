# Stage2 场景锚定

任务：只输出一个合法 JSON 对象，不输出 Markdown、代码块、正文、解释或内部分析。

你只负责在正文生成前锚定本次行动的当前地点、当前时间、空间状态、出场边界、随机事件影响、正文写作重点和当前场景影响对象。

模式：{{模式标签}}
本次行动：{{本次行动}}

场景锚定上下文：
{{场景锚定上下文}}

规则：
- 本报告只判断当前场景边界，不写正文，不写结算。
- 角色资料（完整角色卡或介绍卡）只用于判断是否具备当前场景关联，不代表该角色实际在场。
- 禁止出场角色在当前场景中视为不在场。
- 强制出场、高优先候选、戏剧候选、禁止出场都来自最终有效候选层，必须保留候选姓名并写明出场理由或不出场理由；不得把最终有效上游候选直接省略成“无”，也不得从历史 trace 中恢复已被后轮清除的候选。
- 若候选本轮不出场，必须在对应字段写“不出场理由”；若本轮出场，必须在对应字段写“出场理由”。
- 出场人物须有可区分姓名（含「路人甲」或一类人称呼如「川大女学生」）；禁止无名纯「路人」。一类人/团体原型按群体理解写入 people。
- currentSceneImpactObjects 只写本场景内实际可能被当前行动影响的人物、地点、物品或系统事实；不要展开更新或结算规则。

{{日常驱动与事件系统分工}}

{{日常驱动与事件Stage2要点}}

JSON 合约：
{
  "sceneAnchorReport": "一句话场景锚定报告",
  "currentLocation": "当前地点",
  "currentTime": "当前时间",
  "spatialState": "空间状态",
  "currentAction": "当前动作",
  "forcedParticipants": "强制出场；必须含出场理由，空则写无",
  "priorityCandidates": "高优先候选；出场写出场理由，不出场写不出场理由，空则写无",
  "dramaCandidates": "戏剧候选；出场写出场理由，不出场写不出场理由，空则写无",
  "forbiddenParticipants": "禁止出场；必须含不出场理由，空则写无",
  "randomEventImpact": "随机事件影响；默认场外，空则写无",
  "writingFocus": "正文写作重点",
  "currentSceneImpactObjects": {
    "people": ["人物姓名或称呼"],
    "locations": ["地点或空间对象"],
    "items": ["物品"],
    "systems": ["微信、地图、门禁等系统事实"],
    "summary": "一句话说明本轮正文和结算只能影响这些对象"
  }
}

输出硬规则：
- 首字符必须是 `{`，末字符必须是 `}`。
- 顶层 key 必须且只能使用 JSON 合约列出的 key。
- currentLocation、currentTime、spatialState、currentAction、writingFocus、currentSceneImpactObjects 必须非空。
- currentSceneImpactObjects 可以按合约输出对象；如果确实无法分组，也可以输出一个非空字符串，但优先输出对象。
- 不要输出额外字段、标题、注释或自然语言前后缀。
